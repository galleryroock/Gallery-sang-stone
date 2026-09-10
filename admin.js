let supabaseClient = null;
let adminProducts = [];
let adminCategories = [];

const PRODUCT_TABLE = "gallerysang";

function field(obj, names, fallback=null) {
  if (!obj) return fallback;
  const keys = Object.keys(obj);
  for (const name of names) {
    const exact = keys.find(k => k === name);
    if (exact) return obj[exact];
    const lower = keys.find(k => k.toLowerCase() === String(name).toLowerCase());
    if (lower) return obj[lower];
  }
  return fallback;
}

function normalizeProduct(row) {
  return {
    id: field(row, ["id"]),
    name: field(row, ["Name","name"], "محصول"),
    price: field(row, ["Price","price"], 0),
    category: field(row, ["Category","category"], "سنگ طبیعی"),
    image_url: field(row, ["Image_url","image_url","Image URL","image"]),
    description: field(row, ["description","Description"], ""),
    created_at: field(row, ["Created","created_at","created"], null),
    stock: field(row, ["stock","Stock"], null),
    active: field(row, ["active","Active"], true),
    _raw: row
  };
}

function galleryProductPayload(data) {
  return {
    "Name": data.name,
    "Price": data.price,
    "Category": data.category || null,
    "Image_url": data.image_url || null,
    "description": data.description || null
  };
}

function showAdminMessage(message,type="error"){
  let box=document.getElementById("adminStatus");
  if(!box){box=document.createElement("div");box.id="adminStatus";box.className="admin-status";document.body.appendChild(box);}
  box.hidden=false; box.textContent=message; box.className="admin-status "+(type==="success"?"success":"error");
}
function hideAdminMessage(){const b=document.getElementById("adminStatus");if(b)b.hidden=true;}

function initSupabase(){
  try{
    if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_KEY){showAdminMessage("تنظیمات Supabase پیدا نشد.");return false;}
    supabaseClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);
    return true;
  }catch(e){showAdminMessage("خطا در اتصال به Supabase: "+e.message);return false;}
}

