#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderProduct, structuredData, selectedVariant, createProductHandler } = require('../lib/dude-product-route');

const product = {
  id: 'gid://shopify/Product/44', handle: 'signal-tee', title: 'Signal Tee', description: 'A shirt from the signal.', vendor: 'Dude McGee', productType: 'T-Shirt',
  images: [{ url: 'https://cdn.example/tee.jpg', alt: 'Signal Tee' }], options: [{ name: 'Color', values: ['Black', 'White'] }, { name: 'Size', values: ['S', 'M'] }],
  variants: [
    { id: 'gid://shopify/ProductVariant/101', sku: 'DM-BLK-S', title: 'Black / S', available: false, price: { amount: '25.00', currencyCode: 'USD' }, image: 'https://cdn.example/black.jpg', imageAlt: 'Black tee', selectedOptions: [{ name: 'Color', value: 'Black' }, { name: 'Size', value: 'S' }] },
    { id: 'gid://shopify/ProductVariant/102', sku: 'DM-WHT-M', title: 'White / M', available: true, price: { amount: '27.50', currencyCode: 'USD' }, image: 'https://cdn.example/white.jpg', imageAlt: 'White tee', selectedOptions: [{ name: 'Color', value: 'White' }, { name: 'Size', value: 'M' }] },
  ],
};

assert.equal(selectedVariant(product, '101').id, product.variants[0].id, 'valid sold-out variant must remain selectable');
assert.equal(selectedVariant(product, 'wrong').id, product.variants[1].id, 'invalid variant must use first available fallback');
const schema = structuredData(product);
assert.equal(schema['@type'], 'ProductGroup');
assert.equal(schema.productGroupID, product.id);
assert.deepEqual(schema.variesBy, ['https://schema.org/color', 'https://schema.org/size']);
assert.equal(schema.hasVariant[0].offers.url, 'https://www.dudemcgee.com/products/signal-tee?variant=101');
assert.equal(schema.hasVariant[0].offers.availability, 'https://schema.org/OutOfStock');
assert.equal(schema.hasVariant[1].offers.price, '27.50');
assert.equal(schema.hasVariant[1].sku, 'DM-WHT-M');
assert.match(renderProduct(product, '101'), /\$25\.00/);
assert.match(renderProduct(product, '101'), /currently sold out/);
assert.match(renderProduct(product, 'missing'), /\$27\.50/);
assert.match(renderProduct(product, '101'), /id="product-data"/);
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
  constructor() { this.children = []; this.events = {}; this.attrs = {}; }
  appendChild(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, handler) { this.events[name] = handler; }
}
async function checkClientNavigation() {
  const clientProduct = JSON.parse(JSON.stringify(product));
  clientProduct.variants[0].available = true;
  clientProduct.variants[1].image = null;
  const nodes = Object.fromEntries(['product-data', 'product-options', 'product-price', 'product-image', 'product-availability', 'product-buy'].map(id => [id, new Element()]));
  nodes['product-data'].textContent = JSON.stringify({ product: clientProduct, selectedVariantId: '101' });
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
