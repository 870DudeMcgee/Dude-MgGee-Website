#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'merch.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'merch.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'merch.css'), 'utf8');
const signalStyles = fs.readFileSync(path.join(root, 'signal.css'), 'utf8');

assert.match(html, /<dialog[^>]+id="product-details"[^>]+aria-labelledby="product-details-title"/);
assert.match(script, /detailsButton\.textContent = "Product details →"/);
assert.match(script, /this\.description\.replaceChildren\(productDetailsContent\(product\)\)/);
assert.match(script, /document\.createElement\(rowIndex === 0 \|\| cellIndex === 0 \? "th" : "td"\)/);
assert.match(script, /element\.scope = "col"/);
assert.match(script, /element\.scope = "row"/);
assert.match(script, /title\.after\(priceRow\)/);
assert.match(script, /quantity\.min = "1"/);
assert.match(script, /quantity\.max = "99"/);
assert.doesNotMatch(signalStyles, /\.artifact-card:hover \.artifact-dossier/);
assert.match(styles, /\.variant-pill\s*\{[^}]*min-height: 2\.75rem/s);
assert.match(styles, /\.product-price-row\s*\{[^}]*margin-top: -\.5rem/s);

const cartSource = script.slice(script.indexOf('const CART_STORAGE_KEY'), script.indexOf('/* ============== Cart Drawer UI'));
let payload;
const context = vm.createContext({
  localStorage: { setItem() {} },
  document: { getElementById: () => ({ disabled: false, textContent: '' }) },
  window: { DudeMerchMeasurement: { currentAttribution: () => null, beginCheckout() {} }, location: {} },
  fetch: async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true, checkoutUrl: 'https://example.test/checkout' }) };
  },
  console,
});
vm.runInContext(`${cartSource}\nthis.testCart = Cart; this.testCheckout = checkout;`, context);
const variantA = { id: 'gid://shopify/ProductVariant/1', title: 'M', price: { amount: '30.00', currencyCode: 'USD' } };
const variantB = { id: 'gid://shopify/ProductVariant/2', title: 'L', price: { amount: '35.00', currencyCode: 'USD' } };
const product = { title: 'Fixture Tee', images: [] };
context.testCart.add(variantB.id, variantB.id, product, variantB, 2);
context.testCart.add(variantA.id, variantA.id, product, variantA, 1);
assert.equal(context.testCart.count(), 3);
assert.equal(context.testCart.subtotal(), 100);
context.testCart.setQuantity(variantA.id, 99);
assert.equal(context.testCart.items[1].quantity, 99);
context.testCart.setQuantity(variantA.id, 1);

context.testCheckout().then(() => {
  assert.deepEqual(JSON.parse(JSON.stringify(payload.lines)), [
    { merchandiseId: variantB.id, quantity: 2 },
    { merchandiseId: variantA.id, quantity: 1 },
  ]);
  console.log('Merch product detail UI contract checks passed.');
}).catch(error => { console.error(error); process.exitCode = 1; });
