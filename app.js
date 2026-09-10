/* Gallery Sang Stone - public storefront */

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


/* =========================
   SUPABASE
========================= */

function initSupabase() {
  try {
    if (!window.supabase) {
      showStoreError("کتابخانه Supabase بارگذاری نشده است.");
      return false;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) {
      showStoreError("آدرس یا کلید Supabase پیدا نشد.");
      return false;
    }

    supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_KEY
    );

    return true;

  } catch (error) {
    showStoreError("خطا در اتصال به Supabase: " + error.message);
    return false;
  }
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  const grid = document.getElementById("productsGrid");

  if (!supabaseClient) return;

  if (grid) {
    grid.innerHTML =
      '<div class="loading">در حال بارگذاری محصولات...</div>';
  }

  const { data, error } = await supabaseClient
    .from("gallerysang")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gallerysang error:", error);

    if (grid) {
      grid.innerHTML =
        '<div class="loading">خطا در دریافت محصولات. صفحه را دوباره باز کنید.</div>';
    }

    return;
  }

  allProducts = Array.isArray(data) ? data : [];
  filteredProducts = [...allProducts];

  renderCategories(allProducts);
  populateCategoryFilter(allProducts);
  renderProducts(filteredProducts);
}


/* =========================
   PRODUCTS
========================= */

function renderProducts(products) {
  const container = document.getElementById("productsGrid");

  if (!container) return;

  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML =
      '<div class="loading">هنوز محصولی برای نمایش ثبت نشده است.</div>';
    return;
  }

  products.forEach(product => {

    const card = document.createElement("article");
    card.className = "product";

    const imageUrl =
      product.image_url ||
      product.image ||
      product.imageurl ||
      "";

    const productName =
      product.name ||
      product.title ||
      "محصول بدون نام";

    const category =
      product.category ||
      product.category_name ||
      "سنگ طبیعی";

    const price =
      product.price ||
      product.amount ||
      0;

    const description =
      product.description ||
      product.desc ||
      "";

    const image = imageUrl
      ? `<img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(productName)}"
          loading="lazy"
          onerror="this.style.display='none';this.parentElement.classList.add('no-image')"
        >`
      : "";

    card.innerHTML = `
      <div class="product-img">
        ${image}
        <span class="badge">${escapeHtml(category)}</span>
      </div>

      <div class="product-body">

        <small>${escapeHtml(category)}</small>

        <h3>
          ${escapeHtml(productName)}
        </h3>

        <div class="price">
          ${formatPrice(price)} تومان
        </div>

        <div class="product-actions">

          <button
            class="mini"
            type="button"
            data-action="view"
          >
            مشاهده
          </button>

          <button
            class="mini"
            type="button"
            data-action="add"
          >
            افزودن به سبد
          </button>

        </div>

      </div>
    `;


    card
      .querySelector('[data-action="view"]')
      ?.addEventListener("click", () => {
        openProductModal(product);
      });


    card
      .querySelector('[data-action="add"]')
      ?.addEventListener("click", () => {
        addToCart(product);
      });


    container.appendChild(card);
  });
}


/* =========================
   CATEGORIES
========================= */

function renderCategories(products) {

  const grid = document.getElementById("categoryGrid");

  if (!grid) return;

  const counts = {};

  products.forEach(product => {

    const category =
      (
        product.category ||
        product.category_name ||
        "سنگ طبیعی"
      ).trim();

    counts[category] =
      (counts[category] || 0) + 1;

  });


  const categories =
    Object.entries(counts);


  if (categories.length === 0) {

    grid.innerHTML = `
      <div class="category">
        <div class="icon">◇</div>
        <h3>سنگ‌های طبیعی</h3>
        <span>محصولات گالری</span>
      </div>
    `;

    return;
  }


  grid.innerHTML =
    categories
      .map(([name, count]) => `

        <div
          class="category"
          data-category="${escapeHtml(name)}"
        >

          <div class="icon">
            ${categoryIcon(name)}
          </div>

          <h3>
            ${escapeHtml(name)}
          </h3>

          <span>
            ${count.toLocaleString("fa-IR")} محصول
          </span>

        </div>

      `)
      .join("");


  grid
    .querySelectorAll(".category")
    .forEach(item => {

      item.addEventListener("click", () => {

        const category =
          item.dataset.category;

        const filter =
          document.getElementById("categoryFilter");

        if (filter) {
          filter.value = category;
        }

        applyFilters();

        document
          .getElementById("products")
          ?.scrollIntoView({
            behavior: "smooth"
          });

      });

    });

}


/* =========================
   CATEGORY FILTER
========================= */

function populateCategoryFilter(products) {

  const select =
    document.getElementById("categoryFilter");

  if (!select) return;

  const current =
    select.value;


  const categories = [
    ...new Set(

      products
        .map(p =>
          (
            p.category ||
            p.category_name ||
            ""
          ).trim()
        )

        .filter(Boolean)

    )
  ];


  select.innerHTML =
    '<option value="">همه دسته‌ها</option>';


  categories.forEach(category => {

    const option =
      document.createElement("option");

    option.value = category;
    option.textContent = category;

    select.appendChild(option);

  });


  if (categories.includes(current)) {
    select.value = current;
  }

}


