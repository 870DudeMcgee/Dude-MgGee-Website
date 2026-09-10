'use strict';

const { getCatalog } = require('../lib/shopify-catalog');
const ORIGIN = 'https://www.dudemcgee.com';
const STATIC_PATHS = ['/', '/label.html', '/merch.html', '/returns.html', '/press/'];

function escapeXml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

function xmlText(value) { return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
function imageEntries(product) {
  const seen = new Set();
  return (product.images || []).filter(image => {
    const url = String(image && image.url || '');
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return false;
    seen.add(url); return true;
  }).map(image => `<image:image><image:loc>${escapeXml(xmlText(image.url))}</image:loc></image:image>`).join('');
}

function renderSitemap(catalog) {
  const productUrls = (catalog.products || []).filter(product => product && product.handle).map(product => {
    const location = `${ORIGIN}/products/${encodeURIComponent(product.handle)}`;
    return `\n  <url><loc>${escapeXml(location)}</loc>${imageEntries(product)}</url>`;
  });
  const staticUrls = STATIC_PATHS.map(route => `\n  <url><loc>${escapeXml(ORIGIN + route)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${staticUrls.join('')}${productUrls.join('')}\n</urlset>\n`;
}

function createSitemapHandler(loadCatalog) {
  return async function sitemap(request, response) {
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).send('Method not allowed'); }
    try {
      const catalog = await loadCatalog(request);
      const body = renderSitemap(catalog);
      response.setHeader('Content-Type', 'application/xml; charset=utf-8'); response.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300'); return response.status(200).send(body);
    } catch (error) { response.setHeader('Cache-Control', 'no-store'); return response.status(503).send('Catalog unavailable'); }
  };
}

const sitemap = createSitemapHandler(getCatalog);
module.exports = sitemap;
module.exports.createSitemapHandler = createSitemapHandler;
module.exports.renderSitemap = renderSitemap;