async function adminLogin(){
  hideAdminMessage();
  const email=document.getElementById("adminEmail").value.trim();
  const password=document.getElementById("adminPassword").value;
  if(!email||!password)return showAdminMessage("ایمیل و رمز عبور را وارد کنید.");
  if(!supabaseClient&&!initSupabase())return;
  const button=document.querySelector(".login-card .primary-btn");
  if(button){button.disabled=true;button.textContent="در حال ورود...";}
  try{
    const {error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    const allowed=await ensureAdminRole();
    if(!allowed){await supabaseClient.auth.signOut();return;}
    await showPanel();
    showAdminMessage("ورود با موفقیت انجام شد ✅","success");
  }catch(e){console.error(e);showAdminMessage("ورود ناموفق بود ❌\n"+(e.message||e));}
  finally{if(button){button.disabled=false;button.textContent="ورود به پنل";}}
}

async function ensureAdminRole(){
  const {data:userData,error:userError}=await supabaseClient.auth.getUser();
  if(userError||!userData?.user){showAdminMessage("کاربر مدیر پیدا نشد.");return false;}
  const {data:profile,error}=await supabaseClient.from("profiles").select("role").eq("id",userData.user.id).maybeSingle();
  if(error){showAdminMessage("جدول profiles یا دسترسی مدیر آماده نیست. فایل schema.sql را اجرا کنید.");return false;}
  if(profile?.role!=="admin"){showAdminMessage("این حساب دسترسی مدیر ندارد.");return false;}
  return true;
}

async function checkAdmin(){
  if(!supabaseClient&&!initSupabase())return;
  const {data}=await supabaseClient.auth.getSession();
  if(!data?.session){showLogin();return;}
  if(await ensureAdminRole())await showPanel(); else showLogin();
}
function showLogin(){document.getElementById("loginBox").style.display="block";document.getElementById("panel").style.display="none";}
async function showPanel(){
  document.getElementById("loginBox").style.display="none";document.getElementById("panel").style.display="block";
  await Promise.all([loadProducts(),loadCategories(),loadOrders()]);
}

async function adminLogout(){
  if(supabaseClient)await supabaseClient.auth.signOut();
  showLogin();hideAdminMessage();
}

async function loadProducts(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.from(PRODUCT_TABLE).select("*");
  if(error){console.error(error);return showAdminMessage("خطا در دریافت محصولات از gallerysang: "+error.message);}
  adminProducts=(data||[]).map(normalizeProduct).sort((a,b)=>{
    const da=a.created_at?new Date(a.created_at).getTime():0;
    const db=b.created_at?new Date(b.created_at).getTime():0;
    return db-da;
  });
  displayProducts(adminProducts);updateProductCount();populateProductCategorySelect();
}

function displayProducts(products){
  const c=document.getElementById("productsList");if(!c)return;
  if(!products.length){c.innerHTML='<div class="empty-products">هنوز محصولی ثبت نشده است.</div>';return;}
  c.innerHTML=products.map(p=>`
    <div class="product-admin-item">
      <div class="product-admin-image">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">`:"بدون تصویر"}</div>
      <div class="product-admin-info">
        <h3>${escapeHtml(p.name||"بدون نام")}</h3>
        <p>قیمت: ${formatPrice(p.price)} تومان</p><p>دسته: ${escapeHtml(p.category||"-")}</p>
        <p>موجودی: ${p.stock==null?"-":Number(p.stock).toLocaleString("fa-IR")} | ${p.active===false?"غیرفعال":"فعال"}</p>
      </div>
      <div class="admin-item-actions">
        <button type="button" class="mini" onclick="editProduct('${escapeJs(p.id)}')">ویرایش</button>
        <button type="button" class="mini danger" onclick="deleteProduct('${escapeJs(p.id)}')">حذف</button>
      </div>
    </div>`).join("");
}
function updateProductCount(){const e=document.getElementById("statProducts");if(e)e.textContent=adminProducts.filter(p=>p.active!==false).length.toLocaleString("fa-IR");}

async function saveProduct(){
  if(!supabaseClient)return;
  const id=document.getElementById("editingProductId").value;
  const payload={
    name:document.getElementById("productName").value.trim(),
    price:Number(document.getElementById("productPrice").value),
    category:document.getElementById("productCategory").value||null,
    image_url:document.getElementById("productImage").value.trim()||null,
    description:document.getElementById("productDescription").value.trim()||null
  };
  if(!payload.name)return showAdminMessage("نام محصول را وارد کنید.");
  if(!Number.isFinite(payload.price)||payload.price<0)return showAdminMessage("قیمت محصول صحیح نیست.");
  const btn=document.getElementById("saveProductBtn");btn.disabled=true;
  try{
    const dbPayload=galleryProductPayload(payload);
    const result=id
      ? await supabaseClient.from(PRODUCT_TABLE).update(dbPayload).eq("id",id)
      : await supabaseClient.from(PRODUCT_TABLE).insert(dbPayload);
    if(result.error)throw result.error;
    showAdminMessage(id?"محصول ویرایش شد ✅":"محصول اضافه شد ✅","success");
    resetProductForm();await loadProducts();
  }catch(e){console.error(e);showAdminMessage("ذخیره محصول انجام نشد: "+e.message);}
  finally{btn.disabled=false;}
}
function editProduct(id){
  const p=adminProducts.find(x=>String(x.id)===String(id));if(!p)return;
  document.getElementById("editingProductId").value=p.id;
  document.getElementById("productName").value=p.name||"";
  document.getElementById("productPrice").value=p.price??"";
  document.getElementById("productCategory").value=p.category||"";
  document.getElementById("productStock").value=p.stock??1;
  document.getElementById("productImage").value=p.image_url||"";
  document.getElementById("productDescription").value=p.description||"";
  document.getElementById("productActive").checked=p.active!==false;
  document.getElementById("productFormTitle").textContent="✏️ ویرایش محصول";
  document.getElementById("saveProductBtn").textContent="💾 ذخیره تغییرات";
  renderImagePreview();
  window.scrollTo({top:0,behavior:"smooth"});
}
async function deleteProduct(id){
  if(!confirm("آیا از حذف این محصول مطمئن هستید؟"))return;
  const {error}=await supabaseClient.from(PRODUCT_TABLE).delete().eq("id",id);
  if(error)return showAdminMessage("حذف انجام نشد: "+error.message);
  showAdminMessage("محصول حذف شد ✅","success");await loadProducts();
}
function resetProductForm(){
  ["editingProductId","productName","productPrice","productCategory","productImage","productDescription"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("productStock").value=1;document.getElementById("productActive").checked=true;
  document.getElementById("productFormTitle").textContent="➕ افزودن محصول جدید";
  document.getElementById("saveProductBtn").textContent="➕ افزودن محصول";
  document.getElementById("imagePreviewWrap").innerHTML="";
}
function populateProductCategorySelect(){
  const s=document.getElementById("productCategory");if(!s)return;
  const current=s.value;
  s.innerHTML='<option value="">انتخاب دسته‌بندی</option>';
  adminCategories.filter(c=>c.active!==false).forEach(c=>{const o=document.createElement("option");o.value=c.name;o.textContent=c.name;s.appendChild(o);});
  s.value=current;
}
function renderImagePreview(){
  const url=document.getElementById("productImage").value.trim();
  document.getElementById("imagePreviewWrap").innerHTML=url?`<img class="image-preview" src="${escapeHtml(url)}" alt="پیش‌نمایش">`:"";
}

async function loadCategories(){
  const {data,error}=await supabaseClient.from("categories").select("*").order("name");
  if(error){
    console.warn("categories table unavailable:",error.message);
    const names=[...new Set(adminProducts.map(p=>p.category).filter(Boolean))];
    adminCategories=names.map((name,i)=>({id:"local-"+i,name,icon:"◇",active:true,_local:true}));
  } else {
    adminCategories=data||[];
  }
  renderCategoriesAdmin();populateProductCategorySelect();
  const e=document.getElementById("statCats");if(e)e.textContent=adminCategories.filter(c=>c.active!==false).length.toLocaleString("fa-IR");
}
function renderCategoriesAdmin(){
  const c=document.getElementById("categoriesList");if(!c)return;
  c.innerHTML=adminCategories.length?adminCategories.map(x=>`
    <div class="category-admin-item"><span>${escapeHtml(x.icon||"◇")} ${escapeHtml(x.name)}</span>
      <button type="button" class="mini danger" onclick="deleteCategory('${escapeJs(x.id)}')">حذف</button>
    </div>`).join(""):'<div class="empty-products">دسته‌ای ثبت نشده است.</div>';
}
async function addCategory(){
  const name=document.getElementById("newCategoryName").value.trim();
  const icon=document.getElementById("newCategoryIcon").value.trim()||"◇";
  if(!name)return showAdminMessage("نام دسته را وارد کنید.");
  const {error}=await supabaseClient.from("categories").insert({name,icon,active:true});
  if(error)return showAdminMessage("افزودن دسته انجام نشد. ابتدا جدول categories را با schema.sql آماده کنید: "+error.message);
  document.getElementById("newCategoryName").value="";showAdminMessage("دسته اضافه شد ✅","success");await loadCategories();
}
async function deleteCategory(id){
  if(!confirm("دسته حذف شود؟ محصولات این دسته حذف نمی‌شوند."))return;
  const {error}=await supabaseClient.from("categories").delete().eq("id",id);
  if(error)return showAdminMessage("حذف دسته انجام نشد: "+error.message);
  await loadCategories();
}

async function loadOrders(){
  if(!supabaseClient)return;
  const {data,error}=await supabaseClient.from("orders").select("*, order_items(*)").order("created_at",{ascending:false});
  if(error){console.error(error);return showAdminMessage("خطا در دریافت سفارش‌ها: "+error.message);}
  const orders=data||[];
  document.getElementById("statOrders").textContent=orders.length.toLocaleString("fa-IR");
  const paid=orders.filter(o=>o.payment_status==="paid").reduce((s,o)=>s+Number(o.total_amount||0),0);
  document.getElementById("statSales").textContent=formatPrice(paid);
  const c=document.getElementById("ordersList");
  if(!orders.length){c.innerHTML='<div class="empty-products">هنوز سفارشی ثبت نشده است.</div>';return;}
  c.innerHTML=orders.map(o=>`
    <div class="order-card">
      <div class="order-head"><strong>سفارش ${escapeHtml(o.id.slice(0,8))}</strong><span>${formatDate(o.created_at)}</span></div>
      <p><b>مشتری:</b> ${escapeHtml(o.customer_name)} | <b>تلفن:</b> ${escapeHtml(o.phone)}</p>
      <p><b>آدرس:</b> ${escapeHtml(o.address)}</p>
      <div class="order-items">${(o.order_items||[]).map(i=>`<div>${escapeHtml(i.product_name)} × ${Number(i.quantity).toLocaleString("fa-IR")} — ${formatPrice(i.price)} تومان</div>`).join("")}</div>
      <div class="order-bottom"><b>مبلغ: ${formatPrice(o.total_amount)} تومان</b>
        <select onchange="updateOrderStatus('${escapeJs(o.id)}',this.value)">
          ${["new","confirmed","shipped","delivered","cancelled"].map(s=>`<option value="${s}" ${o.status===s?"selected":""}>${statusLabel(s)}</option>`).join("")}
        </select>
        <select onchange="updatePaymentStatus('${escapeJs(o.id)}',this.value)">
          ${["unpaid","paid","refunded"].map(s=>`<option value="${s}" ${o.payment_status===s?"selected":""}>${paymentLabel(s)}</option>`).join("")}
        </select>
      </div>
    </div>`).join("");
}
async function updateOrderStatus(id,status){const {error}=await supabaseClient.from("orders").update({status}).eq("id",id);if(error)showAdminMessage("تغییر وضعیت انجام نشد: "+error.message);else await loadOrders();}
async function updatePaymentStatus(id,payment_status){const {error}=await supabaseClient.from("orders").update({payment_status}).eq("id",id);if(error)showAdminMessage("تغییر وضعیت پرداخت انجام نشد: "+error.message);else await loadOrders();}
function statusLabel(s){return ({new:"جدید",confirmed:"تأیید شده",shipped:"ارسال شده",delivered:"تحویل شده",cancelled:"لغو شده"})[s]||s;}
function paymentLabel(s){return ({unpaid:"پرداخت نشده",paid:"پرداخت شده",refunded:"مرجوع شده"})[s]||s;}
function formatDate(v){try{return new Date(v).toLocaleString("fa-IR");}catch{return "";}}
function formatPrice(v){return Number(v||0).toLocaleString("fa-IR");}
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function escapeJs(v){return String(v??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
document.addEventListener("DOMContentLoaded",()=>setTimeout(checkAdmin,300));
window.adminLogin=adminLogin;window.adminLogout=adminLogout;window.saveProduct=saveProduct;window.resetProductForm=resetProductForm;
window.editProduct=editProduct;window.deleteProduct=deleteProduct;window.loadProducts=loadProducts;window.loadOrders=loadOrders;window.loadCategories=loadCategories;
window.addCategory=addCategory;window.deleteCategory=deleteCategory;window.updateOrderStatus=updateOrderStatus;window.updatePaymentStatus=updatePaymentStatus;
window.escapeHtml=escapeHtml;window.renderImagePreview=renderImagePreview;
