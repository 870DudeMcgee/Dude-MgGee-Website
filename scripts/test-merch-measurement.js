#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { normalizeAttribution, cartAttributes, PILOT } = require('../lib/merch-attribution');
const { createHandler, normalizeLines, buildCartPermalink, returnedLines, sameLines } = require('../api/shopify-cart');

const root = path.resolve(__dirname, '..');
const measurementSource = fs.readFileSync(path.join(root, 'assets/merch-measurement.js'), 'utf8');
const productPageSource = fs.readFileSync(path.join(root, 'assets/product-page.js'), 'utf8');
const merchSource = fs.readFileSync(path.join(root, 'merch.js'), 'utf8');
const merchHtml = fs.readFileSync(path.join(root, 'merch.html'), 'utf8');
const productRouteSource = fs.readFileSync(path.join(root, 'lib/dude-product-route.js'), 'utf8');

function measurementContext(url, withGtag = true) {
  const calls = [];
  const window = { location: { href: url }, document: { referrer: 'https://referrer.example/private-person?email=hidden@example.com' } };
  if (withGtag) window.gtag = (...args) => calls.push(args);
  const context = { window, URL, Set, module: undefined };
  vm.runInNewContext(measurementSource, context);
  return { api: window.DudeMerchMeasurement, calls, window };
}

const trackedUrl = `https://www.dudemcgee.com/merch.html?utm_campaign=${PILOT}&utm_source=instagram&utm_medium=instagram_reel&utm_content=a-design-reveal&email=private%40example.com`;
const measured = measurementContext(trackedUrl);
assert.equal(measured.calls.length, 1, 'GA is configured exactly once');
assert.equal(measured.calls[0][0], 'config');
assert.equal(measured.calls[0][1], 'G-8G41W2HBR2');
assert.equal(measured.calls[0][2].page_referrer, 'https://referrer.example/');
assert.doesNotMatch(measured.calls[0][2].page_location, /email|private/);
assert.match(measured.calls[0][2].page_location, /utm_source=instagram/);
assert.equal(measured.api.decorateProductUrl('/products/signal-shirt?variant=123'), `/products/signal-shirt?variant=123&utm_campaign=${PILOT}&utm_source=instagram&utm_medium=instagram_reel&utm_content=a-design-reveal`);
assert.equal(measured.api.decorateProductUrl('https://outside.example/products/signal-shirt'), 'https://outside.example/products/signal-shirt');
assert.deepEqual(
  JSON.parse(JSON.stringify(measured.api.attributionFromUrl(`https://www.dudemcgee.com/?utm_campaign=${PILOT}&utm_source=facebook&utm_medium=instagram_reel&utm_content=profile`))),
  { campaign: '', source: '', medium: '', content: '', qa: false },
  'cross-channel source/medium injection is discarded'
);

const product = { title: 'Signal Tee' };
const variant = { id: 'gid://shopify/ProductVariant/101', title: 'Black / M', price: { amount: '30.00', currencyCode: 'USD' } };
measured.api.viewItem(product, variant);
measured.api.addToCart(product, variant, 2);
measured.api.beginCheckout([{ merchandiseId: variant.id, title: product.title, variantTitle: variant.title, price: '30.00', currency: 'USD', quantity: 2 }]);
assert.deepEqual(measured.calls.slice(1).map(call => call[1]), ['view_item', 'add_to_cart', 'begin_checkout']);
assert.equal(measured.calls[2][2].items[0].item_id, variant.id);
assert.equal(measured.calls[2][2].items[0].quantity, 2);
assert.equal(measured.calls[3][2].value, 60);
assert.ok(measured.calls.slice(1).every(call => !/email|private/.test(call[2].page_location) && call[2].page_referrer === 'https://referrer.example/'), 'every owned event strips arbitrary query and referrer data');
assert.ok(measured.calls.every(call => call[1] !== 'purchase'), 'the browser never emits purchase');

