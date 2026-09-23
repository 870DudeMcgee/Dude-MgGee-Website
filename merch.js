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

function formatSignalPrice(amount, currencyCode) {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return "";
  if ((currencyCode || "USD") === "USD") {
    return Math.abs(n - Math.round(n)) < 0.001 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
  }
  return formatPrice(amount, currencyCode);
}

function artifactKind(product) {
  const text = `${product?.title || ""} ${product?.productType || ""}`.toLowerCase();
  if (/\b(hoodie|sweatshirt|pullover)\b/.test(text)) return "Pullover hoodie";
  if (/\b(hat|cap|beanie|trucker)\b/.test(text)) return "Trucker hat";
  if (/\b(coozie|koozie|cooler)\b/.test(text)) return "Can cooler";
  if (/\b(t[ -]?shirt|tee)\b/.test(text)) return "Unisex tee";
  return product?.productType || "";
}

function artifactColor(product) {
  const title = product?.title || "";
  const match = title.match(/\b(black|white)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function artifactMaterial(product) {
  const text = `${product?.description || ""}`.toLowerCase();
  const bits = [];
  if (/foam-front|foam front/.test(text)) bits.push("Foam front");
  if (/mesh back/.test(text)) bits.push("Mesh back");
  if (/insulating/.test(text)) bits.push("Insulating");
  return bits.join(" / ");
}

function artifactOrder(product) {
  const text = `${product?.description || ""}`.toLowerCase();
  if (/printed to order|made to order/.test(text)) return "Printed to order";
  return "";
}

function artifactFit(product) {
  const text = `${product?.description || ""}`.toLowerCase();
  if (/one size/.test(text)) return "One size";
  if (/unisex/.test(text)) return "Unisex";
  return "";
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

function getImageViewLabel(image, index) {
  const url = String(image?.url || "").toLowerCase();
  if (url.includes("front-and-back")) return "Front and back";
  if (url.includes("-back-")) return "Back";
  if (url.includes("-left-")) return "Left side";
  if (url.includes("-right-")) return "Right side";
  if (url.includes("-front-")) return index === 0 ? "Front" : "Front detail";
  return `View ${index + 1}`;
}

const ImageZoom = {
  MIN_SCALE: 1,
  MAX_SCALE: 4,
  CLICK_SCALE: 2.5,
  dialog: null,
  imageButton: null,
  image: null,
  title: null,
  counter: null,
  level: null,
  images: [],
  productTitle: "",
  activeIndex: 0,
  returnFocus: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  pointers: new Map(),
  gesture: null,
  suppressClick: false,

  init() {
    this.dialog = document.getElementById("product-zoom");
    this.imageButton = document.getElementById("product-zoom-image-button");
    this.image = document.getElementById("product-zoom-image");
    this.title = document.getElementById("product-zoom-title");
    this.counter = document.getElementById("product-zoom-counter");
    this.level = document.getElementById("product-zoom-level");
    if (!this.dialog || !this.imageButton || !this.image || !this.title || !this.counter) return;

    document.getElementById("product-zoom-close")?.addEventListener("click", () => this.close());
    document.getElementById("product-zoom-prev")?.addEventListener("click", () => this.show(this.activeIndex - 1));
    document.getElementById("product-zoom-next")?.addEventListener("click", () => this.show(this.activeIndex + 1));
    document.getElementById("product-zoom-in")?.addEventListener("click", () => this.zoomBy(1.35));
    document.getElementById("product-zoom-out")?.addEventListener("click", () => this.zoomBy(1 / 1.35));
    document.getElementById("product-zoom-reset")?.addEventListener("click", () => this.resetTransform());

    this.imageButton.addEventListener("click", event => {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (this.scale > this.MIN_SCALE) {
        this.resetTransform();
      } else {
        this.setScaleAt(this.CLICK_SCALE, event.clientX, event.clientY);
      }
    });

    this.imageButton.addEventListener("wheel", event => {
      event.preventDefault();
      this.setScaleAt(this.scale * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
    }, { passive: false });

    this.imageButton.addEventListener("pointerdown", event => this.onPointerDown(event));
    this.imageButton.addEventListener("pointermove", event => this.onPointerMove(event));
    this.imageButton.addEventListener("pointerup", event => this.onPointerEnd(event));
    this.imageButton.addEventListener("pointercancel", event => this.onPointerEnd(event));
    this.image.addEventListener("load", () => this.resetTransform());
    window.addEventListener("resize", () => {
      if (this.dialog?.open) this.applyTransform();
    });

    this.dialog.addEventListener("click", event => {
      if (event.target === this.dialog) this.close();
    });

    this.dialog.addEventListener("close", () => {
      document.body.classList.remove("product-zoom-open");
      this.resetTransform();
      this.pointers.clear();
      this.returnFocus?.focus();
      this.returnFocus = null;
    });

    this.dialog.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.show(this.activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        this.show(this.activeIndex + 1);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        this.zoomBy(1.35);
      } else if (event.key === "-") {
        event.preventDefault();
        this.zoomBy(1 / 1.35);
      } else if (event.key === "0") {
        event.preventDefault();
        this.resetTransform();
      }
    });
  },

  clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  },

  midpoint(first, second) {
    return {
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2,
    };
  },

  distance(first, second) {
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  },

  getBounds(scale = this.scale) {
    return {
      x: Math.max(0, (this.image.offsetWidth * scale - this.imageButton.clientWidth) / 2),
      y: Math.max(0, (this.image.offsetHeight * scale - this.imageButton.clientHeight) / 2),
    };
  },

  applyTransform() {
    const bounds = this.getBounds();
    this.offsetX = this.clamp(this.offsetX, -bounds.x, bounds.x);
    this.offsetY = this.clamp(this.offsetY, -bounds.y, bounds.y);
    this.image.style.setProperty("--zoom-scale", this.scale.toFixed(4));
    this.image.style.setProperty("--zoom-x", `${this.offsetX.toFixed(2)}px`);
    this.image.style.setProperty("--zoom-y", `${this.offsetY.toFixed(2)}px`);

    const magnified = this.scale > this.MIN_SCALE + 0.01;
    this.imageButton.classList.toggle("is-magnified", magnified);
    this.imageButton.classList.toggle("is-dragging", this.pointers.size > 0 && magnified);
    this.imageButton.setAttribute("aria-pressed", String(magnified));
    this.imageButton.setAttribute(
      "aria-label",
      magnified ? "Zoomed product image. Drag to move; activate to reset zoom." : "Product image. Activate to zoom."
    );
    if (this.level) this.level.value = `${Math.round(this.scale * 100)}%`;
  },

  resetTransform() {
    this.scale = this.MIN_SCALE;
    this.offsetX = 0;
    this.offsetY = 0;
    this.gesture = null;
    this.applyTransform();
  },

  setScaleAt(nextScale, clientX, clientY) {
    const newScale = this.clamp(nextScale, this.MIN_SCALE, this.MAX_SCALE);
    const rect = this.imageButton.getBoundingClientRect();
    const focalX = Number.isFinite(clientX) ? clientX - (rect.left + rect.width / 2) : 0;
    const focalY = Number.isFinite(clientY) ? clientY - (rect.top + rect.height / 2) : 0;
    const ratio = newScale / this.scale;

    this.offsetX = focalX - (focalX - this.offsetX) * ratio;
    this.offsetY = focalY - (focalY - this.offsetY) * ratio;
    this.scale = newScale;
    if (this.scale === this.MIN_SCALE) {
      this.offsetX = 0;
      this.offsetY = 0;
    }
    this.applyTransform();
  },

  zoomBy(factor) {
    const rect = this.imageButton.getBoundingClientRect();
    this.setScaleAt(this.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  },

  beginGesture() {
    const activePointers = [...this.pointers.values()];
    if (activePointers.length >= 2) {
      this.gesture = {
        type: "pinch",
        distance: Math.max(1, this.distance(activePointers[0], activePointers[1])),
        midpoint: this.midpoint(activePointers[0], activePointers[1]),
        scale: this.scale,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      };
    } else if (activePointers.length === 1) {
      this.gesture = {
        type: "pan",
        x: activePointers[0].clientX,
        y: activePointers[0].clientY,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      };
    }
  },

  onPointerDown(event) {
    this.imageButton.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, event);
    this.suppressClick = false;
    this.beginGesture();
    this.applyTransform();
  },

  onPointerMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.set(event.pointerId, event);
    const activePointers = [...this.pointers.values()];

    if (activePointers.length >= 2 && this.gesture?.type === "pinch") {
      event.preventDefault();
      const midpoint = this.midpoint(activePointers[0], activePointers[1]);
      const nextScale = this.clamp(
        this.gesture.scale * (this.distance(activePointers[0], activePointers[1]) / this.gesture.distance),
        this.MIN_SCALE,
        this.MAX_SCALE
      );
      const ratio = nextScale / this.gesture.scale;
      const rect = this.imageButton.getBoundingClientRect();
      const startX = this.gesture.midpoint.x - (rect.left + rect.width / 2);
      const startY = this.gesture.midpoint.y - (rect.top + rect.height / 2);
      const currentX = midpoint.x - (rect.left + rect.width / 2);
      const currentY = midpoint.y - (rect.top + rect.height / 2);
      this.scale = nextScale;
      this.offsetX = currentX - (startX - this.gesture.offsetX) * ratio;
      this.offsetY = currentY - (startY - this.gesture.offsetY) * ratio;
      this.suppressClick = true;
      this.applyTransform();
    } else if (activePointers.length === 1 && this.gesture?.type === "pan" && this.scale > this.MIN_SCALE) {
      const deltaX = activePointers[0].clientX - this.gesture.x;
      const deltaY = activePointers[0].clientY - this.gesture.y;
      if (Math.hypot(deltaX, deltaY) > 4) this.suppressClick = true;
      this.offsetX = this.gesture.offsetX + deltaX;
      this.offsetY = this.gesture.offsetY + deltaY;
      this.applyTransform();
    }
  },

  onPointerEnd(event) {
    this.pointers.delete(event.pointerId);
    this.imageButton.releasePointerCapture?.(event.pointerId);
    this.beginGesture();
    this.applyTransform();
  },

  open(images, activeIndex, productTitle, trigger) {
    if (!this.dialog || !images.length) return;
    this.images = images;
    this.productTitle = productTitle;
    this.returnFocus = trigger;
    this.show(activeIndex);
    document.body.classList.add("product-zoom-open");
    this.dialog.showModal();
    document.getElementById("product-zoom-close")?.focus();
  },

  show(nextIndex) {
    if (!this.images.length) return;
    this.activeIndex = (nextIndex + this.images.length) % this.images.length;
    const activeImage = this.images[this.activeIndex];
    const viewLabel = getImageViewLabel(activeImage, this.activeIndex);
    this.resetTransform();
    this.image.src = activeImage.url;
    this.image.alt = `${this.productTitle} — ${viewLabel}`;
    this.title.textContent = `${this.productTitle} — ${viewLabel}`;
    this.counter.textContent = `${String(this.activeIndex + 1).padStart(2, "0")} / ${String(this.images.length).padStart(2, "0")}`;
  },

  close() {
    if (this.dialog?.open) this.dialog.close();
  },
};

