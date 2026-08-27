const detail = document.querySelector("#product-detail");
const params = new URLSearchParams(window.location.search);

function showError(message) {
  detail.innerHTML = `<div class="detail-message"><p class="eyebrow"><span></span> Product unavailable</p><h1>We could not find<br><em>that product.</em></h1><p>${message}</p><a class="button button-dark" href="index.html#catalog">Back to catalog <span aria-hidden="true">↗</span></a></div>`;
}

function renderProduct(product, gallery, related) {
  document.title = `DYS Trade | ${product.name}`;
  const images = gallery.length ? gallery : (product.image_url ? [{ image_url: product.image_url }] : []);
  const imageMarkup = images.length ? `<img id="main-product-image" src="${images[0].image_url}" alt="${product.name}" draggable="false">` : `<span class="detail-icon" aria-hidden="true">${product.icon || "▣"}</span>`;
  const zoomChrome = images.length ? `<span class="zoom-hint">Scroll to zoom · drag anywhere to move</span><button class="zoom-badge" type="button" title="Reset zoom">100%</button>` : "";
  const price = product.price != null ? `NPR ${Number(product.price).toLocaleString()}` : "Price on request";
  const quantity = product.quantity != null ? `${product.quantity} ${product.quantity_unit || "piece"}` : "Available on request";
  const relatedMarkup = related.map((item) => `<a class="related-product" href="product.html?id=${item.id}"><span>${item.image_url ? `<img src="${item.image_url}" alt="">` : item.icon || "▣"}</span><strong>${item.name}</strong><small>${item.category}</small></a>`).join("");
  detail.innerHTML = `<div class="detail-layout"><div class="detail-grid"><div><div class="detail-image">${imageMarkup}${zoomChrome}</div>${images.length > 1 ? `<div class="thumbnail-row">${images.map((item, index) => `<button class="thumbnail ${index === 0 ? "active" : ""}" data-image="${item.image_url}" type="button"><img src="${item.image_url}" alt="View image ${index + 1}"></button>`).join("")}</div>` : ""}</div><div class="detail-copy"><p class="eyebrow"><span></span> ${product.category}</p><h1>${product.name}</h1><p class="detail-description">${product.description}</p><div class="detail-facts"><div><small>Price</small><strong>${price}</strong></div><div><small>Quantity</small><strong>${quantity}</strong></div><div><small>Supply</small><strong>${product.unit || "Wholesale & retail"}</strong></div></div><div class="detail-actions"><a class="button button-dark" href="mailto:dystrade33@gmail.com?subject=${encodeURIComponent(`Enquiry about ${product.name}`)}">Enquire about this product <span aria-hidden="true">↗</span></a><a class="text-link" href="tel:+9779715622535">Call +977 9715622535 <span aria-hidden="true">→</span></a></div></div></div><aside class="related-products"><p class="eyebrow"><span></span> Explore more</p><h2>Other products</h2>${relatedMarkup || "<p class='loading-state'>More products coming soon.</p>"}</aside></div>`;
  const mainImage = document.querySelector("#main-product-image");
  const zoomContainer = document.querySelector(".detail-image");
  const badge = document.querySelector(".zoom-badge");
  if (mainImage && zoomContainer) {
    let zoom = 1;
    let tx = 0;
    let ty = 0;
    const MIN = 1;
    const MAX = 4;
    const pointers = new Map();
    let pinchStart = null;

    function apply() {
      mainImage.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;
      mainImage.style.cursor = zoom > 1 ? "grab" : "zoom-in";
      zoomContainer.classList.toggle("zoomed", zoom > 1);
      if (badge) {
        badge.textContent = `${Math.round(zoom * 100)}%`;
        badge.classList.toggle("zoomed", zoom > 1);
      }
    }

    function clamp() {
      tx = Math.min(0, Math.max(zoomContainer.clientWidth * (1 - zoom), tx));
      ty = Math.min(0, Math.max(zoomContainer.clientHeight * (1 - zoom), ty));
    }

    function setZoom(nextZoom, cx, cy, mx, my) {
      zoom = Math.min(MAX, Math.max(MIN, nextZoom));
      tx = mx - cx * zoom;
      ty = my - cy * zoom;
      clamp();
      apply();
    }

    function resetZoom() {
      zoom = 1;
      tx = 0;
      ty = 0;
      apply();
    }

    zoomContainer.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = zoomContainer.getBoundingClientRect();
      const cx = (event.clientX - rect.left - tx) / zoom;
      const cy = (event.clientY - rect.top - ty) / zoom;
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(zoom * factor, cx, cy, event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });

    zoomContainer.addEventListener("dblclick", (event) => {
      event.preventDefault();
      if (zoom > 1.01) return resetZoom();
      const rect = zoomContainer.getBoundingClientRect();
      const cx = (event.clientX - rect.left - tx) / zoom;
      const cy = (event.clientY - rect.top - ty) / zoom;
      setZoom(2.5, cx, cy, event.clientX - rect.left, event.clientY - rect.top);
    });

    zoomContainer.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      zoomContainer.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        pinchStart = null;
        if (zoom > 1) mainImage.style.cursor = "grabbing";
      } else if (pointers.size === 2) {
        pinchStart = null;
        const [a, b] = [...pointers.values()];
        const rect = zoomContainer.getBoundingClientRect();
        pinchStart = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          centerX: (a.x + b.x) / 2 - rect.left,
          centerY: (a.y + b.y) / 2 - rect.top,
          zoom,
          tx,
          ty
        };
      }
    });

    zoomContainer.addEventListener("pointermove", (event) => {
      if (!pointers.has(event.pointerId)) return;
      const prev = pointers.get(event.pointerId);
      if (pointers.size === 1) {
        if (zoom > 1.01) {
          tx += event.clientX - prev.x;
          ty += event.clientY - prev.y;
          clamp();
          apply();
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      } else if (pointers.size === 2 && pinchStart && pinchStart.dist > 0) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > 0) {
          const rect = zoomContainer.getBoundingClientRect();
          const centerX = (a.x + b.x) / 2 - rect.left;
          const centerY = (a.y + b.y) / 2 - rect.top;
          const cx = (pinchStart.centerX - pinchStart.tx) / pinchStart.zoom;
          const cy = (pinchStart.centerY - pinchStart.ty) / pinchStart.zoom;
          setZoom(pinchStart.zoom * (dist / pinchStart.dist), cx, cy, centerX, centerY);
        }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
    });

    function endPointer(event) {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStart = null;
      apply();
    }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => zoomContainer.addEventListener(type, endPointer));
    zoomContainer.addEventListener("pointerleave", (event) => {
      if (pointers.has(event.pointerId)) endPointer(event);
    });
    badge?.addEventListener("click", resetZoom);
    document.querySelectorAll(".thumbnail").forEach((button) => button.addEventListener("click", () => {
      if (mainImage) mainImage.src = button.dataset.image;
      document.querySelector(".thumbnail.active")?.classList.remove("active");
      button.classList.add("active");
      resetZoom();
    }));
    apply();
  }
}

async function loadProduct() {
  if (!window.supabase || !window.DYS_SUPABASE_CONFIG?.url || !window.DYS_SUPABASE_CONFIG.anonKey) return showError("Product details are not connected yet.");
  const client = window.supabase.createClient(window.DYS_SUPABASE_CONFIG.url, window.DYS_SUPABASE_CONFIG.anonKey);
  const productQuery = client.from("products").select("id,name,category,description,icon,unit,image_url,price,quantity,quantity_unit").eq("is_active", true);
  const query = params.get("id") ? productQuery.eq("id", params.get("id")) : productQuery.eq("name", params.get("name") || "");
  const { data: product, error } = await query.maybeSingle();
  if (error || !product) return showError("This product may have been removed or is currently unavailable.");
  const [{ data: gallery, error: galleryError }, { data: related }] = await Promise.all([
    client.from("product_images").select("image_url,sort_order").eq("product_id", product.id).order("sort_order", { ascending: true }),
    client.from("products").select("id,name,category,icon,image_url").eq("is_active", true).neq("id", product.id).limit(5)
  ]);
  if (galleryError && galleryError.code !== "PGRST205") return showError("The product is available, but its image gallery could not be loaded.");
  renderProduct(product, gallery || [], related || []);
}

loadProduct();
