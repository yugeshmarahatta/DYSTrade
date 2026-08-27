// Edit this list to add or update products. No database or build step is needed.
const products = [
  { name: "Storage baskets", category: "Plastics", description: "Neat, durable storage for every room.", icon: "▣", unit: "Wholesale & retail" },
  { name: "Water containers", category: "Plastics", description: "Practical containers for daily use.", icon: "◉", unit: "Wholesale & retail" },
  { name: "Personal care", category: "Cosmetics", description: "Everyday care essentials for your shelves.", icon: "✦", unit: "Ask for availability" },
  { name: "Beauty essentials", category: "Cosmetics", description: "Simple products people come back for.", icon: "◌", unit: "Ask for availability" },
  { name: "Cleaning supplies", category: "Household", description: "Reliable helpers for a cleaner home.", icon: "✧", unit: "Wholesale & retail" },
  { name: "Daily essentials", category: "Household", description: "Useful goods for shops and households.", icon: "＋", unit: "Ask for availability" }
];

const supabaseConfigured = Boolean(window.DYS_SUPABASE_CONFIG?.url);
let catalogProducts = supabaseConfigured ? [] : products;
const grid = document.querySelector("#product-grid");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#search");
let activeCategory = "all";
let showAllOnHome = false;

function renderProducts() {
  const query = search.value.trim().toLowerCase();
  const visibleProducts = catalogProducts.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const showingAll = showAllOnHome || activeCategory !== "all" || query;
  const displayProducts = showingAll ? visibleProducts : visibleProducts.slice(0, 6);

  grid.innerHTML = displayProducts.map((product) => `
    <article class="product-card">
      <a class="product-image" href="product.html?id=${product.id || ""}&name=${encodeURIComponent(product.name)}" aria-label="View ${product.name} details">${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy">` : `<span aria-hidden="true">${product.icon}</span>`}</a>
      <span class="product-category">${product.category}</span>
      <h3><a class="product-title-link" href="product.html?id=${product.id || ""}&name=${encodeURIComponent(product.name)}">${product.name}</a></h3>
      <p>${product.description}</p>
      <div class="product-meta"><small>${product.price != null ? `NPR ${Number(product.price).toLocaleString()}` : product.unit}${product.quantity != null ? ` · ${product.quantity} ${product.quantity_unit || "piece"}` : ""}</small><button class="quote-button" data-product="${product.name}">Enquire <span aria-hidden="true">↗</span></button></div>
    </article>`).join("");

  emptyState.hidden = visibleProducts.length > 0;
  const viewAll = document.querySelector("#view-all");
  if (viewAll) viewAll.hidden = !(visibleProducts.length > 6 && !showingAll);
  grid.querySelectorAll(".quote-button").forEach((button) => {
    button.addEventListener("click", () => {
      const subject = encodeURIComponent(`Enquiry about ${button.dataset.product}`);
      window.location.href = `mailto:dystrade33@gmail.com?subject=${subject}`;
    });
  });
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    activeCategory = button.dataset.category;
    renderProducts();
  });
});
async function loadPublishedProducts() {
  if (!window.DYS_SUPABASE_CONFIG?.url || !window.supabase) return;
  const client = window.supabase.createClient(window.DYS_SUPABASE_CONFIG.url, window.DYS_SUPABASE_CONFIG.anonKey);
  const { data, error } = await client.from("products").select("id,name,category,description,icon,unit,image_url,price,quantity,quantity_unit").eq("is_active", true).order("created_at", { ascending: false });
  if (!error && data) {
    catalogProducts = data;
    renderProducts();
  }
}

document.querySelector("#year").textContent = new Date().getFullYear();
search.addEventListener("input", renderProducts);
renderProducts();
loadPublishedProducts();
