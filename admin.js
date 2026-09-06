let supabaseClient = null;

function showAdminMessage(message, type = "error") {
  let box = document.getElementById("adminStatus");

  if (!box) {
    box = document.createElement("div");
    box.id = "adminStatus";
    box.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;" +
      "padding:14px 16px;border-radius:12px;font-family:inherit;" +
      "font-size:14px;line-height:1.8;background:#fff;" +
      "border:1px solid #ddd;box-shadow:0 4px 20px rgba(0,0,0,.15);";
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.style.color = type === "success" ? "#137333" : "#b00020";
  box.style.borderColor = type === "success" ? "#9bd6aa" : "#f0a0aa";
}

function hideAdminMessage() {
  const box = document.getElementById("adminStatus");
  if (box) box.style.display = "none";
}

function initSupabase() {
  try {
    if (!window.supabase) {
      showAdminMessage("کتابخانه Supabase بارگذاری نشده است.");
      return false;
    }

    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_KEY;

    if (!url || !key) {
      showAdminMessage("آدرس یا کلید Supabase پیدا نشد.");
      return false;
    }

    supabaseClient = window.supabase.createClient(url, key);
    return true;

  } catch (error) {
    showAdminMessage(
      "خطا در اتصال به Supabase:\n" +
      (error.message || String(error))
    );
    return false;
  }
}

async function adminLogin() {
  hideAdminMessage();

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!email || !password) {
    showAdminMessage("ایمیل و رمز عبور را وارد کنید.");
    return;
  }

  if (!supabaseClient) {
    if (!initSupabase()) return;
  }

  const button = document.querySelector(".login-card .primary-btn");

  if (button) {
    button.disabled = true;
    button.textContent = "در حال ورود...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      showAdminMessage(
        "ورود ناموفق بود ❌\n\n" +
        error.message
      );
      return;
    }

    document.getElementById("loginBox").style.display = "none";
    document.getElementById("panel").style.display = "block";

    showAdminMessage("ورود با موفقیت انجام شد ✅", "success");

    await loadProducts();

  } catch (error) {
    showAdminMessage(
      "خطای ورود ❌\n\n" +
      (error.message || String(error))
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "ورود به پنل";
    }
  }
}

async function adminLogout() {
  if (!supabaseClient) return;

  await supabaseClient.auth.signOut();

  document.getElementById("panel").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showAdminMessage(
      "خطا در دریافت محصولات:\n" +
      error.message
    );
    return;
  }

  displayProducts(data);
  updateProductCount(data);
}

function displayProducts(products) {
  const container =
    document.getElementById("productsList") ||
    document.getElementById("registeredProducts");

  if (!container) return;

  container.innerHTML = "";

  if (!products || products.length === 0) {
    container.innerHTML =
      '<div class="empty-products">هنوز محصولی ثبت نشده است.</div>';
    return;
  }

  products.forEach(product => {
    const item = document.createElement("div");
    item.className = "product-admin-item";

    item.innerHTML = `
      <div class="product-admin-image">
        ${
          product.image_url
            ? `<img src="${escapeHtml(product.image_url)}"
                 alt="${escapeHtml(product.name || "محصول")}">`
            : `<div>بدون تصویر</div>`
        }
      </div>

      <div class="product-admin-info">
        <h3>${escapeHtml(product.name || "بدون نام")}</h3>
        <p>قیمت: ${formatPrice(product.price)} تومان</p>
        <p>دسته‌بندی: ${escapeHtml(product.category || "-")}</p>
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

async function addProduct() {
  const name = getValue([
    "productName",
    "name",
    "productTitle"
  ]);

  const price = getValue([
    "productPrice",
    "price"
  ]);

  const category = getValue([
    "productCategory",
    "category"
  ]);

  const imageUrl = getValue([
    "productImage",
    "imageUrl",
    "image_url"
  ]);

  const description = getValue([
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

  const { error } = await supabaseClient
    .from("products")
    .insert([{
      name: name,
      price: Number(price),
      category: category || null,
      image_url: imageUrl || null,
      description: description || null
    }]);

  if (error) {
    alert("محصول اضافه نشد ❌\n\n" + error.message);
    return;
  }

  alert("محصول با موفقیت اضافه شد ✅");

  clearProductForm();
  await loadProducts();
}

async function deleteProduct(id) {
  if (!confirm("آیا از حذف این محصول مطمئن هستید؟")) {
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert("حذف محصول انجام نشد ❌\n\n" + error.message);
    return;
  }

  alert("محصول حذف شد ✅");
  await loadProducts();
}

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
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
}

function updateProductCount(products) {
  const element = document.getElementById("statProducts");

  if (element) {
    element.textContent = products ? products.length : 0;
  }
}

function getValue(ids) {
  for (const id of ids) {
    const element = document.getElementById(id);

    if (element) {
      return element.value.trim();
    }
  }

  return "";
}

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "0";
  }

  return Number(price).toLocaleString("fa-IR");
}

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

async function checkAdmin() {
  if (!supabaseClient) {
    if (!initSupabase()) return;
  }

  const { data } =
    await supabaseClient.auth.getSession();

  if (data && data.session) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("panel").style.display = "block";

    await loadProducts();
  } else {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("panel").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(checkAdmin, 300);
});
