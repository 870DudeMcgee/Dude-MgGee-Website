'use strict';
const { randomUUID } = require('node:crypto');
const STORE_ID = 'rGUzebC3ZZPfZxVr';
const PREFIX = 'featured-drop/v1/';
class StoreError extends Error {
  constructor(kind, status) { super(`Featured-drop storage ${kind}${status ? ` (${status})` : ''}`); this.kind = kind; this.status = status; }
}
function createStore(token, fetcher = fetch) {
  if (typeof token !== 'string' || token.split('_')[3] !== STORE_ID) throw new StoreError('credential unavailable');
  function objectPath(name) {
    if (!/^(current\.json|revisions\/[a-f0-9]{64}\.json|media\/[a-f0-9]{64}\.jpg|receipts\/[a-f0-9]{64}\.json|probes\/[a-f0-9-]+\.json)$/.test(name)) throw new StoreError('invalid path');
    return PREFIX + name;
  }
  async function get(name) {
    const url = `https://${STORE_ID.toLowerCase()}.private.blob.vercel-storage.com/${objectPath(name)}?cache=0`;
    let response;
    try { response = await fetcher(url, { headers: { authorization: `Bearer ${token}`, 'accept-encoding': 'identity' }, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
    catch { throw new StoreError('read failed'); }
    if (response.status === 404) return null;
    if (!response.ok) throw new StoreError('read failed', response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new StoreError('object too large');
    const etag = response.headers.get('etag');
    if (!etag || etag.startsWith('W/')) throw new StoreError('missing strong etag');
    return { bytes, etag };
  }
  async function put(name, bytes, expectedEtag = null) {
    const pathname = objectPath(name);
    const headers = { authorization: `Bearer ${token}`, 'x-api-version': '12', 'x-vercel-blob-store-id': STORE_ID, 'x-api-blob-request-id': randomUUID(), 'x-api-blob-request-attempt': '0', 'x-vercel-blob-access': 'private', 'x-add-random-suffix': '0', 'x-allow-overwrite': expectedEtag === null ? '0' : '1', 'x-cache-control-max-age': '60', 'x-content-type': name.endsWith('.jpg') ? 'image/jpeg' : 'application/json', 'x-content-length': String(bytes.length) };
    if (expectedEtag !== null) headers['x-if-match'] = expectedEtag;
    let response;
    // ponytail: use the SDK v2.8.0 wire protocol with native fetch, avoiding its automatic write retries/OIDC refresh.
    try { response = await fetcher(`https://vercel.com/api/blob/?${new URLSearchParams({ pathname })}`, { method: 'PUT', headers, body: bytes, redirect: 'error', signal: AbortSignal.timeout(20000) }); }
    catch { throw new StoreError('uncertain write'); }
    if (!response.ok) {
      let code, message; try { const error = (await response.json()).error; code = error?.code; message = error?.message; } catch {}
      if (response.status === 412 || (['precondition_failed', 'blob_already_exists'].includes(code) || (code === 'bad_request' && typeof message === 'string' && message.includes('already exists')))) throw new StoreError('conflict', response.status);
      throw new StoreError('uncertain write', response.status);
    }
    // Readback is authoritative; an unreadable successful response remains uncertain.
    const readback = await get(name);
    if (!readback || !readback.bytes.equals(bytes)) throw new StoreError('uncertain readback');
    return readback;
  }
  return { get, put };
}
async function readState(store) {
  const object = await store.get('current.json');
  if (!object) return { state: { format: 1, live: null, previous: null, pending: null }, etag: null };
  const state = JSON.parse(object.bytes.toString('utf8'));
  if (state.format !== 1 || !Object.hasOwn(state, 'live') || !Object.hasOwn(state, 'pending')) throw new StoreError('invalid state');
  return { state, etag: object.etag };
}
module.exports = { createStore, readState, StoreError, STORE_ID };
