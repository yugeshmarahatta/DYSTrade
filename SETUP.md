# DYS Trade catalog setup

The public site remains static and can run on GitHub Pages. Supabase supplies the secure login and product database.

## 1. Create Supabase project

1. Create a free project at https://supabase.com.
2. In **Authentication > Users**, create the admin user with your email and a private password. Do not put the password in this repository.
3. In **SQL Editor**, run the complete secure migration from [supabase-migration.sql](supabase-migration.sql):

Make sure the Supabase dashboard at the top right is the same project whose URL is in `supabase-config.js` (`osdztmgpdtweoumaerur.supabase.co`). Paste the entire SQL file into a new query and click **Run**. Running only the admin UUID insert is not enough; the tables and policies must be created first. Do not use policies containing `using (true)` or `with check (true)` for product writes.

```sql
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
  select exists (select 1 from public.admin_users where user_id = auth.uid());
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
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
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
  with check (bucket_id = 'product-images' and public.is_admin() and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Admins can update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin() and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'product-images' and public.is_admin() and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Admins can delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin() and (storage.foldername(name))[1] = (select auth.uid()::text));
```

After creating the admin user in Authentication, copy its User UID and run this once:

```sql
insert into public.admin_users (user_id) values ('PASTE_ADMIN_USER_UUID_HERE');
```

## 2. Add public API values

Open **Project Settings > API** in Supabase. Copy the **Project URL** and the **publishable key** (or legacy `anon` public key) into `supabase-config.js`:

```js
window.DYS_SUPABASE_CONFIG = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-public-key"
};
```

The URL and publishable/anon key are designed to be visible in a browser. Security comes from RLS and the `admin_users` allowlist. Never use or upload the `service_role` key, database password, or admin password.

### Existing database: add product detail columns

If your database was created with the older products query, run the complete [supabase-columns-migration.sql](supabase-columns-migration.sql) file in Supabase SQL Editor. It adds `image_url`, `price`, `quantity`, and `quantity_unit` without deleting existing products, then reloads the API schema cache. Wait a few seconds and refresh `admin.html`.

### Multiple product images

After the columns migration, run [supabase-gallery-migration.sql](supabase-gallery-migration.sql) in the same SQL Editor. It creates the `product_images` table and its public-read/admin-write policies. The existing `product-images` Storage bucket remains the image file location.

## 3. Use the dashboard

Open `admin.html` on your deployed site, sign in with the Supabase admin user, and add products. The public catalog at `index.html` will read active products automatically. If Supabase is not configured, the original sample products remain visible locally. Do not use the sample fallback as a production catalog; configure Supabase before launch.

If the dashboard says **Bucket not found**, the storage section of the SQL was not applied. In Supabase **SQL Editor**, run this minimum bucket command in the same project shown in `supabase-config.js`, then run the storage policies above:

```sql
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;
```

The bucket name must be exactly `product-images` (lowercase, with a hyphen). You can also create it in **Storage > New bucket** with **Public bucket** enabled, but the storage policies in the SQL are still required for secure uploads.

## 4. GitHub Pages

1. Push the repository to GitHub.
2. In **Settings > Pages**, choose **Deploy from a branch**, select `main`, and choose `/ (root)`.
3. Save. GitHub will publish `index.html` and `admin.html`.
4. The existing `CNAME` file requests `dystrade.com.np`. In your domain DNS, point the domain to GitHub Pages using the current GitHub Pages A/AAAA records or the documented CNAME target. Enable HTTPS after DNS is active.

For a custom domain, add the deployed site URL to Supabase **Authentication > URL Configuration > Site URL** and add both the GitHub Pages URL and custom domain under **Redirect URLs**.
