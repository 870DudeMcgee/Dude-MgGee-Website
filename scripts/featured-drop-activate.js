#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createStore, readState } = require('../lib/featured-drop-store');
const { begin, commit, finish, rollbackProposal } = require('../lib/featured-drop-state');
const { manifest, identity, stableJson, hash } = require('../lib/current-drop');
const { verifyMedia } = require('./prepare-current-drop');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'gates/merch-pilot/featured-drop-operations');
const bytes = value => Buffer.from(stableJson(value));
function save(file, value, exclusive = false) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = bytes(value);
  if (exclusive) {
    const fd = fs.openSync(file, 'wx', 0o600);
    try { fs.writeFileSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } else {
    const temp = `${file}.${randomUUID()}.tmp`;
    const fd = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(fd, body); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file);
  }
  const directory = fs.openSync(path.dirname(file), 'r');
  try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  if (!fs.readFileSync(file).equals(body)) throw new Error('Local intent readback failed');
}
async function publicRead(url) {
  const r = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('Public readback failed');
  return r;
}
async function checkListing(m) {
  const html = await (await publicRead(m.canonicalUrl)).text();
  const data = /<script id="product-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!data) throw new Error('Listing data missing');
  const p = JSON.parse(data[1]).product;
  if (p.id !== m.productId || `public-sha256:${hash(stableJson(p))}` !== m.listingRevision || !p.availableForSale || !p.variants.some(v => v.available)) throw new Error('Exact listing changed or unavailable');
}
async function verifyPublic(m) {
  await checkListing(m);
  const html = await (await publicRead(m.entryUrl)).text();
  const data = /<script id="current-drop-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!data) throw new Error('Current feature marker missing');
  const marker = JSON.parse(data[1]);
  if (marker.revision !== identity(m).revision || marker.productId !== m.productId || marker.canonicalUrl !== m.canonicalUrl || marker.currentDropLabel !== m.currentDropLabel || !marker.available || !marker.catalogPreserved || stableJson(marker.media) !== stableJson(m.media)) throw new Error('Public feature mismatch');
  if (!html.includes('id="shop"') || !html.includes('data-server-rendered-card') || !html.includes('Choose your size')) throw new Error('Visible feature/catalog missing');
  const media = Buffer.from(await (await publicRead(`${new URL(m.entryUrl).origin}/api/featured-drop-media?sha=${m.media.sha256}`)).arrayBuffer());
  if (media.length !== m.media.bytes || hash(media) !== m.media.sha256) throw new Error('Public media mismatch');
  return { checkedAt: new Date().toISOString(), revision: marker.revision, productId: marker.productId, mediaSha256: m.media.sha256, provenance: 'PUBLIC_HTTP', available: true };
}
async function probe(store) {
  const file = path.join(DIR, 'provider-probe-v2.json');
  if (fs.existsSync(file)) throw new Error('Probe already has an intent; inspect evidence before another probe');
  const name = `probes/${randomUUID()}.json`;
  save(file, { status: 'WRITING', name }, true);
  const first = await store.put(name, bytes({ revision: 1 }));
  await store.put(name, bytes({ revision: 2 }), first.etag);
  let staleRejected = false, createRejected = false; const errors = [];
  try { await store.put(name, bytes({ revision: 3 }), first.etag); } catch (e) { staleRejected = e.kind === 'conflict'; errors.push({ phase: 'stale', kind: e.kind, status: e.status }); }
  try { await store.put(name, bytes({ revision: 4 })); } catch (e) { createRejected = e.kind === 'conflict'; errors.push({ phase: 'create', kind: e.kind, status: e.status }); }
  const readback = await store.get(name);
  save(file, { status: 'READBACK', name, errors, currentValue: JSON.parse(readback.bytes) });
  if (!staleRejected || !createRejected || !readback.bytes.equals(bytes({ revision: 2 }))) throw new Error('Provider conditional-write proof failed; no activation allowed');
  save(file, { status: 'VERIFIED', name, staleRejected, createRejected, currentRevision: 2, checkedAt: new Date().toISOString() });
  console.log('Live isolated provider probe passed: stale ETag and duplicate creation rejected; winning revision preserved.');
}
async function activate(store, expectedRevision) {
  const proof = JSON.parse(fs.readFileSync(path.join(DIR, 'provider-probe-v2.json')));
  if (proof.status !== 'VERIFIED') throw new Error('Provider proof required');
  verifyMedia(manifest); await checkListing(manifest);
  const id = identity(manifest);
  const file = path.join(DIR, `${id.activationId}.json`);
  if (fs.existsSync(file)) throw new Error('Activation already has an intent; use reconcile, never repeat activate');
  const current = await readState(store);
  if (await store.get(`receipts/${id.activationId}.json`)) throw new Error('Campaign revision already completed; use reconcile');
  const intent = begin(current.state, manifest, expectedRevision);
  save(file, { status: 'WRITING', ...id, expectedRevision, before: current, manifest }, true);
  let saved = await store.put('current.json', bytes(intent), current.etag);
  // Every provider write follows the durable local and remote intent.
  const mediaBytes = fs.readFileSync(path.join(ROOT, manifest.media.path));
  for (const [name, body] of [[`media/${manifest.media.sha256}.jpg`, mediaBytes], [`revisions/${id.campaignRevision}.json`, bytes(manifest)]]) {
    const existing = await store.get(name);
    if (existing) { if (!existing.bytes.equals(body)) throw new Error('Immutable object collision'); }
    else await store.put(name, body);
  }
  const committed = commit(intent, id.activationId);
  saved = await store.put('current.json', bytes(committed), saved.etag);
  save(file, { status: 'READBACK', ...id, expectedRevision, before: current, manifest, committedEtag: saved.etag });
  console.log('Guarded activation committed. Pending readback blocks further activation; run reconcile and verify in browser.');
}
async function reconcile(store) {
  const current = await readState(store);
  const id = identity(manifest);
  if (current.state.live?.activationId !== id.activationId) {
    console.log(JSON.stringify({ status: current.state.pending ? 'NEEDS_RECONCILIATION' : 'NOT_ACTIVE', currentRevision: current.state.live?.revision ?? null, pendingPhase: current.state.pending?.phase ?? null }));
    return;
  }
  const observation = await verifyPublic(manifest);
  save(path.join(DIR, `${id.activationId}.http.json`), observation);
  console.log(JSON.stringify({ ...observation, pendingPhase: current.state.pending?.phase ?? null, browserVerificationRequired: true }));
}
async function finalize(store, evidencePath) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath));
  const id = identity(manifest);
  const age = Date.now() - Date.parse(evidence.checkedAt);
  if (evidence.provenance !== 'PUBLIC_BROWSER' || evidence.revision !== id.revision || evidence.productId !== manifest.productId || evidence.mediaSha256 !== manifest.media.sha256 || evidence.mobileViewport !== true || evidence.catalogPreserved !== true || !Number.isFinite(age) || age < 0 || age > 86400000) throw new Error('Actual fresh browser evidence required');
  const observed = await verifyPublic(manifest);
  const { state, etag } = await readState(store);
  if (state.live?.activationId !== id.activationId) throw new Error('Active revision changed');
  const receipt = { ...id, manifest, observed, browser: evidence, previous: state.previous };
  const receiptName = `receipts/${id.activationId}.json`;
  const existing = await store.get(receiptName);
  if (!existing) await store.put(receiptName, bytes(receipt));
  else {
    const saved = JSON.parse(existing.bytes);
    if (saved.activationId !== id.activationId || stableJson(saved.manifest) !== stableJson(manifest)) throw new Error('Receipt collision');
  }
  if (state.pending) await store.put('current.json', bytes(finish(state, id.activationId)), etag);
  save(path.join(DIR, `${id.activationId}.verified.json`), { status: 'VERIFIED', ...receipt });
  console.log('Activation VERIFIED; immutable success receipt retained and pending intent cleared by CAS.');
}
async function main() {
  const store = createStore(fs.readFileSync(0, 'utf8'));
  const [operation, argument] = process.argv.slice(2);
  if (operation === 'probe' && !argument) return probe(store);
  if (operation === 'activate' && argument) return activate(store, argument === 'none' ? null : argument);
  if (operation === 'reconcile' && !argument) return reconcile(store);
  if (operation === 'finalize' && argument) return finalize(store, argument);
  if (operation === 'rollback-plan' && argument) {
    const { state } = await readState(store);
    save(path.join(DIR, 'rollback-proposal.json'), rollbackProposal(state, argument));
    console.log('Rollback proposal saved; no rollback executed.'); return;
  }
  throw new Error('Use probe | activate none|REVISION | reconcile | finalize EVIDENCE_FILE | rollback-plan REVISION');
}
if (require.main === module) main().catch(e => { console.error(e instanceof Error ? e.message : 'Activation failed; reconcile before retry'); process.exitCode = 1; });
module.exports = { save, checkListing, verifyPublic };
