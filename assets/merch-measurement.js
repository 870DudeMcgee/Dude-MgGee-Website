(function (root) {
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

  function readUrl(value) {
    try { return new URL(String(value || ''), 'https://www.dudemcgee.com/'); }
    catch { return new URL('https://www.dudemcgee.com/'); }
  }

  function attributionFromUrl(value) {
    const params = readUrl(value).searchParams;
    const source = params.get('utm_source') || '';
    const medium = params.get('utm_medium') || '';
    const content = params.get('utm_content') || '';
    const campaign = params.get('utm_campaign') || '';
    const qa = params.get('dm_qa') === '1';
    const validCampaign = campaign === PILOT;
    const validPlacement = validCampaign && SOURCES.has(source) && MEDIUMS.has(medium) && CONTENTS.has(content) && SOURCE_MEDIUMS[source].has(medium);
    return {
      campaign: validPlacement ? PILOT : '',
      source: validPlacement ? source : '',
      medium: validPlacement ? medium : '',
      content: validPlacement ? content : '',
      qa,
    };
  }

  function currentAttribution() {
    return attributionFromUrl(root && root.location ? root.location.href : '');
  }

  function attributionParams(attribution) {
    const result = [];
    if (attribution.campaign === PILOT && attribution.source && attribution.medium && attribution.content) {
      result.push(['utm_campaign', PILOT], ['utm_source', attribution.source], ['utm_medium', attribution.medium], ['utm_content', attribution.content]);
    }
    if (attribution.qa) result.push(['dm_qa', '1']);
    return result;
  }

  function decorateProductUrl(value) {
    const base = root && root.location ? root.location.href : 'https://www.dudemcgee.com/merch.html';
    const url = readUrl(new URL(String(value || ''), base).href);
    const current = readUrl(base);
    if (url.origin !== current.origin || !/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)) return String(value || '');
    attributionParams(currentAttribution()).forEach(([key, item]) => url.searchParams.set(key, item));
    return url.pathname + url.search + url.hash;
  }

  function sanitizedPageLocation(value) {
    const url = readUrl(value);
    const clean = new URL(url.origin + url.pathname);
    const variant = url.searchParams.get('variant');
    if (variant && /^\d+$/.test(variant)) clean.searchParams.set('variant', variant);
    attributionParams(attributionFromUrl(url.href)).forEach(([key, item]) => clean.searchParams.set(key, item));
    return clean.href;
  }

  function sanitizedReferrer() {
    try {
      const url = new URL(root?.document?.referrer || '');
      return /^https?:$/.test(url.protocol) ? url.origin + '/' : '';
    } catch { return ''; }
  }

  function itemPayload(product, variant, quantity) {
    if (!product || !variant || !variant.id || !variant.price) return null;
    const count = Math.max(1, Math.min(99, Number(quantity) || 1));
    const amount = Number(variant.price.amount);
    if (!Number.isFinite(amount)) return null;
    return {
      item_id: String(variant.id),
      item_name: String(product.title || ''),
      item_variant: String(variant.title || ''),
      price: amount,
      quantity: count,
    };
  }

  function cartItemPayload(item) {
    if (!item || !item.merchandiseId) return null;
    const amount = Number(item.price);
    if (!Number.isFinite(amount)) return null;
    return {
      item_id: String(item.merchandiseId),
      item_name: String(item.title || ''),
      item_variant: String(item.variantTitle || ''),
      price: amount,
      quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
    };
  }

  function send(eventName, items, currency) {
    const attribution = currentAttribution();
    if (attribution.qa || !root || typeof root.gtag !== 'function' || !items.length) return false;
    root.gtag('event', eventName, {
      currency: String(currency || 'USD'),
      value: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      items,
      page_location: sanitizedPageLocation(root.location.href),
      page_referrer: sanitizedReferrer(),
      ...(attribution.campaign === PILOT ? { dm_pilot: PILOT, source: attribution.source, medium: attribution.medium, content: attribution.content } : {}),
    });
    return true;
  }

  function viewItem(product, variant) {
    const item = itemPayload(product, variant, 1);
    return item ? send('view_item', [item], variant.price.currencyCode) : false;
  }

  function addToCart(product, variant, quantity) {
    const item = itemPayload(product, variant, quantity);
    return item ? send('add_to_cart', [item], variant.price.currencyCode) : false;
  }

  function beginCheckout(cartItems) {
    const items = (cartItems || []).map(cartItemPayload).filter(Boolean);
    const currency = (cartItems || []).find(item => item && item.currency)?.currency || 'USD';
    return send('begin_checkout', items, currency);
  }

  function configure() {
    const attribution = currentAttribution();
    if (attribution.qa || !root || typeof root.gtag !== 'function') return false;
    root.gtag('config', 'G-8G41W2HBR2', {
      page_location: sanitizedPageLocation(root.location.href),
      page_referrer: sanitizedReferrer(),
    });
    return true;
  }

  const api = { PILOT, SOURCES, MEDIUMS, CONTENTS, attributionFromUrl, currentAttribution, decorateProductUrl, sanitizedPageLocation, itemPayload, cartItemPayload, viewItem, addToCart, beginCheckout, configure };
  if (root) root.DudeMerchMeasurement = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  configure();
}(typeof window !== 'undefined' ? window : null));
