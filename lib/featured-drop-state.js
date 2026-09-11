'use strict';
const { identity, validateManifest } = require('./current-drop');
function begin(state, manifest, expectedRevision) {
  validateManifest(manifest);
  const id = identity(manifest);
  if (state.pending) throw new Error('An operation needs reconciliation');
  if ((state.live?.revision ?? null) !== expectedRevision) throw new Error('Stale expected revision');
  if (state.live?.revision === id.revision) throw new Error('Revision already active; use readback');
  return { ...state, pending: { ...id, manifest, phase: 'WRITING', expectedRevision } };
}
function commit(state, activationId) {
  const pending = state.pending;
  if (!pending || pending.activationId !== activationId || pending.phase !== 'WRITING' || (state.live?.revision ?? null) !== pending.expectedRevision) throw new Error('No matching write intent');
  return { ...state, previous: state.live, live: { revision: pending.revision, activationId, manifest: pending.manifest }, pending: { ...pending, phase: 'READBACK' } };
}
function finish(state, activationId) {
  if (state.pending?.activationId !== activationId || state.pending.phase !== 'READBACK' || state.live?.activationId !== activationId) throw new Error('No matching readback');
  return { ...state, pending: null };
}
function rollbackProposal(state, expectedRevision) {
  if (state.pending || !state.previous || state.live?.revision !== expectedRevision) throw new Error('Rollback requires reconciled current and previous success');
  return { expectedRevision, restore: state.previous, status: 'PROPOSAL_ONLY' };
}
module.exports = { begin, commit, finish, rollbackProposal };
