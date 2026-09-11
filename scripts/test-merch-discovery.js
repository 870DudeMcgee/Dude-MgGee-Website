#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { createMerchHandler, renderMerchPage } = require('../lib/dude-merch-route');
const sitemap = require('../api/sitemap');

const template = '<main><div class="product-grid" id="product-grid" aria-live="polite" aria-busy="true"><p>Loading</p></div>\n<div class="merch-unavailable" hidden>Unavailable</div></main>';
const product = {
  handle: 'signal-tee', title: 'Signal & Tee', vendor: 'Dude McGee',
  description: 'A <strong>shirt</strong> & more.',
  images: [{ url: 'https://cdn.example/tee?a=1&b=2', alt: 'Product mockup' }, { url: 'https://cdn.example/back.jpg', alt: 'Back print' }],
  variants: [{ image: 'https://cdn.example/variant-only.jpg' }, { image: 'https://cdn.example/back.jpg' }],
};

const page = renderMerchPage(template, [product]);
assert.match(page, /data-server-rendered="true"/);
assert.match(page, /href="\/products\/signal-tee"/);
assert.match(page, /src="https:\/\/cdn\.example\/tee\?a=1&amp;b=2"/);
assert.match(page, /alt="Signal &amp; Tee product image"/);
assert.match(page, /Signal &amp; Tee/);
assert.match(page, /A shirt &amp; more\./);
assert.doesNotMatch(page, /<strong>/);

function response() {
  return { headers: {}, statusCode: null, body: '', setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, send(body) { this.body = body; return this; } };
}

(async () => {
  const merch = createMerchHandler(async () => ({ products: [product] }), () => template);
  const found = response(); await merch({ method: 'GET' }, found);
  assert.equal(found.statusCode, 200); assert.match(found.body, /<img src=/);
  const unavailable = response(); const originalError = console.error; console.error = () => {};
  await createMerchHandler(async () => { throw new Error('offline'); }, () => template)({ method: 'GET' }, unavailable); console.error = originalError;
  assert.equal(unavailable.statusCode, 503);

  const xml = sitemap.renderSitemap({ products: [product] });
  assert.match(xml, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(xml, /<image:loc>https:\/\/cdn\.example\/tee\?a=1&amp;b=2<\/image:loc>/);
  assert.match(xml, /<image:loc>https:\/\/cdn\.example\/variant-only\.jpg<\/image:loc>/);
  assert.equal((xml.match(/https:\/\/cdn\.example\/back\.jpg/g) || []).length, 1, 'sitemap images are deduplicated across product and variant sources');
  assert.doesNotMatch(xml, /<image:(?:title|caption)>/);
  const unavailableSitemap = response();
  await sitemap.createSitemapHandler(async () => { throw new Error('offline'); })({ method: 'GET' }, unavailableSitemap);
  assert.equal(unavailableSitemap.statusCode, 503);
  assert.equal(unavailableSitemap.headers['Cache-Control'], 'no-store');
  console.log('Merch SSR catalog and image sitemap checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
