alter table public.tenants add column if not exists pickup_hint text;
alter table public.tenants add column if not exists order_notify_email text;
alter table public.orders add column if not exists contact_email text;
