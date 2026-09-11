'use strict';
const { createStore, readState } = require('../lib/featured-drop-store');
const { hash, validateManifest } = require('../lib/current-drop');
module.exports = async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).end();
  try {
    const sha = request.query.sha;
    if (typeof sha !== 'string' || !/^[a-f0-9]{64}$/.test(sha)) return response.status(404).end();
    const store = createStore(process.env.BLOB_READ_WRITE_TOKEN);
    const { state } = await readState(store);
    const candidates = [state.live?.manifest, state.previous?.manifest].filter(Boolean);
    const manifest = candidates.find(m => m.media?.sha256 === sha);
    if (!manifest) return response.status(404).end();
    validateManifest(manifest);
    const media = await store.get(`media/${sha}.jpg`);
    if (!media || media.bytes.length !== manifest.media.bytes || hash(media.bytes) !== sha) throw new Error('Media verification failed');
    response.setHeader('Content-Type', 'image/jpeg');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return response.status(200).send(media.bytes);
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(503).end();
  }
};
