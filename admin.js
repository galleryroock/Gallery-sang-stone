// ==========================================
// اتصال به Supabase
// ==========================================

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==========================================
// ورود مدیر
// ==========================================

async function adminLogin() {

  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    alert("ایمیل و رمز عبور را وارد کنید");
    return;
  }

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {
    alert("ورود ناموفق بود:\n" + error.message);
    return;
  }

  const loginBox = document.getElementById("loginBox");
  const panel = document.getElementById("panel");

  if (loginBox) loginBox.style.display = "none";
  if (panel) panel.style.display = "block";

  await loadProducts();

  alert("با موفقیت وارد شدید ✅");
}


// ==========================================
// خروج مدیر
// ==========================================

async function adminLogout() {

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("خطا در خروج از حساب");
    return;
  }

  const panel = document.getElementById("panel");
  const loginBox = document.getElementById("loginBox");

  if (panel) panel.style.display = "none";
  if (loginBox) loginBox.style.display = "block";
}


// ==========================================
// دریافت محصولات از Supabase
// ==========================================

async function loadProducts() {

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error("خطا در دریافت محصولات:", error);
    return;
  }

  console.log("محصولات:", data);

  displayProducts(data);

  updateProductCount(data);
}


// ==========================================
// نمایش محصولات در پنل مدیریت
// ==========================================

function displayProducts(products) {

  const container =
    document.getElementById("productsList") ||
    document.getElementById("registeredProducts");

  if (!container) {
    console.log("محل نمایش محصولات پیدا نشد");
    return;
  }

  container.innerHTML = "";

  if (!products || products.length === 0) {

    container.innerHTML = `
      <div class="empty-products">
        هنوز محصولی ثبت نشده است.
      </div>
    `;

    return;
  }


  products.forEach(product => {

    const item = document.createElement("div");

    item.className = "product-admin-item";

    item.innerHTML = `

      <div class="product-admin-image">

        ${
          product.image_url
          ?
          `<img src="${escapeHtml(product.image_url)}"
                alt="${escapeHtml(product.name || "محصول")}">`
          :
          `<div>بدون تصویر</div>`
        }

      </div>


      <div class="product-admin-info">

        <h3>
          ${escapeHtml(product.name || "بدون نام")}
        </h3>

        <p>
          قیمت:
          ${formatPrice(product.price)}
          تومان
        </p>

        <p>
          دسته‌بندی:
          ${escapeHtml(product.category || "-")}
        </p>

      </div>


      <button
        type="button"
        onclick="deleteProduct('${product.id}')"
        class="delete-product-btn">

        حذف محصول

      </button>

    `;

    container.appendChild(item);

  });

}


// ==========================================
// افزودن محصول
// ==========================================

async function addProduct() {

  const name =
    getValue([
      "productName",
      "name",
      "productTitle"
    ]);

  const price =
    getValue([
      "productPrice",
      "price"
    ]);

  const category =
    getValue([
      "productCategory",
      "category"
    ]);

  const imageUrl =
    getValue([
      "productImage",
      "imageUrl",
      "image_url"
    ]);

  const description =
    getValue([
      "productDescription",
      "description"
    ]);


  if (!name) {
    alert("نام محصول را وارد کنید");
    return;
  }

  if (!price) {
    alert("قیمت محصول را وارد کنید");
    return;
  }


  const { data, error } = await supabaseClient
    .from("products")
    .insert([
      {
        name: name,
        price: Number(price),
        category: category || null,
        image_url: imageUrl || null,
        description: description || null
      }
    ])
    .select();


  if (error) {

    console.error("خطا:", error);

    alert(
      "محصول اضافه نشد ❌\n\n" +
      error.message
    );

    return;
  }


  alert("محصول با موفقیت اضافه شد ✅");


  clearProductForm();

  await loadProducts();
}


// ==========================================
// حذف محصول
// ==========================================

async function deleteProduct(id) {

  const confirmDelete =
    confirm("آیا از حذف این محصول مطمئن هستید؟");

  if (!confirmDelete) {
    return;
  }


  const { error } =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);


  if (error) {

    console.error(error);

    alert(
      "حذف محصول انجام نشد ❌\n\n" +
      error.message
    );

    return;
  }


  alert("محصول حذف شد ✅");

  await loadProducts();
}


// ==========================================
// پاک کردن فرم محصول
// ==========================================

function clearProductForm() {

  const ids = [
    "productName",
    "name",
    "productTitle",
    "productPrice",
    "price",
    "productCategory",
    "category",
    "productImage",
    "imageUrl",
    "image_url",
    "productDescription",
    "description"
  ];


  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.value = "";
    }

  });

}


// ==========================================
// بررسی ورود قبلی مدیر
// ==========================================

async function checkAdmin() {

  const {
    data
  } = await supabaseClient.auth.getSession();


  if (data && data.session) {

    const loginBox =
      document.getElementById("loginBox");

    const panel =
      document.getElementById("panel");


    if (loginBox) {
      loginBox.style.display = "none";
    }

    if (panel) {
      panel.style.display = "block";
    }


    await loadProducts();

  } else {

    const loginBox =
      document.getElementById("loginBox");

    const panel =
      document.getElementById("panel");


    if (loginBox) {
      loginBox.style.display = "block";
    }

    if (panel) {
      panel.style.display = "none";
    }

  }

}


// ==========================================
// شمارش محصولات
// ==========================================

function updateProductCount(products) {

  const element =
    document.getElementById("statProducts");

  if (!element) return;

  element.textContent =
    products ? products.length : 0;
}


// ==========================================
// گرفتن مقدار فیلد
// ==========================================

function getValue(ids) {

  for (const id of ids) {

    const element =
      document.getElementById(id);

    if (element) {

      return element.value.trim();

    }

  }

  return "";
}


// ==========================================
// فرمت قیمت
// ==========================================

function formatPrice(price) {

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return "0";
  }

  return Number(price).toLocaleString("fa-IR");
}


// ==========================================
// جلوگیری از HTML ناامن
// ==========================================

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ==========================================
// اجرای بررسی ورود هنگام باز شدن صفحه
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    checkAdmin();

  }
);