/* =========================
   EVENTS
========================= */

function bindEvents() {

  const search =
    document.getElementById("search");

  const categoryFilter =
    document.getElementById("categoryFilter");


  search?.addEventListener(
    "input",
    applyFilters
  );


  categoryFilter?.addEventListener(
    "change",
    applyFilters
  );


  document
    .getElementById("cartBtn")
    ?.addEventListener(
      "click",
      openCart
    );


  document
    .getElementById("closeCart")
    ?.addEventListener(
      "click",
      closeCart
    );


  document
    .getElementById("backdrop")
    ?.addEventListener(
      "click",
      closeCart
    );


  document
    .getElementById("modalClose")
    ?.addEventListener(
      "click",
      closeProductModal
    );


  document
    .getElementById("productModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target.id ===
          "productModal"
        ) {
          closeProductModal();
        }

      }
    );


  document
    .getElementById("modalAdd")
    ?.addEventListener(
      "click",
      () => {

        if (selectedProduct) {

          addToCart(
            selectedProduct
          );

          closeProductModal();

        }

      }
    );


  document
    .getElementById("whatsappOrder")
    ?.addEventListener(
      "click",
      sendWhatsAppOrder
    );

}


/* =========================
   FILTER
========================= */

function applyFilters() {

  const searchValue =
    (
      document
        .getElementById("search")
        ?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const category =
    document
      .getElementById("categoryFilter")
      ?.value ||
    "";


  filteredProducts =
    allProducts.filter(product => {

      const name =
        String(
          product.name ||
          product.title ||
          ""
        ).toLowerCase();


      const description =
        String(
          product.description ||
          product.desc ||
          ""
        ).toLowerCase();


      const productCategory =
        String(
          product.category ||
          product.category_name ||
          ""
        );


      const matchesSearch =
        !searchValue ||
        name.includes(searchValue) ||
        description.includes(searchValue) ||
        productCategory
          .toLowerCase()
          .includes(searchValue);


      const matchesCategory =
        !category ||
        productCategory === category;


      return (
        matchesSearch &&
        matchesCategory
      );

    });


  renderProducts(
    filteredProducts
  );

}


/* =========================
   CART
========================= */

function addToCart(product) {

  const existing =
    cart.find(
      item =>
        String(item.id) ===
        String(product.id)
    );


  const productName =
    product.name ||
    product.title ||
    "محصول";


  const productPrice =
    product.price ||
    product.amount ||
    0;


  const imageUrl =
    product.image_url ||
    product.image ||
    "";


  const category =
    product.category ||
    product.category_name ||
    "";


  if (existing) {

    existing.quantity += 1;

  } else {

    cart.push({

      id: product.id,

      name: productName,

      price:
        Number(productPrice) || 0,

      image_url: imageUrl,

      category: category,

      quantity: 1

    });

  }


  saveCart();
  renderCart();
  openCart();

}


/* =========================
   REMOVE CART
========================= */

function removeFromCart(id) {

  cart =
    cart.filter(
      item =>
        String(item.id) !==
        String(id)
    );


  saveCart();
  renderCart();

}


/* =========================
   QUANTITY
========================= */

function changeQuantity(
  id,
  amount
) {

  const item =
    cart.find(
      item =>
        String(item.id) ===
        String(id)
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


/* =========================
   RENDER CART
========================= */

function renderCart() {

  const items =
    document.getElementById(
      "cartItems"
    );


  const count =
    document.getElementById(
      "cartCount"
    );


  const total =
    document.getElementById(
      "cartTotal"
    );


  const itemCount =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity || 0
        ),
      0
    );


  const totalPrice =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          Number(item.price) || 0
        ) *
        Number(
          item.quantity || 0
        ),
      0
    );


  if (count) {

    count.textContent =
      itemCount.toLocaleString(
        "fa-IR"
      );

  }


  if (total) {

    total.textContent =
      formatPrice(totalPrice) +
      " تومان";

  }


  if (!items) return;


  if (cart.length === 0) {

    items.innerHTML =
      '<div class="loading">سبد خرید خالی است.</div>';

    return;

  }


  items.innerHTML =
    cart
      .map(item => `

        <div class="cart-row">

          ${
            item.image_url

              ? `
                <img
                  src="${escapeHtml(
                    item.image_url
                  )}"
                  alt="${escapeHtml(
                    item.name
                  )}"
                >
              `

              : `
                <div
                  style="
                    width:65px;
                    height:65px;
                    border-radius:12px;
                    background:#eee;
                    display:grid;
                    place-items:center
                  "
                >
                  ◇
                </div>
              `
          }


          <div style="flex:1">

            <h4>
              ${escapeHtml(
                item.name
              )}
            </h4>


            <div>
              ${formatPrice(
                item.price
              )} تومان
            </div>


            <div
              style="
                display:flex;
                gap:6px;
                align-items:center;
                margin-top:8px
              "
            >

              <button
                type="button"
                data-plus="${item.id}"
              >
                +
              </button>


              <span>
                ${Number(
                  item.quantity
                ).toLocaleString(
                  "fa-IR"
                )}
              </span>


              <button
                type="button"
                data-minus="${item.id}"
              >
                −
              </button>


              <button
                type="button"
                data-remove="${item.id}"
                style="margin-right:auto"
              >
                حذف
              </button>

            </div>

          </div>

        </div>

      `)
      .join("");


  items
    .querySelectorAll("[data-plus]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          changeQuantity(
            button.dataset.plus,
            1
          )
      );

    });


  items
    .querySelectorAll("[data-minus]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          changeQuantity(
            button.dataset.minus,
            -1
          )
      );

    });


  items
    .querySelectorAll("[data-remove]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          removeFromCart(
            button.dataset.remove
          )
      );

    });

}


