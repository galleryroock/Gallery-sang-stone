// ==========================================
// پنل مدیریت گالری سنگ طبیعی - نسخه پایدار
// ==========================================

let supabaseClient = null;

// نمایش پیام روی صفحه
function showAdminMessage(message, type = "error") {
  let box = document.getElementById("adminStatus");

  if (!box) {
    box = document.createElement("div");
    box.id = "adminStatus";

    box.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;" +
      "padding:14px 16px;border-radius:12px;font-family:inherit;" +
      "font-size:14px;line-height:1.8;box-shadow:0 4px 20px rgba(0,0,0,.15);" +
      "background:#fff;border:1px solid #ddd;white-space:pre-line;";

    document.body.appendChild(box);
  }

  box.textContent = message;
  box.style.color = type === "success" ? "#137333" : "#b00020";
  box.style.borderColor =
    type === "success" ? "#9bd6aa" : "#f0a0aa";
  box.style.display = "block";
}

function hideAdminMessage() {
  const box = document.getElementById("adminStatus");
  if (box) box.style.display = "none";
}

// ==========================================
// اتصال به Supabase
// ==========================================
function initSupabase() {
  try {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      showAdminMessage(
        "کتابخانه Supabase بارگذاری نشده است.\nصفحه را با Chrome دوباره باز کنید."
      );
      return false;
    }

    if (
      typeof SUPABASE_URL === "undefined" ||
      typeof SUPABASE_KEY === "undefined"
    ) {
      showAdminMessage(
        "فایل config.js پیدا نشد یا تنظیمات Supabase درست نیست."
      );
      return false;
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      showAdminMessage(
        "آدرس یا کلید Supabase خالی است.\nفایل config.js را بررسی کنید."
      );
      return false;
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    return true;

  } catch (error) {
    console.error("Supabase init error:", error);

    showAdminMessage(
      "خطا در اتصال به Supabase:\n" +
      (error.message || String(error))
    );

    return false;
  }
}

// ==========================================
// ورود مدیر
// ==========================================
async function adminLogin() {

  hideAdminMessage();

  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");

  const email = emailInput
    ? emailInput.value.trim()
    : "";

  const password = passwordInput
    ? passwordInput.value
    : "";

  if (!email || !password) {
    showAdminMessage(
      "لطفاً ایمیل و رمز عبور را وارد کنید."
    );
    return;
  }

  if (!supabaseClient) {
    if (!initSupabase()) {
      return;
    }
  }

  const button = document.querySelector(
    ".login-card .primary-btn"
  );

  if (button) {
    button.disabled = true;
    button.textContent = "در حال ورود...";
  }

  try {

    const result =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    const data = result.data;
    const error = result.error;

    if (error) {

      console.error("Login error:", error);

      let message =
        error.message || "ورود ناموفق بود.";

      if (
        /invalid login credentials/i.test(message)
      ) {
        message =
          "ایمیل یا رمز عبور اشتباه است.\n" +
          "ایمیل: galleryroock@gmail.com";
      }

      showAdminMessage(
        "ورود ناموفق بود ❌\n\n" + message
      );

      return;
    }

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

    showAdminMessage(
      "ورود با موفقیت انجام شد ✅",
      "success"
    );

    await loadProducts();

  } catch (error) {

    console.error("Unexpected login error:", error);

    showAdminMessage(
      "خطای غیرمنتظره هنگام ورود ❌\n\n" +
      (error.message || String(error))
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "ورود به پنل";
    }
  }
}

// ==========================================
// خروج
// ==========================================
async function adminLogout() {

  if (!supabaseClient) {
    if (!initSupabase()) return;
  }

  try {

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      showAdminMessage(
        "خطا در خروج:\n" + error.message
      );
      return;
    }

    const panel =
      document.getElementById("panel");

    const loginBox =
      document.getElementById("loginBox");

    if (panel) {
      panel.style.display = "none";
    }

    if (loginBox) {
      loginBox.style.display = "block";
    }

    showAdminMessage(
      "از حساب خارج شدید."
    );

  } catch (error) {

    showAdminMessage(
      "خطا در خروج:\n" +
      (error.message || String(error))
    );
  }
}

