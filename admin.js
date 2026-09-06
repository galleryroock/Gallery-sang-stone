const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ورود مدیر
async function adminLogin() {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  if (!email || !password) {
    alert("ایمیل و رمز عبور را وارد کنید");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("ورود ناموفق بود: " + error.message);
    return;
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("panel").style.display = "block";

  loadProducts();
}

// خروج مدیر
async function adminLogout() {
  await supabaseClient.auth.signOut();

  document.getElementById("panel").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
}

// دریافت محصولات از Supabase
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطا در دریافت محصولات:", error);
    return;
  }

  console.log("محصولات:", data);
}

// بررسی ورود قبلی
async function checkAdmin() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("panel").style.display = "block";

    loadProducts();
  }
}

checkAdmin();
