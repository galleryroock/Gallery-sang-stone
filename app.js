let supabaseClient = null;
let allProducts = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem("gallery_sang_cart") || "[]");
let selectedProduct = null;

const WHATSAPP_NUMBER = "";

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  bindEvents();
  renderCart();
  await loadProducts();
});

function initSupabase() {
  try {
    if (!window.supabase) {
      showError("کتابخانه Supabase بارگذاری نشده است.");
      return false;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) {
      showError("تنظیمات Supabase پیدا نشد.");
      return false;
    }

    supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_KEY
    );

    return true;
  } catch (error) {
    showError("خطا در اتصال به Supabase");
    console.error(error);
    return false;
  }
}

async function loadProducts() {
  const container = document.getElementById("productsGrid");

  if (!supabaseClient) return;

  if (container) {
    container.innerHTML =
      '<div class="loading">در حال بارگذاری محصولات...</div>';
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);

    if (container) {
      container.innerHTML =
        '<div class="loading">خطا در دریافت محصولات</div>';
    }

    return;
  }

  allProducts = data || [];
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
    container.innerHTML =
      '<div class="loading">هنوز محصولی ثبت نشده است.</div>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement("article");
    card.className = "product";

    const image = product.image_url
      ? `<img src="${escapeHtml(product.image_url)}"
          alt="${escapeHtml(product.name || "محصول")}"
          loading="lazy">`
      : "";

    card.innerHTML = `
      <div class="product-img">
        ${image}
        <span class="badge">
          ${escapeHtml(product.category || "سنگ طبیعی")}
        </span>
      </div>

      <div class="product-body">

        <small>
          ${escapeHtml(product.category || "سنگ طبیعی")}
        </small>

        <h3>
          ${escapeHtml(product.name || "محصول")}
        </h3>

        <div class="price">
          ${formatPrice(product.price)} تومان
        </div>

        <div class="product-actions">

          <button type="button" class="mini view-product">
            مشاهده
          </button>

          <button type="button" class="mini add-product">
            افزودن به سبد
          </button>

        </div>

      </div>
    `;

    card.querySelector(".view-product").addEventListener("click", () => {
      openProduct(product);
    });

    card.querySelector(".add-product").addEventListener("click", () => {
      addToCart(product);
    });

    container.appendChild(card);
  });
}

function renderCategories() {
  const container = document.getElementById("categoryGrid");

  if (!container) return;

  const categories = {};

  allProducts.forEach(product => {
    const category = product.category || "سنگ طبیعی";

    if (!categories[category]) {
      categories[category] = 0;
    }

    categories[category]++;
  });

  container.innerHTML = "";

  Object.keys(categories).forEach(category => {

    const item = document.createElement("div");

    item.className = "category";

    item.innerHTML = `
      <div class="icon">◇</div>

      <h3>
        ${escapeHtml(category)}
      </h3>

      <span>
        ${categories[category].toLocaleString("fa-IR")} محصول
      </span>
    `;

    item.addEventListener("click", () => {

      const select = document.getElementById("categoryFilter");

      if (select) {
        select.value = category;
      }

      applyFilters();

      document.getElementById("products")
        ?.scrollIntoView({
          behavior: "smooth"
        });

    });

    container.appendChild(item);
  });
}

function renderCategoryFilter() {
  const select = document.getElementById("categoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      allProducts
        .map(product => product.category)
        .filter(Boolean)
    )
  ];

  select.innerHTML =
    '<option value="">همه دسته‌ها</option>';

  categories.forEach(category => {

    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    select.appendChild(option);

  });
}

function bindEvents() {

  const search = document.getElementById("search");

  const category =
    document.getElementById("categoryFilter");

  search?.addEventListener("input", applyFilters);

  category?.addEventListener("change", applyFilters);

  document.getElementById("cartBtn")
    ?.addEventListener("click", openCart);

  document.getElementById("closeCart")
    ?.addEventListener("click", closeCart);

  document.getElementById("backdrop")
    ?.addEventListener("click", closeCart);

  document.getElementById("modalClose")
    ?.addEventListener("click", closeProduct);

  document.getElementById("modalAdd")
    ?.addEventListener("click", () => {

      if (selectedProduct) {
        addToCart(selectedProduct);
        closeProduct();
      }

    });

  document.getElementById("whatsappOrder")
    ?.addEventListener("click", sendWhatsApp);
}

function applyFilters() {

  const search =
    (document.getElementById("search")?.value || "")
      .trim()
      .toLowerCase();

  const category =
    document.getElementById("categoryFilter")?.value || "";

  filteredProducts = allProducts.filter(product => {

    const name =
      String(product.name || "").toLowerCase();

    const description =
      String(product.description || "").toLowerCase();

    const productCategory =
      String(product.category || "");

    const searchMatch =
      !search ||
      name.includes(search) ||
      description.includes(search) ||
      productCategory.toLowerCase().includes(search);

    const categoryMatch =
      !category ||
      productCategory === category;

    return searchMatch && categoryMatch;
  });

  renderProducts(filteredProducts);
}

