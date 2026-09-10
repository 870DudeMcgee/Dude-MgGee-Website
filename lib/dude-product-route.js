'use strict';

const ORIGIN = 'https://www.dudemcgee.com';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function plainText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeDescriptionHtml(value) {
  const allowed = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption']);
  const withoutExecutableContent = String(value || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  return withoutExecutableContent.split(/(<[^>]*>)/g).map(part => {
    if (!part.startsWith('<')) return escapeHtml(part).replace(/&amp;((?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);)/gi, '&$1');
    const match = part.match(/^<\s*(\/?)\s*([a-z0-9]+)(?:\s[^>]*)?\/?\s*>$/i);
    if (!match || !allowed.has(match[2].toLowerCase())) return '';
    const tag = match[2].toLowerCase();
    return match[1] ? `</${tag}>` : `<${tag}>`;
  }).join('');
}

function renderDescription(product) {
  const html = String(product.descriptionHtml || '').trim();
  if (html) return safeDescriptionHtml(html);
  const text = String(product.description || '').trim();
  return text ? `<p>${escapeHtml(text)}</p>` : '';
}

function variantNumericId(variant) {
  const match = String(variant && variant.id || '').match(/(?:^|\/)(\d+)$/);
  return match ? match[1] : null;
}

function firstAvailable(product) {
  return (product.variants || []).find(variant => variant.available) || product.variants[0] || null;
}

function selectedVariant(product, requested) {
  const id = Array.isArray(requested) ? requested[0] : String(requested || '');
  if (/^\d+$/.test(id)) {
    const found = (product.variants || []).find(variant => variantNumericId(variant) === id);
    if (found) return found;
  }
  return firstAvailable(product);
}

function productUrl(handle) {
  return `${ORIGIN}/products/${encodeURIComponent(handle)}`;
}

function imageFor(product, variant) {
  if (variant && variant.image) return { url: variant.image, alt: variant.imageAlt || product.title };
  const first = (product.images || []).find(image => image && image.url);
  return first ? { url: first.url, alt: first.alt || product.title } : null;
}

function galleryImages(product) {
  const images = [];
  const seen = new Set();
  const add = (url, alt) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push({ url, alt: alt || product.title });
  };
  (product.images || []).forEach(image => { if (image) add(image.url, image.alt); });
  (product.variants || []).forEach(variant => { if (variant) add(variant.image, variant.imageAlt); });
  return images;
}

function isMockup(image) {
  return /\bmockup\b/i.test(String(image && image.alt || ''));
}

function offer(variant, canonical) {
  if (!variant || !variant.price || variant.price.amount == null || !variant.price.currencyCode) return null;
  const id = variantNumericId(variant);
  return {
    '@type': 'Offer',
    url: id ? `${canonical}?variant=${id}` : canonical,
    price: String(variant.price.amount),
    priceCurrency: String(variant.price.currencyCode),
    availability: `https://schema.org/${variant.available ? 'InStock' : 'OutOfStock'}`,
    itemCondition: 'https://schema.org/NewCondition',
  };
}

function formatPrice(money) {
  if (!money) return '';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currencyCode }).format(Number(money.amount)); }
  catch { return `${money.currencyCode || ''} ${money.amount}`.trim(); }
}

function propertyNames(product) {
  const lookup = { color: 'color', colour: 'color', size: 'size', material: 'material', pattern: 'pattern' };
  return [...new Set((product.options || []).map(option => lookup[String(option.name || '').toLowerCase()]).filter(Boolean))]
    .map(name => `https://schema.org/${name}`);
}

function variantProperties(variant) {
  const lookup = { color: 'color', colour: 'color', size: 'size', material: 'material', pattern: 'pattern' };
  return (variant.selectedOptions || []).reduce((result, option) => {
    const property = lookup[String(option.name || '').toLowerCase()];
    if (property && option.value) result[property] = option.value;
    return result;
  }, {});
}

function structuredData(product) {
  const canonical = productUrl(product.handle);
  const description = plainText(product.description) || product.title;
  const image = imageFor(product, firstAvailable(product));
  const common = {
    '@context': 'https://schema.org',
    name: product.title,
    description,
    url: canonical,
    ...(image ? { image: image.url } : {}),
    ...(product.vendor ? { brand: { '@type': 'Brand', name: product.vendor } } : {}),
  };
  if ((product.variants || []).length < 2) {
    const variant = product.variants[0];
    return { ...common, '@type': 'Product', '@id': `${canonical}#product`, ...(variant && variant.sku ? { sku: variant.sku } : {}), ...(offer(variant, canonical) ? { offers: offer(variant, canonical) } : {}) };
  }
  const groupId = String(product.id || product.handle);
  return {
    ...common,
    '@type': 'ProductGroup',
    '@id': `${canonical}#product-group`,
    productGroupID: groupId,
    variesBy: propertyNames(product),
    hasVariant: product.variants.map(variant => {
      const variantOffer = offer(variant, canonical);
      const variantImage = imageFor(product, variant);
      const optionValues = (variant.selectedOptions || []).map(option => option.value).filter(Boolean);
      return {
        '@type': 'Product',
        '@id': `${variantOffer ? variantOffer.url : canonical}#product`,
        name: optionValues.length ? `${product.title} - ${optionValues.join(' / ')}` : product.title,
        description,
        inProductGroupWithID: groupId,
        ...variantProperties(variant),
        ...(variantImage ? { image: variantImage.url } : {}),
        ...(variant.sku ? { sku: variant.sku } : {}),
        ...(variantOffer ? { offers: variantOffer } : {}),
      };
    }),
  };
}

