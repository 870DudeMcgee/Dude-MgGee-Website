/* ACTIVATE THE SIGNAL
   Hero transmission, scanner, scroll morph, and cart causality.
   Commerce state stays in merch.js. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const boot = performance.now();
  const fine = window.matchMedia("(pointer: fine)").matches;
  const variation = window.__DUDE_SIGNAL || { message: "SIGNAL ACQUIRED", scan: "ltr", turn: 1, slot: 0 };
  const hero = document.getElementById("signal-stage");
  const runway = document.getElementById("signal-runway");
  if (reduce) document.documentElement.classList.add("signal-reduce");
  const film = document.querySelector(".signal-film");
  if (film && reduce) {
    film.removeAttribute("autoplay");
    film.pause();
  }

  const statusText = document.getElementById("signal-status-text");
  if (statusText && variation.message) statusText.textContent = variation.message;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function productUrl(product) {
    const href = `/products/${encodeURIComponent(product.handle)}`;
    return window.DudeMerchMeasurement?.decorateProductUrl(href) || href;
  }

  function kindOf(product) {
    const text = `${product.title || ""} ${product.productType || ""}`.toLowerCase();
    if (/\b(hoodie|sweatshirt|pullover)\b/.test(text)) return "hoodie";
    if (/\b(hat|cap|beanie|trucker)\b/.test(text)) return "hat";
    if (/\b(coozie|koozie|cooler)\b/.test(text)) return "coozie";
    if (/\b(t[ -]?shirt|tee)\b/.test(text)) return "tee";
    return "other";
  }

  function colorOf(product) {
    const match = String(product.title || "").match(/\b(black|white)\b/i);
    return match ? match[1].toUpperCase() : "";
  }

  function priceOf(product) {
    const price = product.priceRange?.minVariantPrice;
    const amount = parseFloat(price?.amount);
    if (!Number.isFinite(amount)) return "";
    if ((price.currencyCode || "USD") === "USD") {
      return Math.abs(amount - Math.round(amount)) < 0.001 ? `$${Math.round(amount)}` : `$${amount.toFixed(2)}`;
    }
    return `${amount} ${price.currencyCode}`;
  }

  function imageOf(product) {
    const images = (product.images || []).filter(image => image && image.url);
    const single = image => /-front-/i.test(image.url) && !/front-and-back/i.test(image.url);
    const png = images.find(image => /\.png(\?|$)/i.test(image.url) && single(image));
    const front = images.find(single);
    const anyPng = images.find(image => /\.png(\?|$)/i.test(image.url) && !/front-and-back/i.test(image.url));
    return (png || front || anyPng || images[0] || {}).url || "";
  }

  function keyImage(url) {
    if (!url || /\.png(\?|$)/i.test(url)) return Promise.resolve(url);
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const px = frame.data;
          for (let i = 0; i < px.length; i += 4) {
            const min = Math.min(px[i], px[i + 1], px[i + 2]);
            const max = Math.max(px[i], px[i + 1], px[i + 2]);
            if (min > 236 && max - min < 18) px[i + 3] = 0;
            else if (min > 210 && max - min < 26) px[i + 3] = Math.round(px[i + 3] * (1 - (min - 210) / 32));
          }
          ctx.putImageData(frame, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(url);
        }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }

  let circuitDone = false;
  let relicsReady = false;

  function choose(products) {
    const usable = products.filter(product => imageOf(product));
    const first = kind => usable.find(product => kindOf(product) === kind);
    const stage = [];
    const hoodie = first("hoodie");
    const tee = usable.find(product => kindOf(product) === "tee" && /white/i.test(product.title)) || first("tee");
    const hat = first("hat");
    [hoodie, tee, hat].forEach(product => {
      if (product && !stage.includes(product)) stage.push(product);
    });
    usable.forEach(product => {
      if (stage.length < 3 && !stage.includes(product)) stage.push(product);
    });
    const pool = usable.filter(product => product !== stage[0]);
    const hidden = pool.length ? pool[(variation.slot || 0) % pool.length] : stage[0];
    return { stage: stage.slice(0, 3), hidden, total: products.length };
  }

  async function mountCatalog(products) {
    const host = document.getElementById("hero-relics");
    const hiddenLink = document.getElementById("hidden-artifact");
    const count = document.getElementById("signal-count");
    if (!host || !products?.length) return;
    const picks = choose(products);
    if (count) {
      count.textContent = `${String(picks.total).padStart(2, "0")} artifacts / limited signal`;
    }
    host.replaceChildren();
    const staged = await Promise.all(picks.stage.map(async (product, index) => {
      const src = await keyImage(imageOf(product));
      return { product, index, src };
    }));
    staged.forEach(({ product, index, src }) => {
      const figure = document.createElement("figure");
      figure.className = `hero-relic hero-relic-${index}${index === 0 ? " hero-relic-primary" : ""}`;
      figure.dataset.title = product.title || "";
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.draggable = false;
      figure.appendChild(img);
      host.appendChild(figure);
      if (!reduce && index !== 0) {
        const revealAt = index === 1 ? 2920 : 3480;
        const wait = Math.max(0, revealAt - (performance.now() - boot));
        window.setTimeout(() => {
          figure.classList.add("is-in");
          const hold = Math.max(1100, 5400 - (performance.now() - boot));
          window.setTimeout(() => figure.classList.add("is-receded"), hold);
        }, wait);
      }
    });
    relicsReady = true;
    if (reduce || circuitDone) materializePrimary();

    if (hiddenLink && picks.hidden) {
      const product = picks.hidden;
      const index = products.indexOf(product);
      const src = await keyImage(imageOf(product));
      const image = document.getElementById("hidden-artifact-image");
      if (image) {
        image.src = src;
        image.alt = product.title || "";
      }
      const id = document.getElementById("hidden-artifact-id");
      const name = document.getElementById("hidden-artifact-name");
      const spec = document.getElementById("hidden-artifact-spec");
      const price = document.getElementById("hidden-artifact-price");
      if (id) id.textContent = `Artifact ${String(index + 1).padStart(3, "0")}`;
      if (name) name.textContent = product.title || "";
      const bits = [colorOf(product), kindOf(product) === "hoodie" ? "Hoodie" : kindOf(product) === "tee" ? "Tee" : kindOf(product) === "hat" ? "Hat" : ""].filter(Boolean);
      if (spec) spec.textContent = bits.join(" / ");
      if (price) price.textContent = priceOf(product);
      hiddenLink.href = productUrl(product);
      hiddenLink.setAttribute("aria-label", `Scan ${product.title}. View product.`);
      hiddenLink.hidden = false;
    }
  }

  function placeBead(x, y) {
    const bead = document.getElementById("signal-bead");
    if (!bead || !hero) return;
    bead.style.transform = `translate(${x}px, ${y}px)`;
  }

  function pointIn(target, xRatio, yRatio) {
    const stage = hero.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    return {
      x: box.left - stage.left + box.width * xRatio,
      y: box.top - stage.top + box.height * yRatio,
    };
  }

  function materializePrimary() {
    const primary = hero?.querySelector(".hero-relic-primary");
    if (!primary || reduce || primary.classList.contains("is-materialized")) return;
    primary.classList.add("is-in", "is-materialized");
    window.setTimeout(() => primary.classList.add("is-receded"), 1200);
  }

  function runCircuit() {
    if (!hero || reduce) {
      hero?.classList.add("is-live", "is-bridged", "is-sent");
      circuitDone = true;
      materializePrimary();
      return;
    }
    hero.classList.add("is-circuit");
    const letters = [...hero.querySelectorAll(".signal-glyph")];
    const hop = 210;
    letters.forEach((letter, index) => {
      const start = index * hop;
      window.setTimeout(() => {
        letter.classList.add("is-hot");
        const lead = pointIn(letter, 0.04, 0.36);
        placeBead(lead.x, lead.y);
      }, start);
      window.setTimeout(() => {
        const exit = pointIn(letter, 0.94, 0.68);
        placeBead(exit.x, exit.y);
      }, start + Math.round(hop * 0.55));
    });
    const after = letters.length * hop;
    window.setTimeout(() => {
      const note = document.getElementById("signal-annotation");
      const bridge = note?.querySelector(".signal-bridge") || note;
      if (!bridge) return;
      const entry = pointIn(bridge, 0.04, 0.5);
      placeBead(entry.x, entry.y);
      hero.classList.add("is-bridged");
    }, after + 30);
    window.setTimeout(() => {
      const note = document.getElementById("signal-annotation");
      if (!note) return;
      const end = pointIn(note, 0.28, 0.55);
      placeBead(end.x, end.y);
    }, after + 260);
    window.setTimeout(() => {
      hero.classList.add("is-sent");
      circuitDone = true;
      materializePrimary();
    }, after + 520);
  }

  function bindFilm() {
    if (!hero || !film || reduce) return;
    const settle = () => hero.classList.add("is-settled");
    const arm = () => {
      if (!Number.isFinite(film.duration) || film.duration === 0) return;
      if (film.currentTime >= film.duration - 0.75) settle();
    };
    film.addEventListener("timeupdate", arm);
    film.addEventListener("ended", settle);
    film.addEventListener("error", settle);
    arm();
  }

  function bindScroll() {
    if (!runway || reduce) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const top = -runway.getBoundingClientRect().top;
      const range = window.innerHeight * (window.innerWidth < 700 ? 0.55 : 0.78);
      const morph = clamp(top / range, 0, 1);
      runway.style.setProperty("--morph", morph.toFixed(4));
    };
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function bindScanner() {
    if (!hero) return;
    const readout = document.getElementById("signal-readout");
    const hidden = document.getElementById("hidden-artifact");
    let frame = 0;
    let point = null;

    const apply = () => {
      frame = 0;
      if (!point || !hero.classList.contains("is-live")) return;
      const stage = hero.getBoundingClientRect();
      if (point.clientY < stage.top || point.clientY > stage.bottom || point.clientX < stage.left || point.clientX > stage.right) {
        readout?.classList.remove("is-on");
        hidden?.classList.remove("is-near");
        if (fine) hidden?.classList.remove("is-locked");
        return;
      }
      hero.classList.add("is-pointer");
      const x = ((point.clientX - stage.left) / stage.width) * 100;
      const y = ((point.clientY - stage.top) / stage.height) * 100;
      hero.style.setProperty("--sx", `${x.toFixed(2)}%`);
      hero.style.setProperty("--sy", `${y.toFixed(2)}%`);

      hero.querySelectorAll(".signal-glyph, .signal-wear span").forEach(node => {
        const box = node.getBoundingClientRect();
        const near = Math.hypot(point.clientX - (box.left + box.width / 2), point.clientY - (box.top + box.height / 2)) < 110;
        node.classList.toggle("is-scanned", near);
      });

      hero.querySelectorAll(".hero-relic, .hidden-artifact").forEach(node => {
        const box = node.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const distance = Math.hypot(point.clientX - cx, point.clientY - cy);
        const lit = clamp(1 - distance / 340, 0, 1);
        const yaw = clamp((point.clientX - cx) / stage.width * 26, -10, 10);
        const pitch = clamp((cy - point.clientY) / stage.height * 14, -6, 6);
        node.style.setProperty("--lit", lit.toFixed(3));
        node.style.setProperty("--yaw", `${yaw.toFixed(2)}deg`);
        node.style.setProperty("--pitch", `${pitch.toFixed(2)}deg`);
      });

      if (hidden && !hidden.hidden) {
        const box = hidden.getBoundingClientRect();
        const distance = Math.hypot(point.clientX - (box.left + box.width / 2), point.clientY - (box.top + box.height / 2));
        hidden.classList.toggle("is-near", distance < 280);
        if (fine) hidden.classList.toggle("is-locked", distance < 150);
      }

      const overObject = point.target?.closest?.(".hidden-artifact, .signal-enter, .merch-hero-copy, a, button");
      if (readout && !overObject) {
        readout.textContent = `X ${x.toFixed(2)}   Y ${y.toFixed(2)}`;
        readout.style.left = `${point.clientX - stage.left + 16}px`;
        readout.style.top = `${point.clientY - stage.top + 18}px`;
        readout.classList.add("is-on");
      } else {
        readout?.classList.remove("is-on");
      }
    };

    const queue = event => {
      point = event;
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };
    hero.addEventListener("pointermove", queue, { passive: true });
    hero.addEventListener("pointerdown", queue, { passive: true });
    hero.addEventListener("pointerleave", () => {
      hero.classList.remove("is-pointer");
      readout?.classList.remove("is-on");
      hero.querySelectorAll(".hero-relic, .hidden-artifact").forEach(node => {
        node.style.removeProperty("--yaw");
        node.style.removeProperty("--pitch");
        node.style.removeProperty("--lit");
      });
      if (fine) {
        hidden?.classList.remove("is-near", "is-locked");
      }
    });

    if (!fine && hidden) {
      hidden.addEventListener("click", event => {
        if (!hidden.classList.contains("is-locked")) {
          event.preventDefault();
          hidden.classList.add("is-near", "is-locked");
        }
      });
    }
  }

  function transmit(origin) {
    if (reduce) return Promise.resolve();
    const cart = document.getElementById("cart-toggle");
    if (!origin || !cart) return Promise.resolve();
    const from = origin.getBoundingClientRect();
    const to = cart.getBoundingClientRect();
    const packet = document.createElement("span");
    packet.className = "signal-packet";
    document.body.appendChild(packet);
    const x0 = from.left + from.width / 2 - 8;
    const y0 = from.top + from.height / 2;
    const x1 = to.left + to.width / 2 - 8;
    const y1 = to.top + to.height / 2;
    const animation = packet.animate([
      { transform: `translate(${x0}px, ${y0}px)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 36}px)`, opacity: 1, offset: 0.58 },
      { transform: `translate(${x1}px, ${y1}px)`, opacity: 1 },
    ], { duration: 640, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
    return animation.finished.finally(() => {
      packet.remove();
      cart.classList.add("is-receiving");
      window.setTimeout(() => cart.classList.remove("is-receiving"), 650);
    });
  }

  window.DudeSignal = { transmit, reduceMotion: reduce };

  document.addEventListener("dude:catalog", event => {
    mountCatalog(event.detail?.products || []).catch(error => {
      console.error("[signal] Hero artifacts unavailable:", error);
    });
  });

  const enter = document.querySelector(".signal-enter");
  enter?.addEventListener("click", event => {
    const shop = document.getElementById("shop");
    if (!shop) return;
    event.preventDefault();
    shop.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });

  bindFilm();
  bindScroll();
  bindScanner();
  if (reduce) {
    hero?.classList.add("is-live", "is-bridged");
  } else {
    window.setTimeout(() => hero?.classList.add("is-live"), 4300);
    window.setTimeout(runCircuit, 3080);
  }
})();
