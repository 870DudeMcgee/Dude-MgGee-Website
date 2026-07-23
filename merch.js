/* ============================================================
   Dude McGee — Merch
   Shopify connection lives in Vercel serverless functions.
   This file NEVER touches the Shopify token — it talks to
   /api/catalog (GET products) and /api/shopify-cart (checkout).
   ============================================================ */

const CART_STORAGE_KEY = "dude-mcgee-shopify-cart-v1";

/* ============== Helpers ============== */

function formatPrice(amount, currencyCode) {
  if (!amount) return "";
  const n = parseFloat(amount);
  if (currencyCode === "USD") return `$${n.toFixed(2)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(n);
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isShopifyVariantId(value) {
  return /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(String(value || ""));
}

/* ============== Product Fetching (via /api/catalog) ============== */

async function fetchProducts() {
  const res = await fetch("/api/catalog", { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Catalog endpoint returned ${res.status}`);
  }
  const payload = await res.json();

  if (!payload.ok) {
    throw new Error(payload.message || "Failed to load products");
  }

  return payload.products || [];
}

/* ============== Cart (localStorage-backed) ============== */

const Cart = {
  items: [],
  listeners: [],

  init() {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      this.items = Array.isArray(parsed)
        ? parsed.filter(item =>
            item &&
            isShopifyVariantId(item.variantId) &&
            isShopifyVariantId(item.merchandiseId) &&
            Number.isFinite(Number(item.quantity)) &&
            Number.isFinite(Number(item.price))
          ).map(item => ({
            ...item,
            quantity: Math.max(1, Math.min(99, Number(item.quantity))),
          }))
        : [];
    } catch {
      this.items = [];
    }
  },

  save() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch {}
    this.listeners.forEach(fn => fn());
  },

  onChange(fn) {
    this.listeners.push(fn);
  },

  add(variantId, merchandiseId, product, variantData) {
    const existing = this.items.find(i => i.variantId === variantId);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        variantId,
        merchandiseId, // gid://shopify/ProductVariant/... (needed for cart API)
        title: product.title,
        variantTitle: variantData.title !== "Default Title" ? variantData.title : null,
        price: variantData.price.amount,
        currency: variantData.price.currencyCode,
        image: variantData.image || product.images[0]?.url || "",
        quantity: 1,
      });
    }
    this.save();
  },

  setQuantity(variantId, qty) {
    const item = this.items.find(i => i.variantId === variantId);
    if (!item) return;
    item.quantity = Math.max(1, qty);
    this.save();
  },

  remove(variantId) {
    this.items = this.items.filter(i => i.variantId !== variantId);
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  },

  subtotal() {
    return this.items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
  },

  isEmpty() {
    return this.items.length === 0;
  },
};

/* ============== Checkout (via /api/shopify-cart) ============== */

async function checkout() {
  if (Cart.isEmpty()) return;

  const checkoutBtn = document.getElementById("cart-checkout");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Connecting to checkout…";
  }

  const lines = Cart.items.map(i => ({
    merchandiseId: i.merchandiseId,
    quantity: i.quantity,
  }));

  try {
    const res = await fetch("/api/shopify-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ lines }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok || !result.checkoutUrl) {
      throw new Error(result.message || "Shopify could not prepare checkout.");
    }

    Cart.clear();
    window.location.href = result.checkoutUrl;
  } catch (err) {
    console.error("[merch] Checkout failed:", err);
    alert("Couldn't reach checkout. Please try again.");
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Checkout ↗";
    }
  }
}

/* ============== Cart Drawer UI ============== */

function openCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  if (drawer) { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); }
  if (overlay) overlay.classList.add("is-visible");
  document.body.classList.add("cart-open");
}

function closeCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  if (drawer) { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); }
  if (overlay) overlay.classList.remove("is-visible");
  document.body.classList.remove("cart-open");
}