function json(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function renderStatus(status, title, message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | Dude McGee</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/merch.css"></head><body class="merch-page"><main class="merch-shop" style="min-height:70vh;padding-top:10rem"><p class="section-index">${status}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a class="button button-primary" href="/merch.html">Back to merch</a></p></main></body></html>`;
}

function renderProduct(product, requestedVariant) {
  const canonical = productUrl(product.handle);
  const selected = selectedVariant(product, requestedVariant);
  const image = imageFor(product, selected);
  const description = plainText(product.description);
  const descriptionMarkup = renderDescription(product);
  const gallery = galleryImages(product);
  const price = selected && selected.price ? formatPrice(selected.price) : '';
  const state = { product, galleryImages: gallery, selectedVariantId: selected && variantNumericId(selected) };
  const initialGalleryIndex = gallery.findIndex(item => image && item.url === image.url);
  const measurementScripts = '<script async referrerpolicy="no-referrer" src="https://www.googletagmanager.com/gtag/js?id=G-8G41W2HBR2"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag(\'js\',new Date());</script><script src="/assets/merch-measurement.js"></script>';
  const galleryMarkup = measurementScripts + (gallery.length ? `<div class="product-page-image-wrap"><button class="product-page-image-button" id="product-image-open" type="button" aria-label="Enlarge image ${initialGalleryIndex + 1} of ${gallery.length}: ${escapeHtml((image || gallery[0]).alt)}"><img class="product-page-image" id="product-image" src="${escapeHtml(image ? image.url : gallery[0].url)}" alt="${escapeHtml(image ? image.alt : gallery[0].alt)}"><span class="product-zoom-hint" aria-hidden="true">⊕ Enlarge</span></button></div><div class="product-gallery-thumbs" id="product-gallery-thumbs" aria-label="Product images">${gallery.map((item, index) => `<button class="product-gallery-thumb" type="button" data-gallery-index="${index}" aria-current="${index === initialGalleryIndex ? 'true' : 'false'}" aria-label="View image ${index + 1}: ${escapeHtml(item.alt)}"><img src="${escapeHtml(item.url)}" alt=""></button>`).join('')}</div><p class="product-image-note" id="product-image-note">${isMockup(image || gallery[0]) ? 'Product mockup' : ''}</p>` : '<p class="product-gallery-empty">Product image unavailable.</p>');
  const zoomMarkup = gallery.length ? `<dialog class="product-zoom" id="product-page-zoom" aria-labelledby="product-page-zoom-title"><div class="product-zoom-shell"><div class="product-zoom-header"><p class="product-zoom-title" id="product-page-zoom-title">${escapeHtml(product.title)}</p><button class="product-zoom-close" id="product-page-zoom-close" type="button" aria-label="Close enlarged product image">✕</button></div><div class="product-zoom-stage"><button class="product-zoom-image-button" id="product-page-zoom-image-button" type="button" aria-label="Toggle detail zoom" aria-pressed="false"><img class="product-zoom-image" id="product-page-zoom-image" alt=""></button><button class="product-zoom-arrow product-zoom-prev" id="product-page-zoom-prev" type="button" aria-label="Previous product image">←</button><button class="product-zoom-arrow product-zoom-next" id="product-page-zoom-next" type="button" aria-label="Next product image">→</button><div class="product-zoom-controls" aria-label="Image zoom controls"><button id="product-page-zoom-out" type="button" aria-label="Zoom out">−</button><output id="product-page-zoom-level" aria-live="polite">100%</output><button id="product-page-zoom-in" type="button" aria-label="Zoom in">+</button><button class="product-zoom-reset" id="product-page-zoom-reset" type="button">Reset</button></div></div><div class="product-zoom-footer"><span class="product-zoom-instructions">Scroll, click, or tap to zoom</span><span class="product-zoom-counter" id="product-page-zoom-counter">01 / ${String(gallery.length).padStart(2, '0')}</span></div></div></dialog>` : '';
  const pageStyles = `.product-page-shell{max-width:1180px;margin:0 auto;padding:9rem 2rem 5rem;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:3rem}.product-page-shell>section{min-width:0}.product-page-image-wrap{position:relative}.product-page-image-button{display:block;width:100%;padding:0;border:0;background:transparent;color:inherit;cursor:zoom-in}.product-page-image-button:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}.product-page-image{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:#111}.product-gallery-thumbs{display:flex;gap:.5rem;overflow-x:auto;margin-top:.75rem;padding-bottom:.25rem}.product-gallery-thumb{flex:0 0 4.5rem;padding:0;border:1px solid #777;background:#111;cursor:pointer}.product-gallery-thumb[aria-current=true]{border-color:#e5ff00}.product-gallery-thumb img{display:block;width:100%;aspect-ratio:1;object-fit:cover}.product-image-note{margin:.5rem 0 0;font:600 .7rem 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase}.product-gallery-empty{min-height:12rem;display:grid;place-items:center;background:#111}.product-page-options fieldset{min-width:0;border:0;padding:0;margin:1.5rem 0}.product-page-options legend{font:600 .75rem 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase}.product-page-options button{margin:.25rem;padding:.6rem .8rem;background:transparent;color:inherit;border:1px solid #777;cursor:pointer}.product-page-options button[aria-pressed=true]{border-color:#e5ff00;color:#e5ff00}.product-page-options button:disabled{opacity:.45;cursor:not-allowed}.product-page-buy{margin-top:1.5rem}.product-description{margin-top:2.5rem;overflow-x:auto}.product-description h2{margin:1.75rem 0 .75rem;font-size:1.1rem}.product-description li,.product-description p{line-height:1.6}.product-table-wrap{overflow-x:auto}.product-description table{width:100%;border-collapse:collapse;font-size:.9rem}.product-description th,.product-description td{padding:.55rem;border-bottom:1px solid #555;text-align:left;white-space:nowrap}@media(max-width:760px){.product-page-shell{grid-template-columns:minmax(0,1fr);padding:7rem 1rem 3rem}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(product.title)} | Dude McGee Merch</title><meta name="description" content="${escapeHtml((description || product.title).slice(0, 160))}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="product"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${escapeHtml(product.title)} | Dude McGee Merch"><meta property="og:description" content="${escapeHtml((description || product.title).slice(0, 200))}">${image ? `<meta property="og:image" content="${escapeHtml(image.url)}">` : ''}<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/merch.css"><style>${pageStyles}</style><script type="application/ld+json">${json(structuredData(product))}</script></head><body class="merch-page"><a class="skip-link" href="#content">Skip to content</a><header class="site-header"><a class="wordmark" href="/" aria-label="Dude McGee home"><span class="wordmark-dot"></span>Dude McGee</a><nav class="desktop-nav" aria-label="Primary navigation"><a href="/merch.html">Merch</a><a href="/returns.html">Returns</a></nav></header><main id="content" class="product-page-shell"><section><a class="section-index" href="/merch.html">← All merch</a><div class="product-gallery">${galleryMarkup}</div></section><section><p class="section-index">${escapeHtml(product.productType || product.vendor || 'Official merchandise')}</p><h1 class="product-title" style="font-size:clamp(2rem,5vw,4.5rem)">${escapeHtml(product.title)}</h1><p class="product-price" id="product-price">${price}</p><p id="product-availability" aria-live="polite">${selected && selected.available ? 'Available for secure online checkout.' : 'This option is currently sold out.'}</p><div class="product-page-options" id="product-options"></div><button class="product-buy product-page-buy" id="product-buy" type="button"${selected && selected.available ? '' : ' disabled'}>${selected && selected.available ? 'Checkout securely' : 'Sold out'}</button><p class="cart-note">Shipping and taxes are calculated at checkout. <a href="/returns.html">Returns and order support</a></p>${descriptionMarkup ? `<section class="product-description" aria-label="Product details">${descriptionMarkup}</section>` : ''}</section></main>${zoomMarkup}<script id="product-data" type="application/json">${json(state)}</script><script src="/assets/product-page.js" defer></script></body></html>`;
}

function createProductHandler(getCatalog) {
  return async function handler(request, response) {
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).send(renderStatus(405, 'Method not allowed', 'This product route only supports GET requests.')); }
    const handle = Array.isArray(request.query.handle) ? request.query.handle[0] : String(request.query.handle || '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)) return response.status(404).send(renderStatus(404, 'Product not found', 'This product is not available.'));
    try {
      const catalog = await getCatalog(request);
      const product = (catalog.products || []).find(item => item && item.handle === handle);
      if (!product) { response.setHeader('Cache-Control', 'no-store'); return response.status(404).send(renderStatus(404, 'Product not found', 'This product is not available.')); }
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
      return response.status(200).send(renderProduct(product, request.query.variant));
    } catch (error) {
      console.error('Dude product route failed', { handle, message: error.message });
      response.setHeader('Cache-Control', 'no-store');
      return response.status(503).send(renderStatus(503, 'Product temporarily unavailable', 'The live catalog is temporarily unavailable. Please try again shortly.'));
    }
  };
}

module.exports = { createProductHandler, renderProduct, structuredData, selectedVariant, variantNumericId, renderDescription };
