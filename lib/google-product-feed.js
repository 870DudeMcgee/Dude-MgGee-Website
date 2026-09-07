'use strict';

const { structuredData, variantNumericId } = require('./dude-product-route');

const ORIGIN = 'https://www.dudemcgee.com';
const OPTION_FIELDS = new Set(['color', 'size', 'material', 'pattern']);
const PRINTFUL_RATES = new Map([
  ['digital-fauna-signal-tee-chest-logo-white', '4.95'], ['digital-fauna-signal-tee-white', '4.95'], ['unisex-t-shirt', '4.95'],
  ['unisex-premium-mid-weight-hoodie-2', '8.79'], ['unisex-hoodie', '8.79'], ['unisex-premium-mid-weight-hoodie-1', '8.79'], ['unisex-premium-mid-weight-hoodie', '8.79'],
  ['foam-trucker-hat-1', '4.69'], ['foam-trucker-hat', '4.69'], ['coozie', '4.69']
]);

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

// Shopify supplies only Size for the current Dude apparel. These values are
// deliberately limited to facts stated by that product's own title/copy.
function catalogFields(product, description) {
  const fields = {};
  const color = String(product.title || '').match(/\b(black|white)\s*$/i);
  if (color) fields.color = color[1].charAt(0).toUpperCase() + color[1].slice(1).toLowerCase();

  const copy = `${product.title || ''} ${description || ''}`;
  const isGarment = /\b(?:t[ -]?shirt|tee|hoodie|sweatshirt)\b/i.test(copy);
  const isUnisex = /\bunisex\b/i.test(copy);
  const isExplicitlyYouth = /\b(?:kids?|youth|baby|toddler|infant|children'?s)\b/i.test(copy);
  // The published garment size guides give chest/length dimensions through
  // 2XL or above. Together with the explicit garment type, that supports the
  // Merchant Center adult (13+) classification without inferring an audience
  // from a generic adult-looking product.
  const hasAdultSizeGuide = /size guide/i.test(copy) && /\b(?:2xl|3xl|4xl|5xl)\b/i.test(copy);
  if (isGarment && isUnisex) fields.gender = 'unisex';
  if (isGarment && hasAdultSizeGuide && !isExplicitlyYouth) fields.age_group = 'adult';
  return fields;
}

function shippingXml(product) {
  const price = PRINTFUL_RATES.get(product.handle);
  if (!price) return '';
  return `\n      <g:shipping>\n        <g:country>US</g:country>\n        <g:service>Standard</g:service>\n        <g:price>${price} USD</g:price>\n        <g:min_handling_time>2</g:min_handling_time>\n        <g:max_handling_time>5</g:max_handling_time>\n        <g:min_transit_time>1</g:min_transit_time>\n        <g:max_transit_time>8</g:max_transit_time>\n      </g:shipping>\n      <g:shipping_handling_business_days>M-F</g:shipping_handling_business_days>\n      <g:shipping_transit_business_days>M-F</g:shipping_transit_business_days>`;
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
  const fields = {
    ...catalogFields(product, description),
    ...optionFields(product, variant),
    ...(schemaVariant ? Object.fromEntries(Object.entries(schemaVariant).filter(([key]) => OPTION_FIELDS.has(key))) : {})
  };
  const title = schemaVariant && schemaVariant.name || product.title;
  const lines = [
    ['g:id', id], ['g:item_group_id', groupId], ['g:title', title], ['g:description', description],
    ['g:link', `${canonical}?variant=${id}`], ['g:image_link', image], ['g:price', `${amount} ${currency}`],
    ['g:availability', variant.available ? 'in_stock' : 'out_of_stock'], ['g:condition', 'new'], ['g:brand', product.vendor]
  ];
  for (const name of ['color', 'size', 'material', 'pattern', 'gender', 'age_group']) if (fields[name]) lines.push([`g:${name}`, fields[name]]);
  return `    <item>\n${lines.map(([name, value]) => `      <${name}>${xml(value)}</${name}>`).join('\n')}${shippingXml(product)}\n    </item>`;
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
