(function () {
  'use strict';
  const data = document.getElementById('product-data');
  if (!data) return;
  const state = JSON.parse(data.textContent);
  const product = state.product;
  const optionsRoot = document.getElementById('product-options');
  const price = document.getElementById('product-price');
  const image = document.getElementById('product-image');
  const availability = document.getElementById('product-availability');
  const buy = document.getElementById('product-buy');
  const numericId = variant => (String(variant && variant.id || '').match(/(?:^|\/)(\d+)$/) || [])[1];
  const defaultVariant = () => (product.variants || []).find(variant => variant.available) || product.variants[0] || null;
  const initial = (product.variants || []).find(variant => numericId(variant) === String(state.selectedVariantId)) || defaultVariant();
  let selected = initial;
  let intent = Object.fromEntries((selected.selectedOptions || []).map(option => [option.name, option.value]));

  function money(value) { return value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currencyCode }).format(Number(value.amount)) : ''; }
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
    const displayImage = selected.image ? { url: selected.image, alt: selected.imageAlt } : (product.images || []).find(item => item && item.url);
    if (displayImage) { image.src = displayImage.url; image.alt = displayImage.alt || product.title; }
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
      const response = await fetch('/api/shopify-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: [{ merchandiseId: selected.id, quantity: 1 }] }) });
      const payload = await response.json(); if (!response.ok || !payload.checkoutUrl) throw new Error('checkout unavailable'); window.location.assign(payload.checkoutUrl);
    } catch (error) { buy.disabled = false; buy.textContent = 'Try checkout again'; availability.textContent = 'Secure checkout is temporarily unavailable. Please try again.'; }
  });
  window.addEventListener('popstate', () => { const id = new URL(window.location.href).searchParams.get('variant'); const match = product.variants.find(variant => numericId(variant) === id) || defaultVariant(); if (match) { selected = match; intent = Object.fromEntries((match.selectedOptions || []).map(item => [item.name, item.value])); render(false); } });
  render(false);
}());
