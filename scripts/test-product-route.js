#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderProduct, structuredData, selectedVariant, createProductHandler, renderDescription } = require('../lib/dude-product-route');

const product = {
  id: 'gid://shopify/Product/44', handle: 'signal-tee', title: 'Signal Tee', description: 'A shirt from the signal.', vendor: 'Dude McGee', productType: 'T-Shirt',
  images: [{ url: 'https://cdn.example/tee.jpg', alt: 'Product mockup' }, { url: 'https://cdn.example/tee-back.jpg', alt: 'Back artwork mockup' }], options: [{ name: 'Color', values: ['Black', 'White'] }, { name: 'Size', values: ['S', 'M'] }],
  variants: [
    { id: 'gid://shopify/ProductVariant/101', sku: 'DM-BLK-S', title: 'Black / S', available: false, price: { amount: '25.00', currencyCode: 'USD' }, image: 'https://cdn.example/black.jpg', imageAlt: 'Black tee', selectedOptions: [{ name: 'Color', value: 'Black' }, { name: 'Size', value: 'S' }] },
    { id: 'gid://shopify/ProductVariant/102', sku: 'DM-WHT-M', title: 'White / M', available: true, price: { amount: '27.50', currencyCode: 'USD' }, image: 'https://cdn.example/white.jpg', imageAlt: 'White tee', selectedOptions: [{ name: 'Color', value: 'White' }, { name: 'Size', value: 'M' }] },
  ],
};

assert.equal(selectedVariant(product, '101').id, product.variants[0].id, 'valid sold-out variant must remain selectable');
assert.equal(selectedVariant(product, 'wrong').id, product.variants[1].id, 'invalid variant must use first available fallback');
const schema = structuredData(product);
assert.equal(schema['@type'], 'ProductGroup');
assert.equal(schema.name, 'Dude McGee Signal Tee');
assert.equal(schema.hasVariant[0].name, 'Dude McGee Signal Tee - Black / S');
assert.equal(schema.productGroupID, product.id);
assert.deepEqual(schema.variesBy, ['https://schema.org/color', 'https://schema.org/size']);
assert.equal(schema.hasVariant[0].offers.url, 'https://www.dudemcgee.com/products/signal-tee?variant=101');
assert.equal(schema.hasVariant[0].offers.availability, 'https://schema.org/OutOfStock');
assert.equal(schema.hasVariant[1].offers.price, '27.50');
assert.equal(schema.hasVariant[1].sku, 'DM-WHT-M');
assert.equal(schema.hasVariant[0].offers.shippingDetails, undefined, 'unmapped pages stay sellable but expose no unverified policy');

