const config = window.DYS_SUPABASE_CONFIG;
const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const productForm = document.querySelector("#product-form");
const productList = document.querySelector("#product-list");
const loginMessage = document.querySelector("#login-message");
const productMessage = document.querySelector("#product-message");
const imageInput = document.querySelector("#product-image");
const imagePreview = document.querySelector("#image-preview");
imageInput.multiple = true;

if (!config?.url || !config?.anonKey || !window.supabase) {
  loginMessage.textContent = "Add your Supabase URL and anon key in supabase-config.js first.";
  loginForm.querySelector("button").disabled = true;
}

const client = config?.url && config?.anonKey && window.supabase
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;

function showMessage(element, message, isError = true) {
  element.textContent = message;
  element.className = `form-message ${isError ? "error" : "success"}`;
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  loadProducts();
  verifyAdminAccess();
}

function resetForm() {
  productForm.reset();
  document.querySelector("#product-id").value = "";
  document.querySelector("#product-icon").value = "▣";
  document.querySelector("#product-unit").value = "Wholesale & retail";
  document.querySelector("#product-active").checked = true;
  document.querySelector("#product-price").value = "";
  document.querySelector("#product-quantity").value = "";
  document.querySelector("#product-quantity-unit").value = "piece";
  document.querySelector("#product-image-url").value = "";
  imageInput.value = "";
  imagePreview.hidden = true;
  imagePreview.innerHTML = "";
  document.querySelector("#cancel-edit").hidden = true;
}

function productRow(product) {
  return `<tr><td><strong>${product.name}</strong><small>${product.description}</small></td><td>${product.category}</td><td><span class="status ${product.is_active ? "published" : "hidden-status"}">${product.is_active ? "Published" : "Hidden"}</span></td><td class="row-actions"><button type="button" data-edit="${product.id}">Edit</button><button type="button" data-delete="${product.id}">Delete</button></td></tr>`;
}

async function loadProducts() {
  const { data, error } = await client.from("products").select("*").order("created_at", { ascending: false });
  if (error) return showMessage(productMessage, friendlyDatabaseError(error));
  productList.innerHTML = data.length ? data.map(productRow).join("") : '<tr><td colspan="4">No products yet. Add your first one above.</td></tr>';
  productList.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editProduct(data.find((product) => product.id === button.dataset.edit))));
  productList.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteProduct(button.dataset.delete)));
}

function friendlyDatabaseError(error) {
  if (error.code === "PGRST205" || error.message?.toLowerCase().includes("could not find the table")) {
    return "Database setup is incomplete. Run the SQL setup from SETUP.md in this Supabase project's SQL Editor, then refresh this page.";
  }
  if (error.message?.toLowerCase().includes("row-level security")) {
    return "This account is signed in but is not approved as an admin. Add its User UID to public.admin_users in Supabase SQL Editor.";
  }
  return error.message || "Unable to access the product database.";
}

async function verifyAdminAccess() {
  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error) return showMessage(productMessage, friendlyDatabaseError(error));
  if (!data) showMessage(productMessage, "Signed in, but this account is not approved as an admin. Add its User UID to public.admin_users in Supabase SQL Editor.");
}

