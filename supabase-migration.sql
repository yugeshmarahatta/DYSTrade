-- DYS Trade secure catalog migration.
-- Run this entire file in the SQL Editor of the project in supabase-config.js.
-- Create your Auth user first, then add its UUID in the final statement.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null,
  icon text default '▣',
  unit text default 'Wholesale & retail',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists price numeric(12, 2);
alter table public.products add column if not exists quantity numeric(12, 2);
alter table public.products add column if not exists quantity_unit text default 'piece';
alter table public.admin_users enable row level security;
alter table public.products enable row level security;

drop policy if exists "Anyone can read active products" on public.products;
drop policy if exists "Admins can read all products" on public.products;
drop policy if exists "Admins can add products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Admins can read their own role" on public.admin_users;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can read their own role" on public.admin_users
  for select to authenticated using (user_id = auth.uid());
create policy "Anyone can read active products" on public.products
  for select using (is_active = true);
create policy "Admins can read all products" on public.products
  for select to authenticated using (public.is_admin());
create policy "Admins can add products" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "Admins can update products" on public.products
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete products" on public.products
  for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;

create policy "Public can view product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Admins can upload product images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Admins can update product images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'product-images'
    and public.is_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy "Admins can delete product images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Replace this value with the User UID from Authentication > Users.
-- insert into public.admin_users (user_id) values ('YOUR_AUTH_USER_UUID')
-- on conflict (user_id) do nothing;
