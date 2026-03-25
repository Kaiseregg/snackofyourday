create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  tagline text,
  welcome_text text,
  pickup_hint text,
  order_notify_email text,
  slot_count int not null default 15 check (slot_count between 1 and 100),
  brand_color text default '#1d4ed8',
  accent_color text default '#0f172a',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('superadmin','customer_admin','viewer')),
  tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_slots (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slot_no int not null,
  product_id uuid references public.products(id) on delete set null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, slot_no)
);

create table if not exists public.tenant_payment_methods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type in ('twint','card','cash','invoice','other')),
  label text not null,
  payment_value text,
  instructions text,
  sort_order int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payment_method_id uuid references public.tenant_payment_methods(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  contact_email text,
  pickup_note text,
  total_amount numeric(10,2) not null default 0,
  status text not null default 'new' check (status in ('new','payment_marked','ready','done')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  slot_no int not null,
  qty int not null default 1,
  unit_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.tenant_slots enable row level security;
alter table public.tenant_payment_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_superadmin()
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin');
$$;

create or replace function public.same_tenant(target uuid)
returns boolean language sql stable as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.tenant_id = target and p.role in ('customer_admin','superadmin'));
$$;

create policy "public tenants read" on public.tenants for select using (is_active = true);
create policy "superadmin tenants all" on public.tenants for all using (public.is_superadmin()) with check (public.is_superadmin());

create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_superadmin());
create policy "profiles superadmin update" on public.profiles for update using (public.is_superadmin()) with check (public.is_superadmin());

create policy "public products read" on public.products for select using (is_active = true);
create policy "tenant products admin" on public.products for all using (public.same_tenant(tenant_id)) with check (public.same_tenant(tenant_id));

create policy "public slots read" on public.tenant_slots for select using (true);
create policy "tenant slots admin" on public.tenant_slots for all using (public.same_tenant(tenant_id)) with check (public.same_tenant(tenant_id));

create policy "public payments read" on public.tenant_payment_methods for select using (is_active = true);
create policy "tenant payments admin" on public.tenant_payment_methods for all using (public.same_tenant(tenant_id)) with check (public.same_tenant(tenant_id));

create policy "public insert orders" on public.orders for insert with check (true);
create policy "tenant read orders" on public.orders for select using (public.same_tenant(tenant_id));
create policy "tenant update orders" on public.orders for update using (public.same_tenant(tenant_id)) with check (public.same_tenant(tenant_id));

create policy "public insert order_items" on public.order_items for insert with check (true);
create policy "tenant read order_items" on public.order_items for select using (public.same_tenant(tenant_id));

insert into public.tenants (slug, display_name, tagline, welcome_text, slot_count)
values ('demo', 'Vendora Demo', 'Virtueller Firmenautomat', 'Willkommen bei deiner Demo-Installation.', 15)
on conflict (slug) do nothing;

with t as (select id from public.tenants where slug = 'demo')
insert into public.products (tenant_id, name, price)
select t.id, x.name, x.price
from t,
(values ('Protein Bar', 4.50), ('Isostar', 3.90), ('Sandwich', 6.80), ('Nüsse', 4.20), ('Kaugummi', 2.50)) as x(name, price)
on conflict do nothing;

with t as (select id from public.tenants where slug = 'demo'),
prods as (select id, tenant_id, row_number() over(order by created_at, name) as rn from public.products where tenant_id = (select id from t))
insert into public.tenant_payment_methods (tenant_id, type, label, payment_value, instructions, sort_order)
select t.id, 'twint', 'TWINT Business', '+41 79 000 00 00', 'Hier später echte Business-TWINT Daten des Kunden eintragen.', 1 from t
where not exists (select 1 from public.tenant_payment_methods pm where pm.tenant_id = t.id)
;

with t as (select id from public.tenants where slug = 'demo'),
prods as (select id, row_number() over(order by created_at, name) as rn from public.products where tenant_id = (select id from t))
insert into public.tenant_slots (tenant_id, slot_no, product_id, is_active)
select (select id from t), rn, id, true from prods
where rn <= 5
on conflict (tenant_id, slot_no) do nothing;