const nonPilot = measurementContext('https://www.dudemcgee.com/merch.html?utm_campaign=wrong&utm_source=instagram&utm_medium=instagram_reel&utm_content=profile');
nonPilot.api.viewItem(product, variant);
assert.equal(nonPilot.calls[1][2].dm_pilot, undefined, 'missing or invalid campaigns never receive the pilot marker');

const qa = measurementContext(`${trackedUrl}&dm_qa=1`);
qa.api.viewItem(product, variant);
qa.api.addToCart(product, variant, 1);
qa.api.beginCheckout([{ merchandiseId: variant.id, price: '30', quantity: 1 }]);
assert.equal(qa.calls.length, 0, 'dm_qa=1 suppresses config and every event');
const blocked = measurementContext(trackedUrl, false);
assert.equal(blocked.api.viewItem(product, variant), false, 'missing gtag remains silent');

assert.deepEqual(normalizeLines({ lines: [{ merchandiseId: variant.id, quantity: 2 }] }), [{ merchandiseId: variant.id, quantity: 2 }]);
for (const quantity of [0, 1.5, 100, '2', 'bad']) assert.equal(normalizeLines({ lines: [{ merchandiseId: variant.id, quantity }] }), null);
assert.equal(normalizeLines({ lines: [{ merchandiseId: 'gid://shopify/Product/101', quantity: 1 }] }), null);
assert.equal(normalizeLines({ lines: [{ merchandiseId: variant.id, quantity: 1 }, { merchandiseId: variant.id, quantity: 1 }] }), null, 'duplicate variants fail closed');
const validAttribution = normalizeAttribution({ campaign: PILOT, source: 'youtube', medium: 'youtube_description', content: 'profile', qa: '1' });
assert.deepEqual(validAttribution, { campaign: PILOT, source: 'youtube', medium: 'youtube_description', content: 'profile', qa: true });
assert.deepEqual(cartAttributes(validAttribution), [
  { key: 'dm_pilot', value: PILOT }, { key: 'source', value: 'youtube' }, { key: 'medium', value: 'youtube_description' }, { key: 'content', value: 'profile' }, { key: 'qa', value: '1' },
]);
const noCampaign = normalizeAttribution({});
assert.deepEqual(noCampaign, { campaign: '', source: '', medium: '', content: '', qa: false });
assert.deepEqual(cartAttributes(noCampaign), [], 'unattributed traffic receives no pilot claim');
assert.deepEqual(cartAttributes(normalizeAttribution({ qa: 1 })), [{ key: 'qa', value: '1' }], 'QA can be marked without claiming pilot attribution');
for (const invalid of [
  { campaign: 'injected', source: 'youtube', medium: 'youtube_description', content: 'profile' },
  { campaign: PILOT, source: 'email', medium: 'youtube_description', content: 'profile' },
  { campaign: PILOT, source: 'youtube', medium: 'facebook_feed', content: 'profile' },
  { campaign: PILOT, source: 'youtube', medium: 'youtube_description', content: '<script>' },
  { campaign: PILOT, source: '', medium: '', content: '', customer_email: 'private@example.com' },
]) assert.equal(normalizeAttribution(invalid), null);