async function editProduct(product) {
  document.querySelector("#product-id").value = product.id;
  document.querySelector("#product-name").value = product.name;
  document.querySelector("#product-category").value = product.category;
  document.querySelector("#product-description").value = product.description;
  document.querySelector("#product-icon").value = product.icon || "▣";
  document.querySelector("#product-unit").value = product.unit || "Wholesale & retail";
  document.querySelector("#product-active").checked = product.is_active;
  document.querySelector("#product-price").value = product.price ?? "";
  document.querySelector("#product-quantity").value = product.quantity ?? "";
  document.querySelector("#product-quantity-unit").value = product.quantity_unit || "piece";
  document.querySelector("#product-image-url").value = product.image_url || "";
  imageInput.value = "";
  const { data: gallery } = await client.from("product_images").select("image_url,sort_order").eq("product_id", product.id).order("sort_order", { ascending: true });
  const existingImages = gallery?.length ? gallery : (product.image_url ? [{ image_url: product.image_url }] : []);
  imagePreview.innerHTML = existingImages.map((item) => `<img src="${item.image_url}" alt="Current product image">`).join("");
  imagePreview.hidden = !existingImages.length;
  document.querySelector("#cancel-edit").hidden = false;
  productForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function uploadProductImages(files) {
  if (!files.length) return [];
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const { data: { user } } = await client.auth.getUser();
  const urls = [];
  for (const file of files) {
    if (!allowedTypes.includes(file.type)) throw new Error("Please choose JPG, PNG, WebP, or GIF images.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be smaller than 5 MB.");
    const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (error) throw error;
    urls.push(client.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

async function deleteProduct(id) {
  if (!window.confirm("Delete this product?")) return;
  const { error } = await client.from("products").delete().eq("id", id);
  if (error) return showMessage(productMessage, error.message);
  showMessage(productMessage, "Product deleted.", false);
  loadProducts();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const { error } = await client.auth.signInWithPassword({ email: document.querySelector("#login-email").value, password: document.querySelector("#login-password").value });
  if (error) return showMessage(loginMessage, error.message);
  showDashboard();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.querySelector("#product-id").value;
  let imageUrls;
  try {
    imageUrls = await uploadProductImages([...imageInput.files]);
  } catch (error) {
    const lowerMessage = error.message?.toLowerCase() || "";
    const message = lowerMessage.includes("bucket not found")
      ? "Storage bucket missing. Create a bucket named product-images in Supabase, then try again."
      : lowerMessage.includes("row-level security")
        ? "Image upload blocked by Storage RLS. Confirm your signed-in User UID is in public.admin_users and rerun the Storage policies from supabase-migration.sql."
        : error.message;
    return showMessage(productMessage, message);
  }
  const priceValue = document.querySelector("#product-price").value;
  const quantityValue = document.querySelector("#product-quantity").value;
  const product = { name: document.querySelector("#product-name").value.trim(), category: document.querySelector("#product-category").value, description: document.querySelector("#product-description").value.trim(), icon: document.querySelector("#product-icon").value || "▣", unit: document.querySelector("#product-unit").value.trim(), image_url: imageUrls[0] || document.querySelector("#product-image-url").value || null, price: priceValue ? Number(priceValue) : null, quantity: quantityValue ? Number(quantityValue) : null, quantity_unit: document.querySelector("#product-quantity-unit").value.trim() || "piece", is_active: document.querySelector("#product-active").checked };
  const request = id ? client.from("products").update(product).eq("id", id).select("id").single() : client.from("products").insert(product).select("id").single();
  const { data: savedProduct, error } = await request;
  if (error) return showMessage(productMessage, friendlyDatabaseError(error));
  if (imageUrls.length) {
    const { error: imageError } = await client.from("product_images").insert(imageUrls.map((url, index) => ({ product_id: savedProduct.id, image_url: url, sort_order: index })));
    if (imageError) return showMessage(productMessage, friendlyDatabaseError(imageError));
  }
  showMessage(productMessage, id ? "Product updated." : "Product added.", false);
  resetForm();
  loadProducts();
});

document.querySelector("#cancel-edit").addEventListener("click", resetForm);
imageInput.addEventListener("change", () => {
  imagePreview.querySelectorAll("img").forEach((img) => URL.revokeObjectURL(img.dataset.url));
  imagePreview.innerHTML = "";
  const files = [...imageInput.files];
  if (!files.length) {
    imagePreview.hidden = true;
    return;
  }
  imagePreview.innerHTML = files.map((file) => {
    const url = URL.createObjectURL(file);
    return `<img src="${url}" data-url="${url}" alt="${file.name}">`;
  }).join("");
  imagePreview.hidden = false;
});
document.querySelector("#sign-out").addEventListener("click", async () => { await client.auth.signOut(); dashboard.hidden = true; loginPanel.hidden = false; resetForm(); });
if (client) client.auth.getSession().then(({ data }) => { if (data.session) showDashboard(); });
