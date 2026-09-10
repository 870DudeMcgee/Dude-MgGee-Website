'use strict';

const PILOT = 'dm-shirt-pilot-01';
const SOURCES = new Set(['facebook', 'instagram', 'youtube', 'google']);
const MEDIUMS = new Set(['facebook_reel', 'facebook_feed', 'instagram_reel', 'instagram_bio', 'instagram_story', 'youtube_description', 'organic_listing']);
const CONTENTS = new Set(['a-design-reveal', 'b-artist-signal', 'c-placement-guide', 'profile']);
const SOURCE_MEDIUMS = {
  facebook: new Set(['facebook_reel', 'facebook_feed']),
  instagram: new Set(['instagram_reel', 'instagram_bio', 'instagram_story']),
  youtube: new Set(['youtube_description']),
  google: new Set(['organic_listing']),
};
const ATTRIBUTION_KEYS = new Set(['campaign', 'source', 'medium', 'content', 'qa']);

function normalizeAttribution(raw) {
  if (raw == null) raw = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (Object.keys(raw).some(key => !ATTRIBUTION_KEYS.has(key))) return null;

  const campaign = raw.campaign == null ? '' : String(raw.campaign);
  const source = raw.source == null ? '' : String(raw.source);
  const medium = raw.medium == null ? '' : String(raw.medium);
  const content = raw.content == null ? '' : String(raw.content);
  const qa = raw.qa === true || raw.qa === 1 || raw.qa === '1';
  const emptyPlacement = !source && !medium && !content;
  const validPlacement = campaign === PILOT && SOURCES.has(source) && MEDIUMS.has(medium) && CONTENTS.has(content) && SOURCE_MEDIUMS[source].has(medium);
  if (!(emptyPlacement && !campaign) && !validPlacement) return null;
  if (![undefined, null, false, true, 0, 1, '0', '1'].includes(raw.qa)) return null;
  return { campaign: validPlacement ? PILOT : '', source: validPlacement ? source : '', medium: validPlacement ? medium : '', content: validPlacement ? content : '', qa };
}

function cartAttributes(attribution) {
  const attributes = attribution.campaign === PILOT ? [
    { key: 'dm_pilot', value: PILOT },
    { key: 'source', value: attribution.source },
    { key: 'medium', value: attribution.medium },
    { key: 'content', value: attribution.content },
  ] : [];
  if (attribution.qa) attributes.push({ key: 'qa', value: '1' });
  return attributes;
}

module.exports = { PILOT, SOURCES, MEDIUMS, CONTENTS, normalizeAttribution, cartAttributes };
