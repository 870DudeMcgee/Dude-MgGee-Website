#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { manifest, identity, renderCurrentDrop, hash, stableJson, validateManifest } = require('../lib/current-drop');
const { verifyMedia, prepare, savePrepared } = require('./prepare-current-drop');
const { renderMerchPage } = require('../lib/dude-merch-route');
const product = { id: manifest.productId, handle: 'unisex-t-shirt', title: 'Exact test tee', availableForSale: true, variants: [{ available: true }] };
const testManifest = { ...manifest, listingRevision: `public-sha256:${hash(stableJson(product))}` };
verifyMedia(manifest);
const html = renderCurrentDrop([product]);
assert.match(html, /CURRENT FEATURED DROP/);
assert.match(html, /Original Black Signal Tee/);
assert.match(html, /Choose your size/);
assert.match(html, /href="#shop"/);
const marker = JSON.parse(html.match(/<script id="current-drop-data" type="application\/json">(.*?)<\/script>/s)[1]);
assert.equal(marker.productId, product.id);
assert.equal(marker.canonicalUrl, manifest.canonicalUrl);
assert.equal(marker.revision, identity(manifest).revision);
assert.equal(marker.media.sha256, manifest.media.sha256);
assert.equal(marker.available, true);
for (const sold of [{ ...product, availableForSale: false }, { ...product, variants: [{ available: false }] }]) {
  const h = renderCurrentDrop([sold]); assert.match(h, /Currently sold out/); assert.doesNotMatch(h, /Choose your size/);
}
for (const list of [[], [{ ...product, id: 'gid://shopify/Product/1' }], [{ ...product, handle: 'afterglow' }]]) {
  const h = renderCurrentDrop(list); assert.match(h, /no longer in the current catalog/); assert.doesNotMatch(h, /Choose your size|>View product</);
}
const hostile = renderCurrentDrop([product], { ...manifest, description: '</p><script>alert(1)</script>' });
assert.doesNotMatch(hostile, /<script>alert/);
assert.throws(() => validateManifest({ ...manifest, canonicalUrl: manifest.canonicalUrl + '?wrong=1' }));
assert.throws(() => validateManifest({ ...manifest, media: { ...manifest.media, path: '../secret.jpg' } }));
const template = fs.readFileSync(path.join(__dirname, '../merch.html'), 'utf8');
const page = renderMerchPage(template, [product, { id: 'older', handle: 'older-drop', title: 'Earlier named drop' }]);
assert.ok(page.indexOf('current-drop-title') < page.indexOf('id="shop"'));
assert.match(page, /Earlier named drop/);
assert.match(page, /href="\/products\/older-drop"/);
const plan = prepare(testManifest, product, null, null, 'dpl_existing');
assert.deepEqual(plan, prepare(testManifest, product, null, null, 'dpl_existing'));
assert.throws(() => prepare(testManifest, product, 'newer', null, 'dpl_existing'), /Stale/);
assert.throws(() => prepare(testManifest, { ...product, id: 'wrong' }, null, null, 'dpl_existing'), /Listing/);
assert.throws(() => prepare(testManifest, { ...product, availableForSale: false }, null, null, 'dpl_existing'), /Listing/);
assert.throws(() => prepare(testManifest, { ...product, title: 'Changed' }, null, null, 'dpl_existing'), /Listing/);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dude-drop-check-'));
try {
  const file = savePrepared(plan, dir);
  assert.equal(savePrepared(plan, dir), file);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), plan);
  assert.throws(() => savePrepared({ ...plan, previousDeployment: 'dpl_newer' }, dir), /reconcile/);
  for (const relative of ['scripts/prepare-merch-template.js', 'lib/current-drop.js', 'lib/current-drop.json', 'merch.html', manifest.media.path]) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(__dirname, '..', relative), target);
  }
  const build = () => spawnSync(process.execPath, ['scripts/prepare-merch-template.js'], { cwd: dir, env: { ...process.env, VERCEL: '1' } });
  assert.equal(build().status, 0);
  assert.ok(fs.readFileSync(path.join(dir, 'lib/merch-template.html'), 'utf8').includes('<!-- CURRENT_DROP -->'));
  assert.equal(fs.existsSync(path.join(dir, 'merch.html')), false);
  fs.copyFileSync(path.join(__dirname, '../merch.html'), path.join(dir, 'merch.html'));
  fs.mkdirSync(path.join(dir, 'assets/drops'), { recursive: true });
  fs.writeFileSync(path.join(dir, manifest.media.path), 'tampered');
  assert.throws(() => verifyMedia(manifest, dir), /verification failed/);
  assert.notEqual(build().status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'merch.html')), true);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
console.log('Current drop checks passed');