function openProduct(product) {

  selectedProduct = product;

  const modal =
    document.getElementById("productModal");

  const image =
    document.getElementById("modalImg");

  const category =
    document.getElementById("modalCat");

  const title =
    document.getElementById("modalTitle");

  const description =
    document.getElementById("modalDesc");

  const price =
    document.getElementById("modalPrice");

  if (image) {
    image.src = product.image_url || "";
    image.alt = product.name || "محصول";
  }

  if (category) {
    category.textContent =
      product.category || "سنگ طبیعی";
  }

  if (title) {
    title.textContent =
      product.name || "محصول";
  }

  if (description) {
    description.textContent =
      product.description ||
      "توضیحی برای این محصول ثبت نشده است.";
  }

  if (price) {
    price.textContent =
      formatPrice(product.price) + " تومان";
  }

  modal?.classList.add("show");
}

function closeProduct() {

  document.getElementById("productModal")
    ?.classList.remove("show");

  selectedProduct = null;
}

function addToCart(product) {

  const existing =
    cart.find(
      item => String(item.id) === String(product.id)
    );

  if (existing) {

    existing.quantity++;

  } else {

    cart.push({

      id: product.id,

      name: product.name || "محصول",

      price: Number(product.price) || 0,

      image_url: product.image_url || "",

      category: product.category || "",

      quantity: 1

    });

  }

  saveCart();

  renderCart();

  openCart();
}

function renderCart() {

  const container =
    document.getElementById("cartItems");

  const count =
    document.getElementById("cartCount");

  const total =
    document.getElementById("cartTotal");

  const itemCount =
    cart.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

  const totalPrice =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.quantity || 0),
      0
    );

  if (count) {
    count.textContent =
      itemCount.toLocaleString("fa-IR");
  }

  if (total) {
    total.textContent =
      formatPrice(totalPrice) + " تومان";
  }

  if (!container) return;

  if (!cart.length) {

    container.innerHTML =
      '<div class="loading">سبد خرید خالی است.</div>';

    return;
  }

  container.innerHTML =
    cart.map(item => `

      <div class="cart-row">

        ${
          item.image_url
            ? `
              <img
                src="${escapeHtml(item.image_url)}"
                alt="${escapeHtml(item.name)}"
              >
            `
            : ""
        }

        <div>

          <h4>
            ${escapeHtml(item.name)}
          </h4>

          <div>
            ${formatPrice(item.price)} تومان
          </div>

          <div>

            <button
              type="button"
              onclick="changeQuantity('${item.id}', 1)">
              +
            </button>

            ${item.quantity}

            <button
              type="button"
              onclick="changeQuantity('${item.id}', -1)">
              −
            </button>

            <button
              type="button"
              onclick="removeFromCart('${item.id}')">
              حذف
            </button>

          </div>

        </div>

      </div>

    `).join("");
}

function changeQuantity(id, amount) {

  const item =
    cart.find(
      item => String(item.id) === String(id)
    );

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {

    removeFromCart(id);

    return;
  }

  saveCart();

  renderCart();
}

function removeFromCart(id) {

  cart =
    cart.filter(
      item => String(item.id) !== String(id)
    );

  saveCart();

  renderCart();
}

function openCart() {

  document.getElementById("drawer")
    ?.classList.add("open");

  document.getElementById("backdrop")
    ?.classList.add("show");
}

function closeCart() {

  document.getElementById("drawer")
    ?.classList.remove("open");

  document.getElementById("backdrop")
    ?.classList.remove("show");
}

function sendWhatsApp() {

  if (!cart.length) {

    alert("سبد خرید خالی است.");

    return;
  }

  if (!WHATSAPP_NUMBER) {

    alert(
      "شماره واتساپ فروشگاه هنوز در app.js تنظیم نشده است."
    );

    return;
  }

  let message =
    "سلام، برای خرید این محصولات پیام می‌دهم:%0A%0A";

  cart.forEach((item, index) => {

    message +=
      `${index + 1}. ${item.name} - تعداد: ${item.quantity}%0A`;

  });

  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.quantity || 0),
      0
    );

  message +=
    `%0Aمجموع: ${formatPrice(total)} تومان`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
    "_blank"
  );
}

function saveCart() {

  localStorage.setItem(
    "gallery_sang_cart",
    JSON.stringify(cart)
  );
}

function formatPrice(price) {

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return "۰";
  }

  return Number(price)
    .toLocaleString("fa-IR");
}

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}

function showError(message) {

  console.error(message);

  const container =
    document.getElementById("productsGrid");

  if (container) {

    container.innerHTML =
      `<div class="loading">${escapeHtml(message)}</div>`;

  }
}
