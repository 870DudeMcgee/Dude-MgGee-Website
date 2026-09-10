(function () {
  'use strict';
  const data = document.getElementById('product-data');
  if (!data) return;
  const state = JSON.parse(data.textContent);
  const product = state.product;
  const optionsRoot = document.getElementById('product-options');
  const price = document.getElementById('product-price');
  const image = document.getElementById('product-image');
  const imageOpen = document.getElementById('product-image-open');
  const galleryButtons = document.getElementById('product-gallery-thumbs');
  const imageNote = document.getElementById('product-image-note');
  const availability = document.getElementById('product-availability');
  const buy = document.getElementById('product-buy');
  const zoomDialog = document.getElementById('product-page-zoom');
  const zoomImageButton = document.getElementById('product-page-zoom-image-button');
  const zoomImage = document.getElementById('product-page-zoom-image');
  const zoomTitle = document.getElementById('product-page-zoom-title');
  const zoomCounter = document.getElementById('product-page-zoom-counter');
  const zoomLevel = document.getElementById('product-page-zoom-level');
  const numericId = variant => (String(variant && variant.id || '').match(/(?:^|\/)(\d+)$/) || [])[1];
  const defaultVariant = () => (product.variants || []).find(variant => variant.available) || product.variants[0] || null;
  const initial = (product.variants || []).find(variant => numericId(variant) === String(state.selectedVariantId)) || defaultVariant();
  const galleryImages = (() => {
    const items = [];
    const seen = new Set();
    const add = item => {
      if (!item || !item.url || seen.has(item.url)) return;
      seen.add(item.url);
      items.push({ url: item.url, alt: item.alt || product.title });
    };
    (state.galleryImages || product.images || []).forEach(add);
    (product.variants || []).forEach(variant => add({ url: variant.image, alt: variant.imageAlt }));
    return items;
  })();
  let selected = initial;
  let intent = Object.fromEntries((selected.selectedOptions || []).map(option => [option.name, option.value]));
  let activeImageIndex = Math.max(0, galleryImages.findIndex(item => image && item.url === image.src));
  let zoomScale = 1;
  const measurement = window.DudeMerchMeasurement;

  function money(value) { return value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currencyCode }).format(Number(value.amount)) : ''; }
  function mockupNote(item) { return /\bmockup\b/i.test(String(item && item.alt || '')) ? 'Product mockup' : ''; }
  function indexFor(item) { return galleryImages.findIndex(candidate => candidate.url === item.url); }
  function showImage(itemOrIndex) {
    const nextIndex = typeof itemOrIndex === 'number' ? itemOrIndex : indexFor(itemOrIndex);
    if (!image || nextIndex < 0 || !galleryImages[nextIndex]) return;
    activeImageIndex = nextIndex;
    const item = galleryImages[activeImageIndex];
    image.src = item.url;
    image.alt = item.alt || product.title;
    if (imageOpen) imageOpen.setAttribute('aria-label', `Enlarge image ${activeImageIndex + 1} of ${galleryImages.length}: ${item.alt || product.title}`);
    if (imageNote) imageNote.textContent = mockupNote(item);
    if (galleryButtons) Array.from(galleryButtons.children).forEach(button => button.setAttribute('aria-current', String(Number(button.attrs ? button.attrs['data-gallery-index'] : button.dataset.galleryIndex) === activeImageIndex)));
  }
  function applyZoom() {
    if (!zoomImage || !zoomImageButton) return;
    zoomImage.style.setProperty('--zoom-scale', zoomScale.toFixed(4));
    zoomImage.style.setProperty('--zoom-x', '0px');
    zoomImage.style.setProperty('--zoom-y', '0px');
    const magnified = zoomScale > 1.01;
    zoomImageButton.classList.toggle('is-magnified', magnified);
    zoomImageButton.setAttribute('aria-pressed', String(magnified));
    if (zoomLevel) { zoomLevel.value = `${Math.round(zoomScale * 100)}%`; zoomLevel.textContent = zoomLevel.value; }
  }
  function setZoom(nextScale) {
    zoomScale = Math.min(4, Math.max(1, nextScale));
    applyZoom();
  }
  function showZoomImage(nextIndex) {
    if (!galleryImages.length) return;
    showImage((nextIndex + galleryImages.length) % galleryImages.length);
    const item = galleryImages[activeImageIndex];
    setZoom(1);
    if (zoomImage) { zoomImage.src = item.url; zoomImage.alt = `${product.title} — ${item.alt || `image ${activeImageIndex + 1}`}`; }
    if (zoomTitle) zoomTitle.textContent = `${product.title} — ${item.alt || `Image ${activeImageIndex + 1}`}`;
    if (zoomCounter) zoomCounter.textContent = `${String(activeImageIndex + 1).padStart(2, '0')} / ${String(galleryImages.length).padStart(2, '0')}`;
  }
  function openZoom() {
    if (!zoomDialog || !galleryImages.length) return;
    showZoomImage(activeImageIndex);
    document.body?.classList.add('product-zoom-open');
    zoomDialog.showModal();
    document.getElementById('product-page-zoom-close')?.focus();
  }
  function variantForIntent() { return product.variants.find(variant => (variant.selectedOptions || []).every(option => intent[option.name] === option.value)) || null; }
  function reachableVariant(optionName, value) {
    const exact = product.variants.find(variant => variant.available && (variant.selectedOptions || []).every(option => option.name === optionName ? option.value === value : intent[option.name] === option.value));
    return exact || product.variants.find(variant => variant.available && (variant.selectedOptions || []).some(option => option.name === optionName && option.value === value)) || null;
  }
  function setUrl(variant, replace) {
    const id = numericId(variant); if (!id) return;
    const url = new URL(window.location.href); url.searchParams.set('variant', id);
    history[replace ? 'replaceState' : 'pushState']({ variant: id }, '', url.pathname + url.search + url.hash);
  }
  function render(push) {
    selected = variantForIntent() || selected;
    if (!selected) return;
    if (push) setUrl(selected, false);
    price.textContent = money(selected.price);
    const displayImage = selected.image ? { url: selected.image, alt: selected.imageAlt } : galleryImages[0];
    if (displayImage) showImage(displayImage);
    availability.textContent = selected.available ? 'Available for secure online checkout.' : 'This option is currently sold out.';
    buy.disabled = !selected.available; buy.textContent = selected.available ? 'Checkout securely' : 'Sold out';
    optionsRoot.replaceChildren();
    (product.options || []).forEach(option => {
      const fieldset = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = option.name; fieldset.appendChild(legend);
      option.values.forEach(value => {
        const matches = product.variants.filter(variant => (variant.selectedOptions || []).some(item => item.name === option.name && item.value === value));
        const button = document.createElement('button'); button.type = 'button'; button.textContent = value; button.setAttribute('aria-pressed', String(intent[option.name] === value)); button.disabled = !matches.some(variant => variant.available);
        button.addEventListener('click', () => { const match = reachableVariant(option.name, value); if (!match) return; selected = match; intent = Object.fromEntries((match.selectedOptions || []).map(item => [item.name, item.value])); render(true); }); fieldset.appendChild(button);
      }); optionsRoot.appendChild(fieldset);
    });
  }
  buy.addEventListener('click', async () => {
    if (!selected || !selected.available) return;
    buy.disabled = true; buy.textContent = 'Opening secure checkout…';
    try {
      const response = await fetch('/api/shopify-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [{ merchandiseId: selected.id, quantity: 1 }], attribution: measurement?.currentAttribution() }) });
      const payload = await response.json();
      if (!response.ok || !payload.checkoutUrl) throw new Error('checkout unavailable');
      measurement?.addToCart(product, selected, 1);
      measurement?.beginCheckout([{ merchandiseId: selected.id, title: product.title, variantTitle: selected.title, price: selected.price.amount, currency: selected.price.currencyCode, quantity: 1 }]);
      window.location.assign(payload.checkoutUrl);
    } catch (error) { buy.disabled = false; buy.textContent = 'Try checkout again'; availability.textContent = 'Secure checkout is temporarily unavailable. Please try again.'; }
  });
  if (galleryButtons) Array.from(galleryButtons.children).forEach(button => button.addEventListener('click', () => showImage(Number(button.attrs ? button.attrs['data-gallery-index'] : button.dataset.galleryIndex))));
  imageOpen?.addEventListener('click', openZoom);
  document.getElementById('product-page-zoom-close')?.addEventListener('click', () => zoomDialog.close());
  document.getElementById('product-page-zoom-prev')?.addEventListener('click', () => showZoomImage(activeImageIndex - 1));
  document.getElementById('product-page-zoom-next')?.addEventListener('click', () => showZoomImage(activeImageIndex + 1));
  document.getElementById('product-page-zoom-in')?.addEventListener('click', () => setZoom(zoomScale * 1.35));
  document.getElementById('product-page-zoom-out')?.addEventListener('click', () => setZoom(zoomScale / 1.35));
  document.getElementById('product-page-zoom-reset')?.addEventListener('click', () => setZoom(1));
  zoomImageButton?.addEventListener('click', () => setZoom(zoomScale > 1.01 ? 1 : 2.5));
  zoomImageButton?.addEventListener('wheel', event => { event.preventDefault(); setZoom(zoomScale * Math.exp(-event.deltaY * 0.002)); }, { passive: false });
  zoomDialog?.addEventListener('click', event => { if (event.target === zoomDialog) zoomDialog.close(); });
  zoomDialog?.addEventListener('close', () => { document.body?.classList.remove('product-zoom-open'); setZoom(1); imageOpen?.focus(); });
  zoomDialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showZoomImage(activeImageIndex - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); showZoomImage(activeImageIndex + 1); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(zoomScale * 1.35); }
    else if (event.key === '-') { event.preventDefault(); setZoom(zoomScale / 1.35); }
    else if (event.key === '0') { event.preventDefault(); setZoom(1); }
  });
  window.addEventListener('popstate', () => { const id = new URL(window.location.href).searchParams.get('variant'); const match = product.variants.find(variant => numericId(variant) === id) || defaultVariant(); if (match) { selected = match; intent = Object.fromEntries((match.selectedOptions || []).map(item => [item.name, item.value])); render(false); } });
  window.addEventListener('pageshow', event => { if (event.persisted) render(false); });
  render(false);
  measurement?.viewItem(product, selected);
}());