function response() {
  return { headers: {}, statusCode: null, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

async function apiChecks() {
  const requests = [];
  const handler = createHandler(async (query, variables) => {
    requests.push({ query, variables });
    return {
      cartCreate: {
        cart: {
          id: 'gid://shopify/Cart/1?key=secret-test-key',
          lines: { nodes: variables.input.lines.map(line => ({ quantity: line.quantity, merchandise: { id: line.merchandiseId } })) },
        },
        userErrors: [],
        warnings: [{ message: 'Test warning' }],
      },
    };
  });
  const success = response();
  await handler({ method: 'POST', headers: { host: 'www.dudemcgee.com', origin: 'https://www.dudemcgee.com' }, body: { lines: [{ merchandiseId: variant.id, quantity: 2 }], attribution: validAttribution } }, success);
  assert.equal(success.statusCode, 200);
  assert.equal(Object.hasOwn(success.body, 'cartId'), false, 'cart secret is not returned to the browser');
  assert.equal(JSON.stringify(success.body).includes('secret-test-key'), false);
  const checkoutUrl = new URL(success.body.checkoutUrl);
  assert.equal(checkoutUrl.origin, 'https://dude-mcgee-merch.myshopify.com');
  assert.equal(checkoutUrl.pathname, '/cart/101:2');
  assert.equal(checkoutUrl.searchParams.get('attributes[dm_pilot]'), PILOT);
  assert.equal(checkoutUrl.searchParams.get('attributes[source]'), 'youtube');
  assert.equal(checkoutUrl.searchParams.get('attributes[medium]'), 'youtube_description');
  assert.equal(checkoutUrl.searchParams.get('attributes[content]'), 'profile');
  assert.equal(checkoutUrl.searchParams.get('attributes[qa]'), '1');
  assert.equal(checkoutUrl.searchParams.has('access_token'), false);
  assert.deepEqual(success.body.warnings, ['Test warning']);
  assert.deepEqual(requests[0].variables.input.lines, [{ merchandiseId: variant.id, quantity: 2 }]);
  assert.deepEqual(requests[0].variables.input.attributes, cartAttributes(validAttribution));

  const unattributed = response();
  await handler({ method: 'POST', headers: {}, body: { lines: [{ merchandiseId: variant.id, quantity: 1 }] } }, unattributed);
  assert.equal(unattributed.statusCode, 200);
  assert.deepEqual(requests[1].variables.input.attributes, [], 'missing attribution must not create campaign attributes');
  const unattributedUrl = new URL(unattributed.body.checkoutUrl);
  for (const key of ['dm_pilot', 'source', 'medium', 'content', 'qa']) {
    assert.equal(unattributedUrl.searchParams.get(`attributes[${key}]`), '', `ordinary checkout clears stale ${key}`);
  }

  const badAttribution = response();
  await handler({ method: 'POST', headers: {}, body: { lines: [{ merchandiseId: variant.id, quantity: 1 }], attribution: { campaign: PILOT, source: 'private@example.com' } } }, badAttribution);
  assert.equal(badAttribution.statusCode, 400);
  assert.equal(requests.length, 2, 'invalid attribution never reaches Shopify');

  const rejected = response();
  await createHandler(async () => ({ cartCreate: { cart: null, userErrors: [{ message: 'Sold out' }] } }))({ method: 'POST', headers: {}, body: { lines: [{ merchandiseId: variant.id, quantity: 1 }], attribution: {} } }, rejected);
  assert.equal(rejected.statusCode, 422);
  assert.equal(rejected.body.code, 'shopify_cart_rejected');

  const mismatched = response();
  await createHandler(async () => ({ cartCreate: { cart: { lines: { nodes: [{ quantity: 1, merchandise: { id: variant.id } }] } }, userErrors: [], warnings: [{ message: 'Quantity changed' }] } }))({ method: 'POST', headers: {}, body: { lines: [{ merchandiseId: variant.id, quantity: 2 }], attribution: {} } }, mismatched);
  assert.equal(mismatched.statusCode, 422);
  assert.equal(mismatched.body.code, 'shopify_cart_mismatch', 'adjusted quantities never produce a checkout link');
  assert.equal(Object.hasOwn(mismatched.body, 'checkoutUrl'), false);

  const substituted = response();
  await createHandler(async () => ({ cartCreate: { cart: { lines: { nodes: [{ quantity: 2, merchandise: { id: secondVariant } }] } }, userErrors: [], warnings: [] } }))({ method: 'POST', headers: {}, body: { lines: [{ merchandiseId: variant.id, quantity: 2 }], attribution: {} } }, substituted);
  assert.equal(substituted.statusCode, 422);
  assert.equal(substituted.body.code, 'shopify_cart_mismatch', 'substituted variants never produce a checkout link');

  const unavailable = response();
  const originalError = console.error; console.error = () => {};
  await createHandler(async () => { throw new Error('offline'); })({ method: 'POST', headers: {}, body: { lines: [{ merchandiseId: variant.id, quantity: 1 }], attribution: {} } }, unavailable);
  console.error = originalError;
  assert.equal(unavailable.statusCode, 502);
}

const secondVariant = 'gid://shopify/ProductVariant/202';
const verified = returnedLines({ lines: { nodes: [
  { quantity: 2, merchandise: { id: variant.id } },
  { quantity: 1, merchandise: { id: secondVariant } },
] } });
assert.equal(sameLines([
  { merchandiseId: secondVariant, quantity: 1 },
  { merchandiseId: variant.id, quantity: 2 },
], verified), true, 'Shopify may return verified lines in a different order');
assert.equal(sameLines([{ merchandiseId: variant.id, quantity: 3 }], verified), false);
const helperPermalink = new URL(buildCartPermalink('dude-mcgee-merch.myshopify.com', verified, [{ key: 'qa', value: '1' }]));
assert.equal(helperPermalink.pathname, '/cart/101:2,202:1');
assert.equal(helperPermalink.searchParams.get('attributes[qa]'), '1');
assert.equal(helperPermalink.searchParams.get('attributes[dm_pilot]'), '', 'missing allowlisted attributes are explicitly cleared');
assert.throws(() => buildCartPermalink('attacker.example', verified, []), /domain is invalid/);
assert.throws(() => buildCartPermalink('dude-mcgee-merch.myshopify.com', verified, [{ key: 'customer_email', value: 'private@example.com' }]), /attribute is invalid/);

async function cartStorageChecks() {
  const checkoutButton = {};
  const document = { readyState: 'loading', addEventListener() {}, createElement() { return {}; }, getElementById(id) { return id === 'cart-checkout' ? checkoutButton : null; } };
  const checkoutEvents = [];
  const pageEvents = {};
  const context = {
    document, window: { addEventListener: (name, fn) => { pageEvents[name] = fn; }, location: { href: 'https://www.dudemcgee.com/merch.html' }, DudeMerchMeasurement: { currentAttribution: () => ({ campaign: '', source: '', medium: '', content: '', qa: false }), beginCheckout: items => checkoutEvents.push(items) } }, Map, URL, Intl, console, alert() {},
    fetch: async () => ({ ok: true, json: async () => ({ ok: true, checkoutUrl: 'https://checkout.example/1' }) }),
    localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
  };
  vm.runInNewContext(`${merchSource}\n;globalThis.__cart = Cart;globalThis.__checkout = checkout;`, context);
  const cart = context.__cart;
  cart.init();
  let changes = 0; cart.onChange(() => { changes += 1; });
  cart.add(variant.id, variant.id, { title: product.title, images: [] }, variant);
  assert.equal(cart.count(), 1, 'cart remains usable when storage throws');
  assert.equal(cart.items[0].merchandiseId, variant.id);
  assert.equal(changes, 1, 'storage failure does not skip cart UI notification');
  cart.setQuantity(variant.id, 2);
  assert.equal(cart.subtotal(), 60, 'existing quantity/subtotal behavior is preserved');
  await context.__checkout();
  assert.equal(cart.count(), 2, 'successful checkout creation retains the local cart for browser Back');
  assert.equal(checkoutEvents[0][0].quantity, 2);
  assert.equal(context.window.location.href, 'https://checkout.example/1');
  assert.equal(checkoutButton.disabled, true);
  pageEvents.pageshow({ persisted: true });
  assert.equal(checkoutButton.disabled, false, 'browser Back must restore an actionable checkout button');
  assert.equal(checkoutEvents.length, 1, 'Back does not duplicate checkout events');
}

async function directPageChecks() {
  class Element {
    constructor() { this.children = []; this.events = {}; this.attrs = {}; }
    appendChild(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    setAttribute(name, value) { this.attrs[name] = value; }
    addEventListener(name, handler) { this.events[name] = handler; }
  }
  const directProduct = { ...product, handle: 'signal-tee', images: [], options: [], variants: [{ ...variant, available: true, selectedOptions: [] }] };
  const nodes = Object.fromEntries(['product-data', 'product-options', 'product-price', 'product-image', 'product-availability', 'product-buy'].map(id => [id, new Element()]));
  nodes['product-data'].textContent = JSON.stringify({ product: directProduct, selectedVariantId: '101' });
  const events = [], requests = [];
  const location = { href: trackedUrl.replace('/merch.html', '/products/signal-tee') + '&variant=101&secret=hide', assign(url) { this.destination = url; } };
  const pageEvents = {};
  const window = { location, gtag: (...args) => events.push(args), addEventListener(name, fn) { pageEvents[name] = fn; } };
  const context = { window, document: { getElementById: id => nodes[id], createElement: () => new Element() }, history: { pushState() {} }, fetch: async (url, init) => { requests.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ checkoutUrl: 'https://checkout.example/1' }) }; }, URL, Set, Intl, module: undefined };
  vm.runInNewContext(measurementSource, context);
  vm.runInNewContext(productPageSource, context);
  assert.deepEqual(events.map(call => call[1]), ['G-8G41W2HBR2', 'view_item']);
  await nodes['product-buy'].events.click();
  assert.deepEqual(events.map(call => call[1]), ['G-8G41W2HBR2', 'view_item', 'add_to_cart', 'begin_checkout']);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].lines[0].merchandiseId, variant.id);
  assert.equal(requests[0].lines[0].quantity, 1);
  assert.equal(requests[0].attribution.source, 'instagram');
  assert.equal(location.destination, 'https://checkout.example/1');
  pageEvents.pageshow({ persisted: true });
  assert.equal(nodes['product-buy'].disabled, false, 'direct checkout must recover after browser Back');
  assert.equal(events.length, 4, 'Back does not emit a new conversion');

  const failedEvents = [];
  nodes['product-buy'].disabled = false;
  const failedContext = { ...context, window: { ...window, gtag: (...args) => failedEvents.push(args) }, fetch: async () => ({ ok: false, json: async () => ({}) }) };
  vm.runInNewContext(measurementSource, failedContext);
  vm.runInNewContext(productPageSource, failedContext);
  await nodes['product-buy'].events.click();
  assert.deepEqual(failedEvents.map(call => call[1]), ['G-8G41W2HBR2', 'view_item'], 'failed checkout emits no success events');
}

assert.match(merchHtml, /merch-measurement\.js/);
assert.match(merchHtml, /referrerpolicy="no-referrer"/);
assert.doesNotMatch(merchHtml, /gtag\('config'/);
assert.match(productRouteSource, /merch-measurement\.js/);
assert.match(productRouteSource, /referrerpolicy=\"no-referrer\"/);
assert.match(merchSource, /DudeMerchMeasurement\?\.addToCart/);
assert.match(merchSource, /DudeMerchMeasurement\?\.beginCheckout/);
assert.doesNotMatch(merchSource, /Cart\.clear\(\);\s*window\.location\.href/, 'successful checkout retains the local cart for browser Back');
assert.doesNotMatch(`${measurementSource}\n${merchSource}\n${productPageSource}`, /['"]purchase['"]/);

Promise.resolve().then(apiChecks).then(cartStorageChecks).then(directPageChecks).then(() => {
  console.log('Merch measurement, attribution, API, QA, failure, and storage checks passed.');
}).catch(error => { console.error(error); process.exitCode = 1; });
