// Edit this list to add or update products. No database or build step is needed.
const products = [
  { name: "Storage baskets", category: "Plastics", description: "Neat, durable storage for every room.", icon: "▣", unit: "Wholesale & retail" },
  { name: "Water containers", category: "Plastics", description: "Practical containers for daily use.", icon: "◉", unit: "Wholesale & retail" },
  { name: "Personal care", category: "Cosmetics", description: "Everyday care essentials for your shelves.", icon: "✦", unit: "Ask for availability" },
  { name: "Beauty essentials", category: "Cosmetics", description: "Simple products people come back for.", icon: "◌", unit: "Ask for availability" },
  { name: "Cleaning supplies", category: "Household", description: "Reliable helpers for a cleaner home.", icon: "✧", unit: "Wholesale & retail" },
  { name: "Daily essentials", category: "Household", description: "Useful goods for shops and households.", icon: "＋", unit: "Ask for availability" }
];

const grid = document.querySelector("#product-grid");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#search");
let activeCategory = "all";

function renderProducts() {
  const query = search.value.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  grid.innerHTML = visibleProducts.map((product) => `
    <article class="product-card">
      <div class="product-image" aria-hidden="true">${product.icon}</div>
      <span class="product-category">${product.category}</span>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <div class="product-meta"><small>${product.unit}</small><button class="quote-button" data-product="${product.name}">Enquire <span aria-hidden="true">↗</span></button></div>
    </article>`).join("");

  emptyState.hidden = visibleProducts.length > 0;
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
search.addEventListener("input", renderProducts);
document.querySelector("#year").textContent = new Date().getFullYear();
renderProducts();
