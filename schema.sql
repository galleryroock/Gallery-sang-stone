-- گالری سنگ طبیعی - نصب تکمیلی برای دیتابیس موجود
-- این فایل به جدول موجود gallerysang دست نمی‌زند و محصولات آن را حذف نمی‌کند.
-- قبل از اجرا از اطلاعات مهم Supabase نسخه پشتیبان بگیرید.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

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
  product_id bigint,
  product_name text not null,
  price numeric not null default 0,
  quantity integer not null default 1 check (quantity > 0)
);

insert into public.categories(name,icon) values
('عقیق','💎'),('شجر','🌳'),('یشم','🟢'),('ژئود','🔮'),('سنگ کلکسیونی','🪨'),('دسته کلیدی','🔑'),('سایر','📦')
on conflict (name) do nothing;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select to authenticated using (public.is_admin());

drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories" on public.categories for select using (active=true or public.is_admin());

drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders for insert to anon, authenticated with check (true);

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public create order items" on public.order_items;
create policy "public create order items" on public.order_items for insert to anon, authenticated with check (true);

drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items" on public.order_items for select to authenticated using (public.is_admin());

-- Seed profile for an already-created auth user:
-- بعد از ورود به Supabase، شناسه UUID کاربر مدیر را در دستور زیر قرار دهید:
-- insert into public.profiles(id, role) values ('UUID-USER-HERE','admin')
-- on conflict (id) do update set role='admin';