/* =========================
   CART OPEN / CLOSE
========================= */

function openCart() {

  document
    .getElementById("drawer")
    ?.classList.add("open");


  document
    .getElementById("backdrop")
    ?.classList.add("show");

}


function closeCart() {

  document
    .getElementById("drawer")
    ?.classList.remove("open");


  document
    .getElementById("backdrop")
    ?.classList.remove("show");

}


/* =========================
   PRODUCT MODAL
========================= */

function openProductModal(product) {

  selectedProduct = product;


  const modal =
    document.getElementById(
      "productModal"
    );


  const img =
    document.getElementById(
      "modalImg"
    );


  const cat =
    document.getElementById(
      "modalCat"
    );


  const title =
    document.getElementById(
      "modalTitle"
    );


  const desc =
    document.getElementById(
      "modalDesc"
    );


  const price =
    document.getElementById(
      "modalPrice"
    );


  const imageUrl =
    product.image_url ||
    product.image ||
    "";


  const productName =
    product.name ||
    product.title ||
    "محصول بدون نام";


  const category =
    product.category ||
    product.category_name ||
    "سنگ طبیعی";


  const description =
    product.description ||
    product.desc ||
    "توضیحی برای این محصول ثبت نشده است.";


  const productPrice =
    product.price ||
    product.amount ||
    0;


  if (img) {

    img.src = imageUrl;
    img.alt = productName;

    img.style.display =
      imageUrl
        ? "block"
        : "none";

  }


  if (cat) {

    cat.textContent =
      category;

  }


  if (title) {

    title.textContent =
      productName;

  }


  if (desc) {

    desc.textContent =
      description;

  }


  if (price) {

    price.textContent =
      formatPrice(
        productPrice
      ) +
      " تومان";

  }


  modal?.classList.add("show");

}


/* =========================
   CLOSE MODAL
========================= */

function closeProductModal() {

  document
    .getElementById(
      "productModal"
    )
    ?.classList.remove("show");


  selectedProduct = null;

}


/* =========================
   WHATSAPP
========================= */

function sendWhatsAppOrder() {

  if (cart.length === 0) {

    alert(
      "سبد خرید خالی است."
    );

    return;

  }


  const lines = [

    "سلام، برای خرید این محصولات پیام می‌دهم:",

    ""

  ];


  cart.forEach(
    (item, index) => {

      lines.push(

        `${index + 1}. ${
          item.name
        } - تعداد: ${
          item.quantity
        } - ${
          formatPrice(
            item.price *
            item.quantity
          )
        } تومان`

      );

    }
  );


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        (
          Number(item.price) || 0
        ) *
        Number(
          item.quantity || 0
        ),
      0
    );


  lines.push("");

  lines.push(
    "مجموع: " +
    formatPrice(total) +
    " تومان"
  );


  const text =
    encodeURIComponent(
      lines.join("\n")
    );


  if (!WHATSAPP_NUMBER) {

    alert(
      "شماره واتساپ فروشگاه هنوز در app.js تنظیم نشده است."
    );

    return;

  }


  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`,
    "_blank"
  );

}


/* =========================
   LOCAL STORAGE
========================= */

function saveCart() {

  localStorage.setItem(
    "gallery_sang_cart",
    JSON.stringify(cart)
  );

}


/* =========================
   PRICE
========================= */

function formatPrice(value) {

  const number =
    Number(value);


  if (!Number.isFinite(number)) {
    return "۰";
  }


  return Math
    .round(number)
    .toLocaleString("fa-IR");

}


/* =========================
   CATEGORY ICON
========================= */

function categoryIcon(name) {

  const text =
    String(name)
      .toLowerCase();


  if (
    text.includes("عقیق")
  ) {
    return "◈";
  }


  if (
    text.includes("شجر")
  ) {
    return "❈";
  }


  if (
    text.includes("ژئود")
  ) {
    return "◉";
  }


  if (
    text.includes("نگین")
  ) {
    return "◇";
  }


  if (
    text.includes("یشم")
  ) {
    return "◆";
  }


  return "✦";

}


/* =========================
   SECURITY
========================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================
   ERROR
========================= */

function showStoreError(message) {

  console.error(message);


  const grid =
    document.getElementById(
      "productsGrid"
    );


  if (grid) {

    grid.innerHTML =
      `<div class="loading">
        ${escapeHtml(message)}
      </div>`;

  }

}
