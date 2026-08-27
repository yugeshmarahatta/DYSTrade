const fallbackProducts = [
  { name: "Storage baskets", category: "Plastics", description: "Neat, durable storage for every room.", icon: "▣", unit: "Wholesale & retail" },
  { name: "Water containers", category: "Plastics", description: "Practical containers for daily use.", icon: "◉", unit: "Wholesale & retail" },
  { name: "Personal care", category: "Cosmetics", description: "Everyday care essentials for your shelves.", icon: "✦", unit: "Ask for availability" },
  { name: "Beauty essentials", category: "Cosmetics", description: "Simple products people come back for.", icon: "◌", unit: "Ask for availability" },
  { name: "Cleaning supplies", category: "Household", description: "Reliable helpers for a cleaner home.", icon: "✧", unit: "Wholesale & retail" },
  { name: "Daily essentials", category: "Household", description: "Useful goods for shops and households.", icon: "＋", unit: "Ask for availability" }
];

const PER_PAGE = 9;
const grid = document.querySelector("#product-grid");
const emptyState = document.querySelector("#empty-state");
const summary = document.querySelector("#results-summary");
const pagination = document.querySelector("#pagination");
const search = document.querySelector("#search");
const sortSelect = document.querySelector("#sort");
const priceMin = document.querySelector("#price-min");
const priceMax = document.querySelector("#price-max");
const availability = document.querySelector("#availability");
let allProducts = [];
let activeCategory = "all";
let currentPage = 1;

function cardMarkup(product) {
  return `<article class="product-card">
    <a class="product-image" href="product.html?id=${product.id || ""}&name=${encodeURIComponent(product.name)}" aria-label="View ${product.name} details">${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy">` : `<span aria-hidden="true">${product.icon}</span>`}</a>
    <span class="product-category">${product.category}</span>
    <h3><a class="product-title-link" href="product.html?id=${product.id || ""}&name=${encodeURIComponent(product.name)}">${product.name}</a></h3>
    <p>${product.description}</p>
    <div class="product-meta"><small>${product.price != null ? `NPR ${Number(product.price).toLocaleString()}` : product.unit}${product.quantity != null ? ` · ${product.quantity} ${product.quantity_unit || "piece"}` : ""}</small><button class="quote-button" data-product="${product.name}">Enquire <span aria-hidden="true">↗</span></button></div>
  </article>`;
}

function getFiltered() {
  const query = search.value.trim().toLowerCase();
  const min = priceMin.value === "" ? null : Number(priceMin.value);
  const max = priceMax.value === "" ? null : Number(priceMax.value);
  const avail = availability.value;
  const list = allProducts.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
    const matchesAvail = avail === "all" || (product.unit || "").toLowerCase() === avail.toLowerCase();
    const priceOk = product.price == null ? (min == null && max == null) : (min == null || product.price >= min) && (max == null || product.price <= max);
    return matchesCategory && matchesSearch && matchesAvail && priceOk;
  });
  const sort = sortSelect.value;
  return [...list].sort((a, b) => {
    if (sort === "name-az") return a.name.localeCompare(b.name);
    if (sort === "name-za") return b.name.localeCompare(a.name);
    if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (sort === "price-desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
    return 0;
  });
}

function renderPagination(total, totalPages) {
  pagination.innerHTML = "";
  if (totalPages <= 1) return;
  const pageButton = (label, page, options = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = `page-btn ${options.nav ? "page-nav" : ""} ${options.active ? "active" : ""}`;
    if (options.disabled) button.disabled = true;
    button.addEventListener("click", () => {
      currentPage = page;
      render();
    });
    return button;
  };
  pagination.appendChild(pageButton("‹", currentPage - 1, { nav: true, disabled: currentPage === 1 }));
  let start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let page = start; page <= end; page += 1) pagination.appendChild(pageButton(String(page), page, { active: page === currentPage }));
  pagination.appendChild(pageButton("›", currentPage + 1, { nav: true, disabled: currentPage === totalPages }));
}

function render() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + PER_PAGE);

  summary.textContent = filtered.length ? `Showing ${startIndex + 1}–${Math.min(startIndex + PER_PAGE, filtered.length)} of ${filtered.length} products` : "0 products found";
  grid.innerHTML = pageItems.map(cardMarkup).join("");
  emptyState.hidden = filtered.length > 0;
  grid.querySelectorAll(".quote-button").forEach((button) => {
    button.addEventListener("click", () => {
      const subject = encodeURIComponent(`Enquiry about ${button.dataset.product}`);
      window.location.href = `mailto:dystrade33@gmail.com?subject=${subject}`;
    });
  });
  renderPagination(filtered.length, totalPages);
}

function goToPageOne() {
  currentPage = 1;
  render();
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    activeCategory = button.dataset.category;
    goToPageOne();
  });
});

search.addEventListener("input", goToPageOne);
sortSelect.addEventListener("change", goToPageOne);
priceMin.addEventListener("input", goToPageOne);
priceMax.addEventListener("input", goToPageOne);
availability.addEventListener("change", goToPageOne);
document.querySelector("#reset-filters").addEventListener("click", () => {
  search.value = "";
  priceMin.value = "";
  priceMax.value = "";
  availability.value = "all";
  sortSelect.value = "newest";
  document.querySelector(".filter.active").classList.remove("active");
  document.querySelector('[data-category="all"]').classList.add("active");
  activeCategory = "all";
  goToPageOne();
});

async function loadPublishedProducts() {
  if (!window.DYS_SUPABASE_CONFIG?.url || !window.supabase) {
    allProducts = fallbackProducts;
    render();
    return;
  }
  const client = window.supabase.createClient(window.DYS_SUPABASE_CONFIG.url, window.DYS_SUPABASE_CONFIG.anonKey);
  const { data, error } = await client.from("products").select("id,name,category,description,icon,unit,image_url,price,quantity,quantity_unit").eq("is_active", true).order("created_at", { ascending: false });
  allProducts = (error || !data) ? fallbackProducts : data;
  render();
}

document.querySelector("#year").textContent = new Date().getFullYear();
loadPublishedProducts();