let supabaseClient = null;
let allProducts = [];
let filteredProducts = [];
let cart = loadCart();
let selectedProduct = null;

const WHATSAPP_NUMBER = ""; // مثال: 989121234567 (بدون + و صفر اول)

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  bindEvents();
  renderCart();
  await loadProducts();
});

function initSupabase() {
  try {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      showError("تنظیمات اتصال فروشگاه کامل نیست.");
      return false;
    }
    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    return true;
  } catch (error) {
    console.error(error);
    showError("خطا در اتصال به سرویس فروشگاه.");
    return false;
  }
}

async function loadProducts() {
  const container = document.getElementById("productsGrid");
  if (!supabaseClient) return;
  if (container) container.innerHTML = '<div class="loading">در حال بارگذاری محصولات...</div>';

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    // برای دیتابیس قدیمی که هنوز ستون active ندارد، یک بار بدون آن دوباره تلاش می‌کنیم.
    const retry = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
    if (retry.error) {
      console.error(error, retry.error);
      if (container) container.innerHTML = '<div class="loading">خطا در دریافت محصولات. تنظیمات Supabase را بررسی کنید.</div>';
      return;
    }
    allProducts = retry.data || [];
  } else {
    allProducts = data || [];
  }

  filteredProducts = [...allProducts];
  renderCategories();
  renderCategoryFilter();
  renderProducts(filteredProducts);
}

function renderProducts(products) {
  const container = document.getElementById("productsGrid");
  if (!container) return;
  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML = '<div class="loading">هنوز محصولی برای نمایش ثبت نشده است.</div>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement("article");
    card.className = "product";
    const image = product.image_url
      ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name || "محصول")}" loading="lazy">`
      : `<div class="no-image">بدون تصویر</div>`;
    const stock = product.stock == null ? null : Number(product.stock);
    const out = stock !== null && stock <= 0;

    card.innerHTML = `
      <div class="product-img">${image}<span class="badge">${escapeHtml(product.category || "سنگ طبیعی")}</span></div>
      <div class="product-body">
        <small>${escapeHtml(product.category || "سنگ طبیعی")}</small>
        <h3>${escapeHtml(product.name || "محصول")}</h3>
        <div class="price">${formatPrice(product.price)} تومان</div>
        ${stock !== null ? `<div class="stock ${out ? "out" : ""}">${out ? "ناموجود" : "موجودی: " + stock.toLocaleString("fa-IR")}</div>` : ""}
        <div class="product-actions">
          <button type="button" class="mini view-product">مشاهده</button>
          <button type="button" class="mini add-product" ${out ? "disabled" : ""}>${out ? "ناموجود" : "افزودن به سبد"}</button>
        </div>
      </div>`;

    card.querySelector(".view-product").addEventListener("click", () => openProduct(product));
    if (!out) card.querySelector(".add-product").addEventListener("click", () => addToCart(product));
    container.appendChild(card);
  });
}

function renderCategories() {
  const container = document.getElementById("categoryGrid");
  if (!container) return;
  const categories = {};
  allProducts.forEach(p => {
    const c = p.category || "سنگ طبیعی";
    categories[c] = (categories[c] || 0) + 1;
  });

  container.innerHTML = "";
  Object.entries(categories).forEach(([category, count]) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "category";
    item.innerHTML = `<div class="icon">◇</div><h3>${escapeHtml(category)}</h3><span>${count.toLocaleString("fa-IR")} محصول</span>`;
    item.addEventListener("click", () => {
      const select = document.getElementById("categoryFilter");
      if (select) select.value = category;
      applyFilters();
      document.getElementById("products")?.scrollIntoView({behavior:"smooth"});
    });
    container.appendChild(item);
  });
}

function renderCategoryFilter() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  select.innerHTML = '<option value="">همه دسته‌ها</option>';
  categories.forEach(c => {
    const option = document.createElement("option");
    option.value = c; option.textContent = c;
    select.appendChild(option);
  });
}

