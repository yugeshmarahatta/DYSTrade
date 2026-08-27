-- Run this in the SQL Editor of the same Supabase project used by the website.
-- This preserves all existing products and only adds missing columns.

alter table public.products
  add column if not exists image_url text,
  add column if not exists price numeric(12, 2),
  add column if not exists quantity numeric(12, 2),
  add column if not exists quantity_unit text default 'piece';

notify pgrst, 'reload schema';
