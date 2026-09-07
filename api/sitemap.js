'use strict';

const { getCatalog } = require('../lib/shopify-catalog');
const ORIGIN = 'https://www.dudemcgee.com';
const STATIC_PATHS = ['/', '/label.html', '/merch.html', '/returns.html', '/press/'];

function escapeXml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

module.exports = async function sitemap(request, response) {
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).send('Method not allowed'); }
  try {
    const catalog = await getCatalog(request);
    const paths = [...STATIC_PATHS, ...(catalog.products || []).filter(product => product && product.handle).map(product => `/products/${encodeURIComponent(product.handle)}`)];
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `\n  <url><loc>${escapeXml(ORIGIN + path)}</loc></url>`).join('')}\n</urlset>\n`;
    response.setHeader('Content-Type', 'application/xml; charset=utf-8'); response.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300'); return response.status(200).send(body);
  } catch (error) { response.setHeader('Cache-Control', 'no-store'); return response.status(503).send('Catalog unavailable'); }
};
