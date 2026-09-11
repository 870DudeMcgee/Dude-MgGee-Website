'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { renderCurrentDrop } = require('./current-drop');

const TEMPLATE_PATH = path.join(process.cwd(), 'lib', 'merch-template.html');
const DEVELOPMENT_TEMPLATE_PATH = path.join(process.cwd(), 'merch.html');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function plainText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function productPath(handle) {
  return `/products/${encodeURIComponent(handle)}`;
}

function imageAlt(product, image) {
  const supplied = plainText(image && image.alt);
  // Shopify's default "Product mockup" does not tell image searchers or
  // assistive-technology users which item is shown.
  if (!supplied || /^product mockup$/i.test(supplied)) return `${product.title} product image`;
  return `${product.title} — ${supplied}`;
}

function renderCatalog(products) {
  const validProducts = (products || []).filter(product => product && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(product.handle || '')));
  if (!validProducts.length) return '<p class="product-loading-text">The collection is being updated. Please check back shortly.</p>';
  return validProducts.map((product, index) => {
    const image = (product.images || []).find(item => item && /^https?:\/\//i.test(String(item.url || '')));
    const description = plainText(product.description).slice(0, 300);
    const href = productPath(product.handle);
    return `<article class="product-card" data-server-rendered-card><div class="product-gallery"><div class="product-image-wrap">${image ? `<a class="product-image-zoom" href="${escapeHtml(href)}" aria-label="View ${escapeHtml(product.title)}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(imageAlt(product, image))}" loading="lazy" decoding="async"></a>` : '<div class="product-no-image" aria-hidden="true">DM</div>'}<span class="product-index">${String(index + 1).padStart(2, '0')}</span></div></div><div class="product-body"><h3 class="product-title"><a class="product-title-button" href="${escapeHtml(href)}">${escapeHtml(product.title)}</a></h3>${product.vendor ? `<p class="product-vendor">${escapeHtml(product.vendor)}</p>` : ''}${description ? `<p class="product-desc">${escapeHtml(description)}</p>` : ''}<a class="product-details-trigger" href="${escapeHtml(href)}">View product →</a></div></article>`;
  }).join('');
}

function renderMerchPage(template, products, featureManifest, remoteMedia = false) {
  const catalog = renderCatalog(products);
  const gridPattern = /<div class="product-grid" id="product-grid" aria-live="polite" aria-busy="true">[\s\S]*?<\/div>\s*\n\s*<div class="merch-unavailable"/;
  const replacement = `<div class="product-grid" id="product-grid" aria-live="polite" aria-busy="false" data-server-rendered="true">${catalog}</div>\n\n      <div class="merch-unavailable"`;
  if (!gridPattern.test(template)) throw new Error('Merch catalog placeholder was not found in the page template.');
  return template.replace(gridPattern, replacement).replace('<!-- CURRENT_DROP -->', () => renderCurrentDrop(products || [], featureManifest, remoteMedia));
}

function readTemplate() {
  try { return fs.readFileSync(TEMPLATE_PATH, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return fs.readFileSync(DEVELOPMENT_TEMPLATE_PATH, 'utf8');
  }
}

function createMerchHandler(getCatalog, readPageTemplate = readTemplate, getCurrentDrop = async () => null) {
  return async function handler(request, response) {
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).send('Method not allowed'); }
    try {
      const catalog = await getCatalog(request);
      const feature = await getCurrentDrop().catch(() => null);
      const body = renderMerchPage(readPageTemplate(), catalog.products || [], feature, true);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).send(body);
    } catch (error) {
      console.error('Dude merch route failed', { message: error.message });
      response.setHeader('Cache-Control', 'no-store');
      return response.status(503).send('Merch catalog unavailable');
    }
  };
}

module.exports = { createMerchHandler, imageAlt, plainText, renderCatalog, renderMerchPage };