function renderCart() {
  const list = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const checkoutBtn = document.getElementById("cart-checkout");
  const countBadge = document.getElementById("cart-toggle-count");
  const emptyMsg = document.getElementById("cart-empty");
  const footer = document.getElementById("cart-footer");

  if (!list) return;

  const count = Cart.count();
  if (countBadge) {
    countBadge.textContent = count;
    countBadge.style.display = count > 0 ? "inline-grid" : "none";
  }

  if (Cart.isEmpty()) {
    list.innerHTML = "";
    if (emptyMsg) emptyMsg.hidden = false;
    if (footer) footer.hidden = true;
    if (subtotalEl) subtotalEl.textContent = "$0.00";
    return;
  }

  if (emptyMsg) emptyMsg.hidden = true;
  if (footer) footer.hidden = false;

  list.innerHTML = "";
  Cart.items.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const imgHtml = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">`
      : `<div class="cart-item-noimg">DM</div>`;

    const variantLabel = item.variantTitle ? ` · ${escapeHtml(item.variantTitle)}` : "";
    const safeVariantId = escapeHtml(item.variantId);

    row.innerHTML = `
      <div class="cart-item-img">${imgHtml}</div>
      <div class="cart-item-info">
        <p class="cart-item-title">${escapeHtml(item.title)}${variantLabel}</p>
        <p class="cart-item-price">${formatPrice(item.price, item.currency)}</p>
        <div class="cart-item-controls">
          <button class="qty-btn" data-action="dec" data-id="${safeVariantId}" aria-label="Decrease quantity">−</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-id="${safeVariantId}" aria-label="Increase quantity">+</button>
          <button class="cart-item-remove" data-action="remove" data-id="${safeVariantId}" aria-label="Remove item">Remove</button>
        </div>
      </div>
    `;
    list.appendChild(row);
  });

  if (subtotalEl) {
    subtotalEl.textContent = formatPrice(Cart.subtotal().toFixed(2), "USD");
  }
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function updatePriceForVariant(body, variant) {
  const priceEl = body.querySelector(".product-price");
  if (!priceEl || !variant) return;
  priceEl.textContent = formatPrice(variant.price.amount, variant.price.currencyCode);

  const compareEl = body.querySelector(".product-compare");
  if (variant.compareAtPrice && parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount)) {
    if (compareEl) {
      compareEl.textContent = formatPrice(variant.compareAtPrice.amount, variant.compareAtPrice.currencyCode);
    } else {
      const newCompare = document.createElement("span");
      newCompare.className = "product-compare";
      newCompare.textContent = formatPrice(variant.compareAtPrice.amount, variant.compareAtPrice.currencyCode);
      priceEl.after(newCompare);
    }
  } else if (compareEl) {
    compareEl.remove();
  }
}

/* ============== Product Card Rendering ============== */

function renderProductCard(product, index) {
  const card = document.createElement("article");
  card.className = "product-card reveal";

  const img = product.images && product.images[0];
  const hasImg = img && img.url;
  const isSoldout = !product.availableForSale;

  const minPrice = product.priceRange?.minVariantPrice;
  const maxPrice = product.priceRange?.maxVariantPrice;
  const isMultiPrice = product.isMultiPrice || (minPrice && maxPrice && parseFloat(minPrice.amount) !== parseFloat(maxPrice.amount));

  let selectedVariantId = null;
  let selectedMerchandiseId = null;
  const hasVariants = product.variants && product.variants.length > 1;

  const firstAvailable = product.variants.find(v => v.available) || product.variants[0];
  if (firstAvailable) {
    selectedVariantId = firstAvailable.id;
    selectedMerchandiseId = firstAvailable.id; // gid://shopify/ProductVariant/...
  }

  /* --- Image --- */
  const imgWrap = document.createElement("div");
  imgWrap.className = "product-image-wrap";

  if (hasImg) {
    const imgEl = document.createElement("img");
    imgEl.src = img.url;
    imgEl.alt = img.alt || product.title;
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgWrap.appendChild(imgEl);
  } else {
    const noImg = document.createElement("div");
    noImg.className = "product-no-image";
    noImg.textContent = "DM";
    imgWrap.appendChild(noImg);
  }

  if (isSoldout) {
    const tag = document.createElement("span");
    tag.className = "product-tag is-soldout";
    tag.textContent = "Sold out";
    imgWrap.appendChild(tag);
  } else if (product.hasCompare) {
    const tag = document.createElement("span");
    tag.className = "product-tag";
    tag.textContent = "Sale";
    imgWrap.appendChild(tag);
  }

  const idx = document.createElement("span");
  idx.className = "product-index";
  idx.textContent = String(index + 1).padStart(2, "0");
  imgWrap.appendChild(idx);

  /* --- Body --- */
  const body = document.createElement("div");
  body.className = "product-body";

  const title = document.createElement("h3");
  title.className = "product-title";
  title.textContent = product.title;
  body.appendChild(title);

  if (product.vendor) {
    const vendor = document.createElement("p");
    vendor.className = "product-vendor";
    vendor.textContent = product.vendor;
    body.appendChild(vendor);
  }

  if (product.description) {
    const desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = stripHtml(product.description);
    if (desc.textContent.length > 130) desc.textContent = desc.textContent.slice(0, 127).trim() + "…";
    body.appendChild(desc);
  }

  /* --- Variant selector --- */
  if (hasVariants) {
    const variantsWrap = document.createElement("div");
    variantsWrap.className = "product-variants";
    product.variants.forEach(v => {
      const pill = document.createElement("button");
      pill.className = "variant-pill";
      if (!v.available) pill.classList.add("is-unavailable");
      if (v.id === selectedVariantId) pill.classList.add("is-selected");
      pill.textContent = v.title;
      pill.type = "button";
      pill.disabled = !v.available;
      pill.addEventListener("click", () => {
        if (!v.available) return;
        selectedVariantId = v.id;
        selectedMerchandiseId = v.id;
        variantsWrap.querySelectorAll(".variant-pill").forEach(p => p.classList.remove("is-selected"));
        pill.classList.add("is-selected");
        updatePriceForVariant(body, v);
      });
      variantsWrap.appendChild(pill);
    });
    body.appendChild(variantsWrap);
  }

  /* --- Price row --- */
  const priceRow = document.createElement("div");
  priceRow.className = "product-price-row";

  const price = document.createElement("span");
  price.className = "product-price";
  if (isMultiPrice) {
    price.innerHTML = `<span class="product-from">From </span>${formatPrice(minPrice.amount, minPrice.currencyCode)}`;
  } else {
    price.textContent = formatPrice(minPrice?.amount, minPrice?.currencyCode);
  }
  priceRow.appendChild(price);

  if (product.hasCompare) {
    const compare = document.createElement("span");
    compare.className = "product-compare";
    compare.textContent = formatPrice(product.compareAt.amount, product.compareAt.currencyCode);
    priceRow.appendChild(compare);
  }

  body.appendChild(priceRow);

  /* --- Add to cart button --- */
  const buyBtn = document.createElement("button");
  buyBtn.className = "product-buy";
  buyBtn.type = "button";
  if (isSoldout) {
    buyBtn.disabled = true;
    buyBtn.textContent = "Sold out";
  } else {
    buyBtn.textContent = "Add to cart";
    buyBtn.addEventListener("click", () => {
      const variantId = selectedVariantId || product.variants[0]?.id;
      const merchandiseId = selectedMerchandiseId || product.variants[0]?.id;
      if (!variantId) return;
      const variantData = product.variants.find(v => v.id === variantId) || product.variants[0];
      Cart.add(variantId, merchandiseId, product, variantData);
      openCart();
    });
  }
  body.appendChild(buyBtn);

  card.appendChild(imgWrap);
  card.appendChild(body);
  return card;
}

