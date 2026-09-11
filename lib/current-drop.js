'use strict';
const { createHash } = require('node:crypto');
const manifest = require('./current-drop.json');
const ENTRY_URL = 'https://www.dudemcgee.com/merch.html';
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function identity(m) {
  const campaignRevision = hash(stableJson(m));
  return { campaignRevision, revision: `website-sha256:${campaignRevision}`, activationId: hash(`landing:${m.campaignId}:${campaignRevision}`) };
}
function validateManifest(m) {
  if (!m || !/^[a-z0-9-]+$/.test(m.campaignId) || m.approvalScope !== 'website-only' || typeof m.approvalSource !== 'string' || !m.approvalSource.trim() || m.entryUrl !== ENTRY_URL || m.linkTitle !== 'Shop the latest DUDE McGEE drop' || !/^gid:\/\/shopify\/Product\/\d+$/.test(m.productId) || !/^https:\/\/www\.dudemcgee\.com\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.canonicalUrl) || !/^public-sha256:[a-f0-9]{64}$/.test(m.listingRevision) || m.catalogPreserved !== true) throw new Error('Invalid Website drop binding');
  for (const key of ['currentDropLabel', 'description']) if (typeof m[key] !== 'string' || !m[key].trim()) throw new Error('Missing Website copy');
  const media = m.media;
  if (!media || !/^assets\/drops\/[a-z0-9-]+\.jpg$/.test(media.path) || !/^[a-f0-9]{64}$/.test(media.sha256) || !Number.isSafeInteger(media.bytes) || media.bytes <= 0 || !Number.isSafeInteger(media.width) || media.width <= 0 || !Number.isSafeInteger(media.height) || media.height <= 0 || typeof media.alt !== 'string' || !media.alt.trim()) throw new Error('Invalid exact media binding');
  return m;
}
function escape(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderCurrentDrop(products, m = manifest, remoteMedia = false) {
  if (m === null) return '<section class="current-drop" aria-label="Featured drop unavailable"><div><h2>Browse DUDE McGEE merch</h2><p>The current feature is unavailable right now. Browse the full catalog below.</p><a href="#shop">Browse the full catalog ↓</a></div></section>';
  validateManifest(m);
  const handle = new URL(m.canonicalUrl).pathname.split('/').pop();
  const product = products.find(p => p.id === m.productId && p.handle === handle);
  const available = Boolean(product && product.availableForSale && product.variants?.some(v => v.available));
  const status = !product ? 'This drop is no longer in the current catalog.' : available ? 'Available sizes are shown on the product page.' : 'Currently sold out.';
  const marker = { ...identity(m), entryUrl: m.entryUrl, productId: m.productId, canonicalUrl: m.canonicalUrl, approvedListingRevision: m.listingRevision, catalogPreserved: true, currentDropLabel: m.currentDropLabel, available, media: m.media, approvalScope: m.approvalScope };
  // ponytail: a packaged immutable manifest; Shopify alone supplies live availability.
  return `<section class="current-drop" aria-labelledby="current-drop-title"><img src="${remoteMedia ? `/api/featured-drop-media?sha=${m.media.sha256}` : `/${escape(m.media.path)}`}" width="${m.media.width}" height="${m.media.height}" alt="${escape(m.media.alt)}" decoding="async"><div class="current-drop-copy"><p class="section-index">CURRENT FEATURED DROP</p><h2 id="current-drop-title">${escape(m.currentDropLabel)}</h2><p>${escape(m.description)}</p><p class="current-drop-status">${status}</p>${product ? `<a class="button button-primary" href="${escape(m.canonicalUrl)}">${available ? 'Choose your size' : 'View product'}</a>` : ''}<a class="current-drop-catalog" href="#shop">Browse the full catalog ↓</a><p class="current-drop-note">This permanent link shows the current featured drop. Earlier products remain in the catalog while listed.</p></div></section><script id="current-drop-data" type="application/json">${JSON.stringify(marker).replace(/</g,'\\u003c')}</script>`;
}
module.exports = { manifest, stableJson, hash, identity, validateManifest, renderCurrentDrop };