const policySchema = structuredData({ ...product, handle: 'unisex-t-shirt' });
for (const schemaVariant of policySchema.hasVariant) {
  assert.equal(schemaVariant.offers.shippingDetails.shippingRate.value, '4.95');
  assert.equal(schemaVariant.offers.shippingDetails.shippingDestination.addressCountry, 'US');
  assert.deepEqual(schemaVariant.offers.shippingDetails.deliveryTime.handlingTime, { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' });
  assert.deepEqual(schemaVariant.offers.shippingDetails.deliveryTime.transitTime, { '@type': 'QuantitativeValue', minValue: 1, maxValue: 8, unitCode: 'DAY' });
  assert.deepEqual(schemaVariant.offers.shippingDetails.deliveryTime.businessDays.dayOfWeek, [
    'https://schema.org/Monday',
    'https://schema.org/Tuesday',
    'https://schema.org/Wednesday',
    'https://schema.org/Thursday',
    'https://schema.org/Friday',
  ]);
  assert.equal(schemaVariant.offers.hasMerchantReturnPolicy.returnPolicyCategory, 'https://schema.org/MerchantReturnNotPermitted');
  assert.equal(schemaVariant.offers.hasMerchantReturnPolicy.merchantReturnLink, 'https://www.dudemcgee.com/returns.html');
  assert.equal(schemaVariant.offers.hasMerchantReturnPolicy.merchantReturnDays, undefined);
  assert.equal(schemaVariant.review, undefined);
  assert.equal(schemaVariant.aggregateRating, undefined);
}
assert.equal(policySchema.hasVariant[0].offers.availability, 'https://schema.org/OutOfStock', 'sold-out offers retain policy markup');

const explicitCopySchema = structuredData({
  ...product,
  handle: 'digital-fauna-signal-tee-white',
  title: 'Digital Fauna Tee - White',
  description: 'White unisex T-shirt. Size guide CHEST XS 31-34 2XL 50-53.',
  options: [{ name: 'Size', values: ['S', 'M'] }],
  variants: product.variants.map(variant => ({ ...variant, selectedOptions: variant.selectedOptions.filter(option => option.name === 'Size') })),
});
for (const schemaVariant of explicitCopySchema.hasVariant) {
  assert.equal(schemaVariant.color, 'White');
  assert.equal(schemaVariant.audience.suggestedGender, 'Unisex');
  assert.equal(schemaVariant.audience.suggestedMinAge, 13);
}

const checkoutGirlSchema = structuredData({
  ...product,
  handle: 'checkout-girl-tee',
  title: 'Checkout Girl Tee',
  description: 'Heather gray Bella + Canvas 3001 unisex jersey short sleeve tee.',
  vendor: 'Dude McGee Merch',
  options: [{ name: 'Size', values: ['XS', '5XL'] }],
  variants: product.variants.map((variant, index) => ({ ...variant, selectedOptions: [{ name: 'Size', value: index ? '5XL' : 'XS' }] })),
});
for (const schemaVariant of checkoutGirlSchema.hasVariant) {
  assert.equal(schemaVariant.color, 'Heather gray');
  assert.equal(schemaVariant.audience.suggestedGender, 'Unisex');
  assert.equal(schemaVariant.offers.shippingDetails.shippingRate.value, '4.95');
}
assert.equal(checkoutGirlSchema.brand.name, 'Dude McGee Merch');
const checkoutGirlOptionOverride = structuredData({
  ...product,
  handle: 'checkout-girl-tee',
  title: 'Checkout Girl Tee',
  description: 'Heather gray Bella + Canvas 3001 unisex jersey short sleeve tee.',
  options: [{ name: 'Color', values: ['Graphite'] }],
  variants: [{ ...product.variants[0], selectedOptions: [{ name: 'Color', value: 'Graphite' }] }],
});
assert.equal(checkoutGirlOptionOverride.color, 'Graphite', 'a real variant option overrides the shared product fallback');
assert.equal(checkoutGirlOptionOverride.audience.suggestedGender, 'Unisex');
assert.match(renderProduct(product, '101'), /\$25\.00/);
assert.match(renderProduct(product, '101'), /currently sold out/);
assert.match(renderProduct(product, 'missing'), /\$27\.50/);
assert.match(renderProduct(product, '101'), /id="product-data"/);
const productPage = renderProduct(product, '101');
assert.match(productPage, /<title>Dude McGee Signal Tee<\/title>/);
assert.match(productPage, /<meta property="og:title" content="Dude McGee Signal Tee">/);
assert.match(productPage, /<h1[^>]*>Dude McGee Signal Tee<\/h1>/);
assert.doesNotMatch(productPage, /Dude McGee Signal Tee \| Dude McGee Merch/);
assert.equal(structuredData({ ...product, title: 'Dude McGee Signal Tee' }).name, 'Dude McGee Signal Tee', 'an existing brand name must not be duplicated');
assert.match(productPage, /data-gallery-index="0"/);
assert.match(productPage, /data-gallery-index="1"/);
assert.match(productPage, /<button[^>]+id="product-image-open"[^>]*>[\s\S]*?<img[^>]+id="product-image"/, 'the main product image must open the zoom viewer');
assert.match(productPage, /<dialog[^>]+id="product-page-zoom"/, 'product pages must render an image zoom dialog');
assert.match(productPage, /id="product-page-zoom-prev"/);
assert.match(productPage, /id="product-page-zoom-next"/);
assert.match(productPage, /Product mockup/);
assert.ok(productPage.indexOf('id="product-buy"') < productPage.indexOf('<section class="product-description"'), 'checkout controls must precede long product details');
const plainGuide = 'Signal DETAILS Front art. Size guide: see original measurements 27 × 16 ½.';
assert.match(renderDescription({ description: plainGuide }), /Size guide: see original measurements 27 × 16 ½\./, 'plain fallback must not discard an unfamiliar size guide');
assert.equal(renderDescription({ descriptionHtml: '<p>Front &amp; back &#189;</p>' }), '<p>Front &amp; back &#189;</p>', 'catalog HTML entities must not be double escaped');
const safeTable = renderDescription({ description: 'fallback', descriptionHtml: '<table onclick="bad"><tr><td>XS</td></tr></table><script>alert(1)</script><img src=x onerror=bad>' });
assert.match(safeTable, /<table><tr><td>XS<\/td><\/tr><\/table>/);
assert.doesNotMatch(safeTable, /onclick|script|onerror|alert\(1\)|<img/);
assert.match(renderProduct({ ...product, images: [], variants: [] }), /Product image unavailable/);
assert.match(fs.readFileSync(path.join(__dirname, '..', 'merch.js'), 'utf8'), /titleButton\.href = `\/products\/\$\{encodeURIComponent\(product\.handle\)\}`/);

function response() {
  return { headers: {}, statusCode: null, body: '', setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, send(body) { this.body = body; return this; } };
}

(async () => {
  const handler = createProductHandler(async () => ({ products: [product] }));
  const found = response(); await handler({ method: 'GET', query: { handle: 'signal-tee', variant: '101' } }, found);
  assert.equal(found.statusCode, 200); assert.match(found.body, /variant=101/);
  const missing = response(); await handler({ method: 'GET', query: { handle: 'missing' } }, missing);
  assert.equal(missing.statusCode, 404);
  const unavailable = response(); const originalError = console.error; console.error = () => {};
  await createProductHandler(async () => { throw new Error('offline'); })({ method: 'GET', query: { handle: 'signal-tee' } }, unavailable); console.error = originalError;
  assert.equal(unavailable.statusCode, 503);
  console.log('Dude product route, schema, navigation, and error-path checks passed.');
})();

// Execute the actual browser script with a minimal DOM and a stubbed checkout
// transport: assert the shopper-visible selection and outgoing cart line agree.
const vm = require('node:vm');
class Element {
  constructor() {
    this.children = []; this.events = {}; this.attrs = {}; this.open = false;
    this.classList = { toggle() {} };
    this.style = { setProperty() {} };
  }
  appendChild(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, handler) { this.events[name] = handler; }
  showModal() { this.open = true; }
  close() { this.open = false; if (this.events.close) this.events.close(); }
  focus() {}
}
async function checkClientNavigation() {
  const clientProduct = JSON.parse(JSON.stringify(product));
  clientProduct.variants[0].available = true;
  clientProduct.variants[1].image = null;
  const nodes = Object.fromEntries(['product-data', 'product-options', 'product-price', 'product-image', 'product-image-open', 'product-gallery-thumbs', 'product-image-note', 'product-availability', 'product-buy', 'product-page-zoom', 'product-page-zoom-image-button', 'product-page-zoom-image', 'product-page-zoom-title', 'product-page-zoom-counter', 'product-page-zoom-level', 'product-page-zoom-close', 'product-page-zoom-prev', 'product-page-zoom-next', 'product-page-zoom-in', 'product-page-zoom-out', 'product-page-zoom-reset'].map(id => [id, new Element()]));
  const clientGallery = [...clientProduct.images, { url: clientProduct.variants[0].image, alt: clientProduct.variants[0].imageAlt }];
  clientGallery.forEach((item, index) => { const button = new Element(); button.attrs['data-gallery-index'] = String(index); nodes['product-gallery-thumbs'].appendChild(button); });
  nodes['product-data'].textContent = JSON.stringify({ product: clientProduct, galleryImages: clientGallery, selectedVariantId: '101' });
  const events = {}, requests = [];
  const location = { href: 'https://www.dudemcgee.com/products/signal-tee?campaign=test#details', assign(url) { this.destination = url; } };
  const context = {
    document: { getElementById: id => nodes[id], createElement: () => new Element() },
    window: { location, addEventListener: (name, handler) => { events[name] = handler; } },
    history: { pushState(state, title, url) { location.href = new URL(url, location.href).href; } },
    URL, Intl,
    fetch: async (url, init) => { requests.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ checkoutUrl: 'https://checkout.example/test' }) }; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets/product-page.js'), 'utf8'), context);
  assert.equal(nodes['product-price'].textContent, '$25.00');
  const colorButtons = nodes['product-options'].children[0].children;
  colorButtons.find(button => button.textContent === 'White').events.click();
  assert.equal(nodes['product-price'].textContent, '$27.50');
  assert.equal(nodes['product-image'].src, 'https://cdn.example/tee.jpg', 'variant without an image resets to product fallback');
  nodes['product-gallery-thumbs'].children[1].events.click();
  assert.equal(nodes['product-image'].src, 'https://cdn.example/tee-back.jpg', 'gallery exposes the authoritative back artwork');
  assert.equal(nodes['product-image-note'].textContent, 'Product mockup', 'mockup metadata is disclosed');
  nodes['product-image-open'].events.click();
  assert.equal(nodes['product-page-zoom'].open, true, 'clicking the selected product image opens the zoom viewer');
  assert.equal(nodes['product-page-zoom-image'].src, 'https://cdn.example/tee-back.jpg', 'zoom opens the selected gallery image');
  assert.equal(nodes['product-page-zoom-counter'].textContent, '02 / 03', 'zoom includes every product and variant image');
  nodes['product-page-zoom-prev'].events.click();
  assert.equal(nodes['product-page-zoom-image'].src, 'https://cdn.example/tee.jpg', 'zoom navigation reaches the other product images');
  assert.match(location.href, /campaign=test&variant=102#details$/);
  assert.equal(nodes['product-options'].children[1].children.find(button => button.textContent === 'M').attrs['aria-pressed'], 'true', 'incomplete option combination chooses reachable variant');
  await nodes['product-buy'].events.click();
  assert.equal(requests[0].body.lines[0].merchandiseId, 'gid://shopify/ProductVariant/102');
  assert.equal(location.destination, 'https://checkout.example/test');
  location.href = 'https://www.dudemcgee.com/products/signal-tee#details'; events.popstate();
  assert.equal(nodes['product-price'].textContent, '$25.00', 'back to bare URL restores default');
  location.href = 'https://www.dudemcgee.com/products/signal-tee?variant=unknown'; events.popstate();
  assert.equal(nodes['product-price'].textContent, '$25.00');
  clientProduct.variants[0].available = false;
  nodes['product-data'].textContent = JSON.stringify({ product: clientProduct, selectedVariantId: '101' });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets/product-page.js'), 'utf8'), context);
  assert.equal(nodes['product-buy'].disabled, true);
  await nodes['product-buy'].events.click();
  assert.equal(requests.length, 1, 'sold-out variant must never reach checkout transport');
  console.log('Dude browser selection, history, image fallback, exact checkout and sold-out behavior passed.');
}
checkClientNavigation().catch(error => { console.error(error); process.exitCode = 1; });
