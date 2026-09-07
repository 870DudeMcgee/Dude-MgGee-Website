'use strict';

const { structuredData, variantNumericId } = require('./dude-product-route');

const ORIGIN = 'https://www.dudemcgee.com';
const OPTION_FIELDS = new Set(['color', 'size', 'material', 'pattern']);

function xml(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function numericId(value, label) {
  const match = String(value || '').match(/(?:^|\/)(\d+)$/);
  if (!match || match[1].length > 50) throw new Error(`Missing valid numeric ${label}`);
  return match[1];
}

function plainText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function optionFields(product, variant) {
  return (variant.selectedOptions || []).reduce((fields, option) => {
    const name = String(option && option.name || '').trim().toLowerCase();
    const property = name === 'colour' ? 'color' : name;
    if (OPTION_FIELDS.has(property) && option && option.value) fields[property] = String(option.value);
    return fields;
  }, {});
}

function itemForVariant(product, variant, schemaVariant) {
  const id = numericId(variantNumericId(variant), 'variant id');
  const groupId = numericId(product.id, 'product id');
  const canonical = `${ORIGIN}/products/${encodeURIComponent(product.handle)}`;
  const description = plainText(product.description) || String(product.title || '');
  const image = schemaVariant && schemaVariant.image || (product.images || []).find((entry) => entry && entry.url)?.url;
  const price = variant && variant.price;
  const amount = String(price && price.amount || '');
  const currency = String(price && price.currencyCode || '');
  if (!product.handle || !product.title || !description || !image || !product.vendor || !/^\d+(?:\.\d+)?$/.test(amount) || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`Product ${product.handle || groupId} has incomplete Google Merchant data`);
  }
  const fields = { ...optionFields(product, variant), ...(schemaVariant ? Object.fromEntries(Object.entries(schemaVariant).filter(([key]) => OPTION_FIELDS.has(key))) : {}) };
  const title = schemaVariant && schemaVariant.name || product.title;
  const lines = [
    ['g:id', id], ['g:item_group_id', groupId], ['g:title', title], ['g:description', description],
    ['g:link', `${canonical}?variant=${id}`], ['g:image_link', image], ['g:price', `${amount} ${currency}`],
    ['g:availability', variant.available ? 'in_stock' : 'out_of_stock'], ['g:condition', 'new'], ['g:brand', product.vendor]
  ];
  for (const name of ['color', 'size', 'material', 'pattern']) if (fields[name]) lines.push([`g:${name}`, fields[name]]);
  return `    <item>\n${lines.map(([name, value]) => `      <${name}>${xml(value)}</${name}>`).join('\n')}\n    </item>`;
}

function renderGoogleProductFeed(catalog) {
  if (!catalog || !Array.isArray(catalog.products) || catalog.products.length === 0) throw new Error('Catalog unavailable or empty');
  const items = [];
  for (const product of catalog.products) {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) throw new Error('Catalog includes an invalid product');
    const schema = structuredData(product);
    const variants = schema.hasVariant || [schema];
    product.variants.forEach((variant, index) => items.push(itemForVariant(product, variant, variants[index])));
  }
  if (!items.length) throw new Error('Catalog unavailable or empty');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Dude McGee products</title>\n    <link>${ORIGIN}</link>\n    <description>Official Dude McGee merchandise</description>\n${items.join('\n')}\n  </channel>\n</rss>\n`;
}

function createGoogleProductFeedHandler({ getCatalog }) {
  return async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return response.status(405).send('Method not allowed'); }
    try {
      const body = renderGoogleProductFeed(await getCatalog(request));
      response.setHeader('Content-Type', 'application/xml; charset=utf-8');
      response.setHeader('Cache-Control', 'public, s-maxage=300, stale-if-error=86400');
      return response.status(200).send(request.method === 'HEAD' ? '' : body);
    } catch (error) {
      console.error('Google product feed unavailable', { message: error.message });
      response.setHeader('Cache-Control', 'no-store'); response.setHeader('Retry-After', '300');
      return response.status(503).send('Google product feed temporarily unavailable. Please retry later.');
    }
  };
}

module.exports = { createGoogleProductFeedHandler, renderGoogleProductFeed, xml };
