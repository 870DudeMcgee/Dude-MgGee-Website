#!/usr/bin/env python3
"""Audit every public HTML page; optionally verify the deployed site with --live."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import urlopen, Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://www.dudemcgee.com'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.tags = []
        self.text = []
        self.json = []
        self.skip = 0
        self.ld = False
        self.in_title = False
        self.title = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        if tag == 'title': self.in_title = True
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag in ('script', 'style'): self.skip += 1
        if tag == 'script': self.ld = attrs.get('type') == 'application/ld+json'
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
        if tag in ('script', 'style'): self.skip = max(0, self.skip - 1)
        if tag == 'script': self.ld = False
    def handle_data(self, data):
        if self.in_title: self.title.append(data)
        if self.ld: self.json.append(data)
        if not self.skip: self.text.append(data)
    def attrs(self, tag, key=None, value=None):
        return [a for t, a in self.tags if t == tag and (key is None or a.get(key) == value)]

def public_path(file):
    path = '/' + file.relative_to(ROOT).as_posix()
    return path[:-10] if path.endswith('index.html') else path

def run(live=False):
    errors = []
    def check(condition, message):
        if not condition: errors.append(message)
    files = sorted([*ROOT.glob('*.html'), *ROOT.glob('press/*.html')])
    pages = {public_path(f): Page(f.read_text()) for f in files}
    # The production sitemap is served from Shopify-backed catalog data. Local
    # static files retain the five editorial URLs; route behavior is covered by
    # scripts/test-product-route.js because catalog credentials are not local.
    sitemap_source = urlopen(ORIGIN + '/sitemap.xml', timeout=30).read() if live else (ROOT / 'sitemap.xml').read_text()
    sitemap = ET.fromstring(sitemap_source)
    urls = [e.text for e in sitemap.findall('.//{*}loc')]
    check(len(urls) == len(set(urls)), 'duplicate sitemap URL')
    static_urls = {ORIGIN + p for p in pages}
    if not live:
        check(set(urls) == static_urls, 'local sitemap must exactly inventory public static pages')
    else:
        check(static_urls.issubset(set(urls)), 'sitemap must retain every public static page')
    if live:
        product_urls = [url for url in urls if '/products/' in url]
        check(bool(product_urls), 'live sitemap has no product URLs')
        catalog_payload = json.loads(urlopen(ORIGIN + '/api/catalog', timeout=30).read())
        catalog_urls = {ORIGIN + '/products/' + product['handle'] for product in catalog_payload.get('products', []) if product.get('handle')}
        check(set(product_urls) == catalog_urls, 'live product sitemap must exactly match the live catalog')
        for url in product_urls:
            with urlopen(Request(url, headers={'User-Agent': 'SEO-readiness-check/1.0'}), timeout=30) as response:
                source = response.read().decode()
                check(response.status == 200, url + ': product URL must return 200')
                check('application/ld+json' in source and ('ProductGroup' in source or '"@type":"Product"' in source), url + ': product structured data missing')
    robots = urlopen(ORIGIN + '/robots.txt', timeout=30).read().decode() if live else (ROOT / 'robots.txt').read_text()
    check('Sitemap: ' + ORIGIN + '/sitemap.xml' in robots, 'robots sitemap missing')
    check(not any(line.strip().lower().startswith('disallow: /') for line in robots.splitlines()), 'public crawl blocked')
    titles, descriptions, links = set(), set(), {}
    for path, page in pages.items():
        if live:
            with urlopen(Request(ORIGIN + path, headers={'User-Agent': 'SEO-readiness-check/1.0'}), timeout=30) as response:
                check(response.status == 200 and response.url == ORIGIN + path, path + ': canonical URL must return direct 200')
                check('noindex' not in response.headers.get('X-Robots-Tag', '').lower(), path + ': noindex header')
                page = Page(response.read().decode())
        canonical = page.attrs('link', 'rel', 'canonical')
        check(len(canonical) == 1 and canonical[0].get('href') == ORIGIN + path, path + ': canonical mismatch')
        check(len(page.attrs('h1')) == 1, path + ': expected one h1')
        desc = page.attrs('meta', 'name', 'description')
        check(len(desc) == 1 and bool(desc[0].get('content')), path + ': description missing')
        if desc:
            check(desc[0]['content'] not in descriptions, path + ': duplicate description')
            descriptions.add(desc[0]['content'])
        title = ''.join(page.title).strip()
        check(len(page.attrs('title')) == 1 and bool(title) and title not in titles, path + ': missing/duplicate title')
        titles.add(title)
        check(len(' '.join(page.text).split()) > 80, path + ': insufficient static page content')
        for tag in page.attrs('meta'):
            if tag.get('name', '').lower() in ('robots', 'googlebot'):
                check('noindex' not in tag.get('content', '').lower(), path + ': noindex metadata')
        check(page.attrs('meta', 'property', 'og:url') == [{'property': 'og:url', 'content': ORIGIN + path}], path + ': og:url mismatch')
        for block in page.json: json.loads(block)
        links[path] = set()
        for tag, attrs in page.tags:
            for attr in (('href',) if tag in ('a', 'link') else ('src',) if tag in ('img', 'script', 'source') else ()):
                if not attrs.get(attr): continue
                target = urlsplit(urljoin(ORIGIN + path, attrs[attr]))
                if target.netloc != urlsplit(ORIGIN).netloc or target.scheme not in ('https', 'http'): continue
                target_file = ROOT / unquote(target.path).lstrip('/')
                if target_file.is_dir(): target_file /= 'index.html'
                check(target_file.is_file(), f'{path}: missing local {attrs[attr]}')
                if tag == 'a' and target.path in pages:
                    links[path].add(target.path)
                    if target.fragment:
                        check(any(a.get('id') == unquote(target.fragment) for _, a in pages[target.path].tags), f'{path}: missing anchor {attrs[attr]}')
                check(not target.path.endswith('/index.html'), f'{path}: noncanonical internal link {attrs[attr]}')
        print(f'{path}: metadata, static content, assets and links checked')
    seen, todo = set(), ['/']
    while todo:
        path = todo.pop()
        if path in seen: continue
        seen.add(path)
        todo.extend(links[path] - seen)
    check(seen == set(pages), 'page unreachable from homepage via crawlable links')
    redirects = json.loads((ROOT / 'vercel.json').read_text()).get('redirects', [])
    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl): return None
    for alias, preferred in [('/index.html', '/'), ('/press/index.html', '/press/'), ('/press', '/press/')]:
        check({'source': alias, 'destination': preferred, 'permanent': True} in redirects, alias + ': permanent redirect absent')
        if live:
            try:
                with build_opener(NoRedirect()).open(ORIGIN + alias, timeout=30):
                    check(False, alias + ': live redirect missing')
            except HTTPError as response:
                check(response.code in (301, 308) and urljoin(ORIGIN, response.headers.get('Location', '')) == ORIGIN + preferred, alias + ': expected permanent redirect to canonical URL')
    if live:
        try:
            with urlopen(ORIGIN + '/nonexistent-seo-check-20260906', timeout=30):
                check(False, 'unknown URL must return 404')
        except HTTPError as response:
            check(response.code == 404, 'unknown URL must return 404')
    if errors: raise SystemExit('SEO check failed:\n- ' + '\n- '.join(errors))
    print(f'SEO check passed: {len(pages)} public static pages, {len(urls)} sitemap URLs; static pages are reachable from homepage.' + (' Production verified.' if live else ''))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    run(parser.parse_args().live)
