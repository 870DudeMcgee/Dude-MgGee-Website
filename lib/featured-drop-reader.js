'use strict';
const { createStore, readState } = require('./featured-drop-store');
const { validateManifest, identity } = require('./current-drop');
async function currentDrop() {
  try {
    const { state } = await readState(createStore(process.env.BLOB_READ_WRITE_TOKEN));
    if (!state.live) return null;
    validateManifest(state.live.manifest);
    const id = identity(state.live.manifest);
    if (id.revision !== state.live.revision || id.activationId !== state.live.activationId) return null;
    return state.live.manifest;
  } catch { return null; }
}
module.exports = { currentDrop };
