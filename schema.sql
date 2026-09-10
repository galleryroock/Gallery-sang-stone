-- گالری سنگ طبیعی: راه‌اندازی/تکمیل دیتابیس
-- این فایل را در Supabase > SQL Editor اجرا کن.
-- هرگز service_role/secret key را داخل سایت قرار نده.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0 check (price >= 0),
  category text,
  image_url text,
  description text,
  stock integer not null default 1 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists stock integer not null default 1;
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists created_at timestamptz not null default now();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text default '◇',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text,
  total_amount numeric not null default 0 check (total_amount >= 0),
  status text not null default 'new' check (status in ('new','confirmed','shipped','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric not null default 0,
  quantity integer not null default 1 check (quantity > 0)
);

insert into public.categories(name,icon) values
('عقیق','💎'),('شجر','🌳'),('یشم','🟢'),('ژئود','🔮'),('سنگ کلکسیونی','🪨'),('دسته کلیدی','🔑'),('سایر','📦')
on conflict (name) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products
for select using (active = true or public.is_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories
for select using (active = true or public.is_admin());

drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles
for select to authenticated using (public.is_admin());

drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders
for insert to anon, authenticated with check (true);

drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public create order items" on public.order_items;
create policy "public create order items" on public.order_items
for insert to anon, authenticated with check (true);

drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items" on public.order_items
for select to authenticated using (public.is_admin());

drop policy if exists "admins manage order items" on public.order_items;
create policy "admins manage order items" on public.order_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- بعد از ساخت کاربر مدیر در Authentication > Users، UUID او را اینجا جایگزین کن:
-- insert into public.profiles(id,role) values ('UUID_USER','admin')
-- on conflict (id) do update set role='admin';