// ==========================================
// دریافت محصولات
// ==========================================
async function loadProducts() {

  if (!supabaseClient) {
    if (!initSupabase()) return;
  }

  try {

    const { data, error } =
      await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error(
        "خطا در دریافت محصولات:",
        error
      );
      return;
    }

    displayProducts(data || []);

    updateProductCount(data || []);

  } catch (error) {

    console.error(
      "خطای دریافت محصولات:",
      error
    );
  }
}

// ==========================================
// نمایش محصولات
// ==========================================
function displayProducts(products) {

  const container =
    document.getElementById("productsList") ||
    document.getElementById("registeredProducts");

  if (!container) return;

  container.innerHTML = "";

  if (!products || products.length === 0) {

    container.innerHTML =
      '<div class="empty-products">' +
      "هنوز محصولی ثبت نشده است." +
      "</div>";

    return;
  }

  products.forEach(product => {

    const item =
      document.createElement("div");

    item.className =
      "product-admin-item";

    item.innerHTML = `

      <div class="product-admin-image">

        ${
          product.image_url

            ? `<img
                src="${escapeHtml(product.image_url)}"
                alt="${escapeHtml(
                  product.name || "محصول"
                )}">`

            : `<div>بدون تصویر</div>`
        }

      </div>

      <div class="product-admin-info">

        <h3>
          ${escapeHtml(
            product.name || "بدون نام"
          )}
        </h3>

        <p>
          قیمت:
          ${formatPrice(product.price)}
          تومان
        </p>

        <p>
          دسته‌بندی:
          ${escapeHtml(
            product.category || "-"
          )}
        </p>

      </div>

      <button
        type="button"
        onclick="deleteProduct('${escapeHtml(
          product.id
        )}')"
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

  if (!supabaseClient) {
    if (!initSupabase()) return;
  }

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

  try {

    const { error } =
      await supabaseClient
        .from("products")
        .insert([{
          name: name,
          price: Number(price),
          category: category || null,
          image_url: imageUrl || null,
          description: description || null
        }]);

    if (error) {

      console.error(error);

      alert(
        "محصول اضافه نشد ❌\n\n" +
        error.message
      );

      return;
    }

    alert(
      "محصول با موفقیت اضافه شد ✅"
    );

    clearProductForm();

    await loadProducts();

  } catch (error) {

    alert(
      "خطا هنگام افزودن محصول ❌\n\n" +
      (error.message || String(error))
    );
  }
}

// ==========================================
// حذف محصول
// ==========================================
async function deleteProduct(id) {

  if (!supabaseClient) {
    if (!initSupabase()) return;
  }

  if (
    !confirm(
      "آیا از حذف این محصول مطمئن هستید؟"
    )
  ) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "حذف محصول انجام نشد ❌\n\n" +
      error.message
    );

    return;
  }

  alert(
    "محصول حذف شد ✅"
  );

  await loadProducts();
}

// ==========================================
// پاک کردن فرم
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

  const preview =
    document.getElementById(
      "imagePreview"
    );

  if (preview) {
    preview.style.display = "none";
  }
}

// ==========================================
// بررسی ورود قبلی
// ==========================================
async function checkAdmin() {

  if (!initSupabase()) {
    return;
  }

  try {

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {

      console.error(
        "Session error:",
        error
      );

      return;
    }

    const loginBox =
      document.getElementById("loginBox");

    const panel =
      document.getElementById("panel");

    if (data && data.session) {

      if (loginBox) {
        loginBox.style.display = "none";
      }

      if (panel) {
        panel.style.display = "block";
      }

      await loadProducts();

    } else {

      if (loginBox) {
        loginBox.style.display = "block";
      }

      if (panel) {
        panel.style.display = "none";
      }
    }

  } catch (error) {

    console.error(
      "checkAdmin error:",
      error
    );
  }
}

// ==========================================
// ابزارها
// ==========================================
function updateProductCount(products) {

  const element =
    document.getElementById(
      "statProducts"
    );

  if (element) {
    element.textContent =
      products ? products.length : 0;
  }
}

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

function formatPrice(price) {

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return "0";
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

// ==========================================
// شروع برنامه
// ==========================================
document.addEventListener(
  "DOMContentLoaded",
  function () {

    setTimeout(
      checkAdmin,
      100
    );

  }
);
