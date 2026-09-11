#!/usr/bin/env node
'use strict';
// Preparation only. A Vercel read followed by promote is not remote CAS.
const fs = require('node:fs');
const path = require('node:path');
const { manifest, stableJson, hash, identity, validateManifest } = require('../lib/current-drop');
const ROOT = path.join(__dirname, '..');
function verifyMedia(m, root = ROOT) {
  validateManifest(m);
  const file = path.join(root, m.media.path);
  if (!fs.lstatSync(file).isFile()) throw new Error('Media must be a regular file');
  const bytes = fs.readFileSync(file);
  if (bytes.length !== m.media.bytes || hash(bytes) !== m.media.sha256) throw new Error('Exact media verification failed');
}
function prepare(m, listing, currentRevision, expectedRevision, previousDeployment) {
  validateManifest(m);
  if (currentRevision !== expectedRevision) throw new Error('Stale current landing revision');
  if (!/^dpl_[A-Za-z0-9]+$/.test(previousDeployment)) throw new Error('Exact previous deployment required');
  if (listing.id !== m.productId || new URL(m.canonicalUrl).pathname !== `/products/${listing.handle}` || `public-sha256:${hash(stableJson(listing))}` !== m.listingRevision || !listing.availableForSale || !listing.variants?.some(v => v.available)) throw new Error('Listing identity, revision or availability changed');
  return { ...identity(m), status: 'PREPARED', manifest: m, expectedPreviousRevision: expectedRevision, previousDeployment, productionActivation: 'BLOCKED_REMOTE_CAS', socialCampaignHash: null };
}
function savePrepared(plan, directory) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `${plan.activationId}.json`);
  const body = `${JSON.stringify(plan, null, 2)}\n`;
  try {
    const fd = fs.openSync(file, 'wx', 0o600);
    try { fs.writeFileSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    if (fs.readFileSync(file, 'utf8') !== body) throw new Error('Activation identity already has a different plan; reconcile');
  }
  if (fs.readFileSync(file, 'utf8') !== body) throw new Error('Prepared plan readback failed');
  return file;
}
async function readPublic(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok || response.url !== url) throw new Error('Public readback failed');
  return response.text();
}
async function main(args) {
  if (args.length !== 4 || args[0] !== '--expected-current' || args[2] !== '--previous-deployment') throw new Error('Usage: node scripts/prepare-current-drop.js --expected-current none|REVISION --previous-deployment dpl_ID');
  verifyMedia(manifest);
  const [landing, productHtml] = await Promise.all([readPublic(manifest.entryUrl), readPublic(manifest.canonicalUrl)]);
  const marker = /<script id="current-drop-data" type="application\/json">([\s\S]*?)<\/script>/.exec(landing);
  const current = marker ? JSON.parse(marker[1]).revision : null;
  const data = /<script id="product-data" type="application\/json">([\s\S]*?)<\/script>/.exec(productHtml);
  if (!data || (marker && typeof current !== 'string')) throw new Error('Invalid public binding');
  const plan = prepare(manifest, JSON.parse(data[1]).product, current, args[1] === 'none' ? null : args[1], args[3]);
  const file = savePrepared(plan, path.join(ROOT, 'gates/merch-pilot/featured-drop-prepared'));
  console.log(`Prepared and retrieval-verified: ${file}\nProduction activation blocked: remote compare-and-swap writer not established. No deployment attempted.`);
}
if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { verifyMedia, prepare, savePrepared };