/* ============== Init ============== */

async function initMerch() {
  Cart.init();

  // Wire up cart drawer
  const cartToggle = document.getElementById("cart-toggle");
  const cartClose = document.getElementById("cart-close");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartItems = document.getElementById("cart-items");
  const checkoutBtn = document.getElementById("cart-checkout");

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", checkout);

  // Delegate qty/remove
  if (cartItems) {
    cartItems.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const item = Cart.items.find(i => i.variantId === id);
      if (!item) return;
      if (action === "inc") {
        Cart.setQuantity(id, item.quantity + 1);
      } else if (action === "dec") {
        if (item.quantity <= 1) {
          Cart.remove(id);
        } else {
          Cart.setQuantity(id, item.quantity - 1);
        }
      } else if (action === "remove") {
        Cart.remove(id);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  Cart.onChange(renderCart);
  renderCart();

  // Fetch products
  const grid = document.getElementById("product-grid");
  const unavailable = document.getElementById("merch-unavailable");

  try {
    const products = await fetchProducts();
    grid.innerHTML = "";
    grid.setAttribute("aria-busy", "false");

    if (!products.length) {
      grid.hidden = true;
      unavailable.hidden = false;
      return;
    }

    products.forEach((product, i) => {
      grid.appendChild(renderProductCard(product, i));
    });

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${Math.min(idx % 4, 3) * 90}ms`;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      grid.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
    } else {
      grid.querySelectorAll(".reveal").forEach(el => el.classList.add("is-visible"));
    }

  } catch (err) {
    console.error("[merch] Failed to load products:", err);
    grid.innerHTML = "";
    grid.setAttribute("aria-busy", "false");
    unavailable.hidden = false;
    const p = unavailable.querySelector("p");
    if (p) {
      p.innerHTML = "Couldn't reach the store right now. Please try again later, or visit the <a href=\"https://www.youtube.com/channel/UChkXhEVitGopkXbgdpUxeBA?sub_confirmation=1\" target=\"_blank\" rel=\"noreferrer\">YouTube channel</a> for updates.";
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMerch);
} else {
  initMerch();
}