const ProductDetails = {
  dialog: null,
  title: null,
  description: null,
  vendor: null,
  imageWrap: null,
  image: null,
  returnFocus: null,

  init() {
    this.dialog = document.getElementById("product-details");
    this.title = document.getElementById("product-details-title");
    this.description = document.getElementById("product-details-description");
    this.vendor = document.getElementById("product-details-vendor");
    this.imageWrap = document.getElementById("product-details-image-wrap");
    this.image = document.getElementById("product-details-image");
    if (!this.dialog || !this.title || !this.description || !this.imageWrap || !this.image) return;

    document.getElementById("product-details-close")?.addEventListener("click", () => this.close());
    document.getElementById("product-details-continue")?.addEventListener("click", () => this.close());
    this.dialog.addEventListener("click", event => {
      if (event.target === this.dialog) this.close();
    });
    this.dialog.addEventListener("close", () => {
      document.body.classList.remove("product-details-open");
      this.returnFocus?.focus();
      this.returnFocus = null;
    });
  },

  open(product, trigger, selectedVariantId) {
    if (!this.dialog) return;
    const firstImage = (product.images || []).find(image => image && image.url);
    this.title.textContent = product.title;
    this.description.textContent = stripHtml(product.description) || "More product information is coming soon.";
    this.vendor.textContent = product.vendor || "Official Dude McGee merchandise";
    this.returnFocus = trigger;

    if (firstImage) {
      this.image.src = firstImage.url;
      this.image.alt = firstImage.alt || product.title;
      this.imageWrap.hidden = false;
    } else {
      this.image.removeAttribute("src");
      this.image.alt = "";
      this.imageWrap.hidden = true;
    }

    document.body.classList.add("product-details-open");
    this.dialog.showModal();
    const viewedVariant = (product.variants || []).find(variant => variant.id === selectedVariantId) || (product.variants || []).find(variant => variant.available) || product.variants?.[0];
    window.DudeMerchMeasurement?.viewItem(product, viewedVariant);
    document.getElementById("product-details-close")?.focus();
  },

  close() {
    if (this.dialog?.open) this.dialog.close();
  },
};

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
        color: variantData.color || null,
        form: variantData.form || null,
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
  const checkoutItems = Cart.items.map(item => ({ ...item }));

  try {
    const res = await fetch("/api/shopify-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ lines, attribution: window.DudeMerchMeasurement?.currentAttribution() }),
    });

    const result = await res.json();

    if (!res.ok || !result.ok || !result.checkoutUrl) {
      throw new Error(result.message || "Shopify could not prepare checkout.");
    }

    window.DudeMerchMeasurement?.beginCheckout(checkoutItems);
    window.location.href = result.checkoutUrl;
  } catch (err) {
    console.error("[merch] Checkout failed:", err);
    alert("Couldn't reach checkout. Please try again.");
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Complete transmission →";
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
  const queueCount = document.getElementById("cart-queue-count");
  if (countBadge) {
    countBadge.textContent = count;
    countBadge.style.display = count > 0 ? "inline-grid" : "none";
  }
  if (queueCount) queueCount.textContent = String(Cart.items.length).padStart(2, "0");

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
  Cart.items.forEach((item, itemIndex) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const imgHtml = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">`
      : `<div class="cart-item-noimg">DM</div>`;

    const spec = [item.color, item.variantTitle].filter(Boolean).join(" / ");
    const safeVariantId = escapeHtml(item.variantId);

    row.innerHTML = `
      <span class="cart-item-num">${String(itemIndex + 1).padStart(2, "0")}</span>
      <div class="cart-item-img">${imgHtml}</div>
      <div class="cart-item-info">
        <p class="cart-item-title">${escapeHtml(item.title)}</p>
        ${spec ? `<p class="cart-item-spec">${escapeHtml(spec)}</p>` : ""}
        <p class="cart-item-price">${formatSignalPrice(item.price, item.currency)}</p>
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
    subtotalEl.textContent = formatSignalPrice(Cart.subtotal().toFixed(2), "USD");
  }
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function updatePriceForVariant(body, variant) {
  const priceEl = body.querySelector(".product-price");
  if (!priceEl || !variant) return;
  priceEl.textContent = formatSignalPrice(variant.price.amount, variant.price.currencyCode);

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

function renderProductCard(product, index, total) {
  const card = document.createElement("article");
  card.className = "product-card artifact-card is-pending";
  card.style.setProperty("--card-i", String(index % 4));

  const productImages = (product.images || []).filter(image => image && image.url);
  const hasImg = productImages.length > 0;
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
  const gallery = document.createElement("div");
  gallery.className = "product-gallery";

  const imgWrap = document.createElement("div");
  imgWrap.className = "product-image-wrap";

  if (hasImg) {
    let activeImageIndex = productImages.findIndex(image =>
      String(image.url).toLowerCase().includes("front-and-back")
    );
    if (activeImageIndex < 0) activeImageIndex = 0;

    const zoomButton = document.createElement("button");
    zoomButton.className = "product-image-zoom";
    zoomButton.type = "button";

    const imgEl = document.createElement("img");
    const counter = document.createElement("span");
    counter.className = "product-image-counter";
    counter.setAttribute("aria-live", "polite");

    const thumbnails = document.createElement("div");
    thumbnails.className = "product-thumbnails";
    thumbnails.setAttribute("aria-label", `${product.title} product views`);

    const showImage = nextIndex => {
      activeImageIndex = (nextIndex + productImages.length) % productImages.length;
      const activeImage = productImages[activeImageIndex];
      const viewLabel = getImageViewLabel(activeImage, activeImageIndex);
      imgWrap.classList.remove("is-scanning");
      void imgWrap.offsetWidth;
      imgWrap.classList.add("is-scanning");
      imgEl.src = activeImage.url;
      imgEl.alt = `${product.title} — ${viewLabel}`;
      zoomButton.setAttribute("aria-label", `Enlarge ${viewLabel.toLowerCase()} view of ${product.title}`);
      counter.textContent = `${String(activeImageIndex + 1).padStart(2, "0")} / ${String(productImages.length).padStart(2, "0")}`;
      thumbnails.querySelectorAll(".product-thumbnail").forEach((button, buttonIndex) => {
        const selected = buttonIndex === activeImageIndex;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    };

    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    zoomButton.appendChild(imgEl);
    zoomButton.addEventListener("click", () => {
      ImageZoom.open(productImages, activeImageIndex, product.title, zoomButton);
    });
    imgWrap.appendChild(zoomButton);

    const zoomHint = document.createElement("span");
    zoomHint.className = "product-zoom-hint";
    zoomHint.setAttribute("aria-hidden", "true");
    zoomHint.textContent = "⊕ Enlarge";
    imgWrap.appendChild(zoomHint);

    if (productImages.length > 1) {
      const previous = document.createElement("button");
      previous.className = "product-gallery-arrow product-gallery-arrow-prev";
      previous.type = "button";
      previous.setAttribute("aria-label", `Previous image of ${product.title}`);
      previous.textContent = "←";
      previous.addEventListener("click", () => showImage(activeImageIndex - 1));

      const next = document.createElement("button");
      next.className = "product-gallery-arrow product-gallery-arrow-next";
      next.type = "button";
      next.setAttribute("aria-label", `Next image of ${product.title}`);
      next.textContent = "→";
      next.addEventListener("click", () => showImage(activeImageIndex + 1));

      imgWrap.appendChild(previous);
      imgWrap.appendChild(next);
      imgWrap.appendChild(counter);

      productImages.forEach((image, imageIndex) => {
        const viewLabel = getImageViewLabel(image, imageIndex);
        const button = document.createElement("button");
        button.className = "product-thumbnail";
        button.type = "button";
        button.setAttribute("aria-label", `Show ${viewLabel.toLowerCase()} view of ${product.title}`);
        button.setAttribute("aria-pressed", "false");
        button.title = viewLabel;

        const thumbnailImage = document.createElement("img");
        thumbnailImage.src = image.url;
        thumbnailImage.alt = "";
        thumbnailImage.loading = "lazy";
        thumbnailImage.decoding = "async";
        button.appendChild(thumbnailImage);
        button.addEventListener("click", () => showImage(imageIndex));
        thumbnails.appendChild(button);
      });
    }

    showImage(activeImageIndex);
    gallery.appendChild(imgWrap);
    if (productImages.length > 1) gallery.appendChild(thumbnails);
  } else {
    const noImg = document.createElement("div");
    noImg.className = "product-no-image";
    noImg.textContent = "DM";
    imgWrap.appendChild(noImg);
    gallery.appendChild(imgWrap);
  }

  if (isSoldout) {
    const tag = document.createElement("span");
    tag.className = "product-tag is-soldout";
    tag.textContent = "Signal lost";
    imgWrap.appendChild(tag);
  } else if (product.hasCompare) {
    const tag = document.createElement("span");
    tag.className = "product-tag";
    tag.textContent = "Sale";
    imgWrap.appendChild(tag);
  }

  const idx = document.createElement("span");
  idx.className = "product-index";
  idx.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  imgWrap.appendChild(idx);

  const color = artifactColor(product);
  const kind = artifactKind(product);
  const spec = document.createElement("p");
  spec.className = "artifact-spec";

  const writeSpec = variant => {
    const size = variant && variant.title && variant.title !== "Default Title" ? variant.title : "";
    spec.textContent = [color, size || kind].filter(Boolean).join(" / ");
  };
  writeSpec(firstAvailable);

  /* --- Body --- */
  const body = document.createElement("div");
  body.className = "product-body";
  body.appendChild(spec);

  const title = document.createElement("h3");
  title.className = "product-title";
  const titleButton = document.createElement("a");
  titleButton.className = "product-title-button";
  titleButton.textContent = product.title;
  titleButton.href = `/products/${encodeURIComponent(product.handle)}`;
  titleButton.href = window.DudeMerchMeasurement?.decorateProductUrl(titleButton.href) || titleButton.href;
  titleButton.setAttribute("aria-label", `View ${product.title}`);
  title.appendChild(titleButton);
  body.appendChild(title);

  const dossier = document.createElement("div");
  dossier.className = "artifact-dossier";
  const facts = [
    ["Artifact", String(index + 1).padStart(3, "0")],
    ["Status", isSoldout ? "Signal lost" : "Active"],
    ["Form", kind],
    ["Color", color],
    ["Material", artifactMaterial(product)],
    ["Fit", artifactFit(product)],
    ["Order", artifactOrder(product)],
    ["Transmission", "001"],
  ];
  facts.forEach(([label, value]) => {
    if (!value) return;
    const row = document.createElement("p");
    row.className = "artifact-fact";
    const name = document.createElement("span");
    name.textContent = label;
    const detail = document.createElement("span");
    detail.textContent = value;
    row.append(name, detail);
    dossier.appendChild(row);
  });
  body.appendChild(dossier);

  const detailsButton = document.createElement("button");
  detailsButton.className = "product-details-trigger";
  detailsButton.type = "button";
  detailsButton.textContent = "View full description →";
  detailsButton.setAttribute("aria-label", `View full description for ${product.title}`);
  detailsButton.addEventListener("click", () => ProductDetails.open(product, detailsButton, selectedVariantId));
  body.appendChild(detailsButton);

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
        pill.classList.remove("is-pulsed");
        void pill.offsetWidth;
        pill.classList.add("is-pulsed");
        writeSpec(v);
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
    price.innerHTML = `<span class="product-from">From </span>${formatSignalPrice(minPrice.amount, minPrice.currencyCode)}`;
  } else {
    price.textContent = formatSignalPrice(minPrice?.amount, minPrice?.currencyCode);
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
    buyBtn.textContent = "Signal lost";
    buyBtn.setAttribute("aria-label", `Sold out: ${product.title}`);
  } else {
    buyBtn.textContent = "/// Acquire →";
    buyBtn.setAttribute("aria-label", `Add ${product.title} to cart`);
    buyBtn.addEventListener("click", () => {
      const variantId = selectedVariantId || product.variants[0]?.id;
      const merchandiseId = selectedMerchandiseId || product.variants[0]?.id;
      if (!variantId) return;
      const variantData = product.variants.find(v => v.id === variantId) || product.variants[0];
      const before = Cart.count();
      Cart.add(variantId, merchandiseId, product, {
        ...variantData,
        color,
        form: kind,
      });
      window.DudeMerchMeasurement?.addToCart(product, variantData, 1);
      card.classList.add("is-acquired");
      window.setTimeout(() => card.classList.remove("is-acquired"), 700);
      const badge = document.getElementById("cart-toggle-count");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (badge && !reduce) badge.textContent = String(before);
      const done = window.DudeSignal?.transmit?.(buyBtn);
      Promise.resolve(done).then(() => {
        renderCart();
        openCart();
      }).catch(() => {
        renderCart();
        openCart();
      });
    });
  }
  body.appendChild(buyBtn);

  card.appendChild(gallery);
  card.appendChild(body);
  card.addEventListener("click", event => {
    if (event.target.closest("a, button")) return;
    card.classList.toggle("is-open");
  });
  return card;
}

/* ============== Init ============== */

async function initMerch() {
  Cart.init();
  ImageZoom.init();
  ProductDetails.init();

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
      grid.appendChild(renderProductCard(product, i, products.length));
    });
    document.dispatchEvent(new CustomEvent("dude:catalog", { detail: { products } }));

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${Math.min(idx % 4, 3) * 90}ms`;
            entry.target.classList.add("is-visible");
            window.setTimeout(() => entry.target.classList.remove("is-pending"), 520);
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      grid.querySelectorAll(".artifact-card").forEach(el => revealObserver.observe(el));
    } else {
      grid.querySelectorAll(".artifact-card").forEach(el => {
        el.classList.add("is-visible");
        el.classList.remove("is-pending");
      });
    }

  } catch (err) {
    console.error("[merch] Failed to load products:", err);
    grid.setAttribute("aria-busy", "false");
    if (grid.dataset.serverRendered === "true") return;
    grid.innerHTML = "";
    unavailable.hidden = false;
    const p = unavailable.querySelector("p");
    if (p) {
      p.textContent = "The merch catalog could not load right now. Please refresh the page or try again in a few minutes.";
    }
  }
}

// Browser Back may restore the pending button from the back/forward cache.
window.addEventListener("pageshow", event => {
  if (!event.persisted) return;
  const button = document.getElementById("cart-checkout");
  if (button) {
    button.disabled = Cart.isEmpty();
    button.textContent = "Complete transmission →";
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMerch);
} else {
  initMerch();
}
