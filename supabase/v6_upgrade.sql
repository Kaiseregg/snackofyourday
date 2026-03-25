-- V6 Upgrade for SnackOfYourDay
alter table if exists public.tenants add column if not exists logo_url text;
alter table if exists public.tenants add column if not exists header_text text;
alter table if exists public.tenants add column if not exists tagline text;
alter table if exists public.tenants add column if not exists background_image_url text;
alter table if exists public.tenants add column if not exists frame_image_url text;
alter table if exists public.tenants add column if not exists frame_color text default '#111827';
alter table if exists public.tenants add column if not exists pickup_options text default '';
alter table if exists public.tenants add column if not exists order_notify_email text;
alter table if exists public.tenants add column if not exists customer_header_note text;
alter table if exists public.tenants add column if not exists payment_settings jsonb default '{}'::jsonb;

alter table if exists public.products add column if not exists image_url text;
alter table if exists public.products add column if not exists active boolean default true;
alter table if exists public.products add column if not exists description text;

alter table if exists public.orders add column if not exists email text;
alter table if exists public.orders add column if not exists pickup_location text;
alter table if exists public.orders add column if not exists customer_note text;
alter table if exists public.orders add column if not exists payment_method text;
alter table if exists public.orders add column if not exists total numeric(10,2) default 0;
alter table if exists public.orders add column if not exists first_name text;
alter table if exists public.orders add column if not exists last_name text;
alter table if exists public.orders add column if not exists phone text;

alter table if exists public.order_items add column if not exists product_name text;
alter table if exists public.order_items add column if not exists unit_price numeric(10,2) default 0;
alter table if exists public.order_items add column if not exists line_total numeric(10,2) default 0;
alter table if exists public.order_items add column if not exists image_url text;

create table if not exists public.tenant_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slot_number integer not null,
  product_id uuid null references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, slot_number)
);

create index if not exists tenant_slots_tenant_idx on public.tenant_slots(tenant_id);
create index if not exists products_tenant_idx on public.products(tenant_id);
create index if not exists orders_tenant_idx on public.orders(tenant_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