function bindEvents() {
  document.getElementById("search")?.addEventListener("input", applyFilters);
  document.getElementById("categoryFilter")?.addEventListener("change", applyFilters);
  document.getElementById("cartBtn")?.addEventListener("click", openCart);
  document.getElementById("closeCart")?.addEventListener("click", closeCart);
  document.getElementById("backdrop")?.addEventListener("click", closeCart);
  document.getElementById("modalClose")?.addEventListener("click", closeProduct);
  document.getElementById("checkoutClose")?.addEventListener("click", closeCheckout);
  document.getElementById("checkoutBtn")?.addEventListener("click", openCheckout);
  document.getElementById("whatsappOrder")?.addEventListener("click", sendWhatsApp);
  document.getElementById("modalAdd")?.addEventListener("click", () => {
    if (selectedProduct) { addToCart(selectedProduct); closeProduct(); }
  });
  document.getElementById("checkoutForm")?.addEventListener("submit", submitOrder);
}

function applyFilters() {
  const search = (document.getElementById("search")?.value || "").trim().toLowerCase();
  const category = document.getElementById("categoryFilter")?.value || "";
  filteredProducts = allProducts.filter(p => {
    const haystack = `${p.name || ""} ${p.description || ""} ${p.category || ""}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!category || String(p.category || "") === category);
  });
  renderProducts(filteredProducts);
}

function openProduct(product) {
  selectedProduct = product;
  document.getElementById("modalImg").src = product.image_url || "";
  document.getElementById("modalImg").alt = product.name || "محصول";
  document.getElementById("modalCat").textContent = product.category || "سنگ طبیعی";
  document.getElementById("modalTitle").textContent = product.name || "محصول";
  document.getElementById("modalDesc").textContent = product.description || "توضیحی برای این محصول ثبت نشده است.";
  document.getElementById("modalPrice").textContent = formatPrice(product.price) + " تومان";
  document.getElementById("productModal").classList.add("show");
  document.getElementById("productModal").setAttribute("aria-hidden","false");
}

function closeProduct() {
  document.getElementById("productModal")?.classList.remove("show");
  selectedProduct = null;
}

function addToCart(product) {
  const existing = cart.find(item => String(item.id) === String(product.id));
  if (existing) existing.quantity++;
  else cart.push({
    id: product.id, name: product.name || "محصول", price: Number(product.price) || 0,
    image_url: product.image_url || "", category: product.category || "", quantity: 1
  });
  saveCart(); renderCart(); openCart();
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const count = document.getElementById("cartCount");
  const total = document.getElementById("cartTotal");
  const itemCount = cart.reduce((s,i) => s + Number(i.quantity || 0), 0);
  const totalPrice = getCartTotal();
  if (count) count.textContent = itemCount.toLocaleString("fa-IR");
  if (total) total.textContent = formatPrice(totalPrice) + " تومان";
  const checkoutTotal = document.getElementById("checkoutTotal");
  if (checkoutTotal) checkoutTotal.textContent = formatPrice(totalPrice) + " تومان";
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = '<div class="loading">سبد خرید خالی است.</div>';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-row">
      ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">` : `<div class="cart-placeholder">◇</div>`}
      <div class="cart-row-main">
        <h4>${escapeHtml(item.name)}</h4>
        <div>${formatPrice(item.price)} تومان</div>
        <div class="qty">
          <button type="button" onclick="changeQuantity('${escapeJs(item.id)}',1)">+</button>
          <b>${Number(item.quantity).toLocaleString("fa-IR")}</b>
          <button type="button" onclick="changeQuantity('${escapeJs(item.id)}',-1)">−</button>
          <button type="button" class="remove" onclick="removeFromCart('${escapeJs(item.id)}')">حذف</button>
        </div>
      </div>
    </div>`).join("");
}

function changeQuantity(id, amount) {
  const item = cart.find(i => String(i.id) === String(id));
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) return removeFromCart(id);
  saveCart(); renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => String(i.id) !== String(id));
  saveCart(); renderCart();
}

function openCart() {
  document.getElementById("drawer")?.classList.add("open");
  document.getElementById("backdrop")?.classList.add("show");
}
function closeCart() {
  document.getElementById("drawer")?.classList.remove("open");
  document.getElementById("backdrop")?.classList.remove("show");
}

function openCheckout() {
  if (!cart.length) return alert("سبد خرید خالی است.");
  closeCart();
  renderCart();
  document.getElementById("checkoutModal")?.classList.add("show");
}

function closeCheckout() {
  document.getElementById("checkoutModal")?.classList.remove("show");
  const status = document.getElementById("checkoutStatus");
  if (status) { status.hidden = true; status.textContent = ""; }
}

async function submitOrder(e) {
  e.preventDefault();
  if (!cart.length) return alert("سبد خرید خالی است.");
  if (!supabaseClient) return showCheckoutStatus("اتصال فروشگاه برقرار نیست.", true);

  const btn = document.getElementById("submitOrderBtn");
  btn.disabled = true; btn.textContent = "در حال ثبت...";
  const orderId = crypto.randomUUID ? crypto.randomUUID() : generateUuid();
  const order = {
    id: orderId,
    customer_name: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("customerPhone").value.trim(),
    address: document.getElementById("customerAddress").value.trim(),
    notes: document.getElementById("customerNotes").value.trim() || null,
    total_amount: getCartTotal(),
    status: "new",
    payment_status: "unpaid"
  };

  try {
    const { error: orderError } = await supabaseClient.from("orders").insert(order);
    if (orderError) throw orderError;

    const items = cart.map(item => ({
      order_id: orderId, product_id: item.id, product_name: item.name,
      price: Number(item.price) || 0, quantity: Number(item.quantity) || 1
    }));
    const { error: itemsError } = await supabaseClient.from("order_items").insert(items);
    if (itemsError) throw itemsError;

    cart = []; saveCart(); renderCart();
    showCheckoutStatus(`سفارش شما با موفقیت ثبت شد. شماره سفارش: ${orderId}`, false);
    document.getElementById("checkoutForm").reset();
  } catch (error) {
    console.error(error);
    showCheckoutStatus("ثبت سفارش انجام نشد: " + (error.message || "خطای نامشخص"), true);
  } finally {
    btn.disabled = false; btn.textContent = "ثبت سفارش";
  }
}

function showCheckoutStatus(message, error) {
  const box = document.getElementById("checkoutStatus");
  if (!box) return;
  box.hidden = false; box.textContent = message;
  box.className = "status-box " + (error ? "error" : "success");
}

function sendWhatsApp() {
  if (!cart.length) return alert("سبد خرید خالی است.");
  if (!WHATSAPP_NUMBER) return alert("شماره واتساپ فروشگاه هنوز در app.js تنظیم نشده است.");
  let message = "سلام، برای خرید این محصولات پیام می‌دهم:\n\n";
  cart.forEach((item,i) => message += `${i+1}. ${item.name} - تعداد: ${item.quantity}\n`);
  message += `\nمجموع: ${formatPrice(getCartTotal())} تومان`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
}

function getCartTotal() {
  return cart.reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}
function loadCart() {
  try {
    const value = JSON.parse(localStorage.getItem("gallery_sang_cart") || "[]");
    return Array.isArray(value) ? value.filter(i => i && i.id != null) : [];
  } catch { return []; }
}
function saveCart() { localStorage.setItem("gallery_sang_cart", JSON.stringify(cart)); }
function formatPrice(price) {
  const n = Number(price);
  return Number.isFinite(n) ? n.toLocaleString("fa-IR") : "۰";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function escapeJs(value) { return String(value ?? "").replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function generateUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c==="x" ? r : (r&3|8); return v.toString(16);
  });
}
function showError(message) {
  console.error(message);
  const container = document.getElementById("productsGrid");
  if (container) container.innerHTML = `<div class="loading">${escapeHtml(message)}</div>`;
}

window.changeQuantity = changeQuantity;
window.removeFromCart = removeFromCart;
