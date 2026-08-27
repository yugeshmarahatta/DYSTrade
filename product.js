const detail = document.querySelector("#product-detail");
const params = new URLSearchParams(window.location.search);

function showError(message) {
  detail.innerHTML = `<div class="detail-message"><p class="eyebrow"><span></span> Product unavailable</p><h1>We could not find<br><em>that product.</em></h1><p>${message}</p><a class="button button-dark" href="index.html#catalog">Back to catalog <span aria-hidden="true">↗</span></a></div>`;
}

function renderProduct(product, gallery, related) {
  document.title = `DYS Trade | ${product.name}`;
  const images = gallery.length ? gallery : (product.image_url ? [{ image_url: product.image_url }] : []);
  const imageMarkup = images.length ? `<img id="main-product-image" src="${images[0].image_url}" alt="${product.name}">` : `<span class="detail-icon" aria-hidden="true">${product.icon || "▣"}</span>`;
  const price = product.price != null ? `NPR ${Number(product.price).toLocaleString()}` : "Price on request";
  const quantity = product.quantity != null ? `${product.quantity} ${product.quantity_unit || "piece"}` : "Available on request";
  const relatedMarkup = related.map((item) => `<a class="related-product" href="product.html?id=${item.id}"><span>${item.image_url ? `<img src="${item.image_url}" alt="">` : item.icon || "▣"}</span><strong>${item.name}</strong><small>${item.category}</small></a>`).join("");
  detail.innerHTML = `<div class="detail-layout"><div class="detail-grid"><div><div class="detail-image">${imageMarkup}<div class="zoom-controls"><button id="zoom-out" type="button" aria-label="Zoom out">−</button><button id="zoom-reset" type="button" aria-label="Reset image zoom">100%</button><button id="zoom-in" type="button" aria-label="Zoom in">+</button></div></div>${images.length > 1 ? `<div class="thumbnail-row">${images.map((item, index) => `<button class="thumbnail ${index === 0 ? "active" : ""}" data-image="${item.image_url}" type="button"><img src="${item.image_url}" alt="View image ${index + 1}"></button>`).join("")}</div>` : ""}</div><div class="detail-copy"><p class="eyebrow"><span></span> ${product.category}</p><h1>${product.name}</h1><p class="detail-description">${product.description}</p><div class="detail-facts"><div><small>Price</small><strong>${price}</strong></div><div><small>Quantity</small><strong>${quantity}</strong></div><div><small>Supply</small><strong>${product.unit || "Wholesale & retail"}</strong></div></div><div class="detail-actions"><a class="button button-dark" href="mailto:dystrade33@gmail.com?subject=${encodeURIComponent(`Enquiry about ${product.name}`)}">Enquire about this product <span aria-hidden="true">↗</span></a><a class="text-link" href="tel:+9779715622535">Call +977 9715622535 <span aria-hidden="true">→</span></a></div></div></div><aside class="related-products"><p class="eyebrow"><span></span> Explore more</p><h2>Other products</h2>${relatedMarkup || "<p class='loading-state'>More products coming soon.</p>"}</aside></div>`;
  const mainImage = document.querySelector("#main-product-image");
  let zoom = 1;
  function setZoom(value) { zoom = Math.max(1, Math.min(3, value)); if (mainImage) mainImage.style.transform = `scale(${zoom})`; document.querySelector("#zoom-reset").textContent = `${Math.round(zoom * 100)}%`; }
  document.querySelector("#zoom-in")?.addEventListener("click", () => setZoom(zoom + .25));
  document.querySelector("#zoom-out")?.addEventListener("click", () => setZoom(zoom - .25));
  document.querySelector("#zoom-reset")?.addEventListener("click", () => setZoom(1));
  document.querySelectorAll(".thumbnail").forEach((button) => button.addEventListener("click", () => { if (mainImage) mainImage.src = button.dataset.image; document.querySelector(".thumbnail.active")?.classList.remove("active"); button.classList.add("active"); setZoom(1); }));
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
