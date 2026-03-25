alter table public.tenants add column if not exists background_type text default 'gradient';
alter table public.tenants add column if not exists background_value text;
alter table public.tenants add column if not exists background_image text;
alter table public.tenants add column if not exists machine_frame_style text default 'glass';
alter table public.tenants add column if not exists machine_frame_image text;
alter table public.tenants add column if not exists logo_url text;
alter table public.tenants add column if not exists logo_align text default 'left';
alter table public.tenants add column if not exists logo_size int default 88;
alter table public.tenants add column if not exists header_text text;
alter table public.tenants add column if not exists order_success_text text;

create table if not exists public.tenant_pickup_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  details text,
  sort_order int not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists pickup_location_id uuid references public.tenant_pickup_locations(id) on delete set null;
alter table public.orders add column if not exists pickup_location_label text;

alter table public.tenant_pickup_locations enable row level security;

create policy "public pickup read" on public.tenant_pickup_locations for select using (is_active = true);
create policy "tenant pickup admin" on public.tenant_pickup_locations for all using (public.same_tenant(tenant_id)) with check (public.same_tenant(tenant_id));

update public.tenants
set header_text = coalesce(header_text, display_name),
    background_value = coalesce(background_value, 'linear-gradient(135deg, ' || coalesce(brand_color,'#2563eb') || ', ' || coalesce(accent_color,'#0f172a') || ')'),
    machine_frame_style = coalesce(machine_frame_style, 'glass')
where true;

insert into public.tenant_pickup_locations (tenant_id, label, details, sort_order, is_active)
select id, 'Hauptstandort', coalesce(pickup_hint, 'Standard Abholort'), 1, true
from public.tenants t
where not exists (
  select 1 from public.tenant_pickup_locations l where l.tenant_id = t.id
);
