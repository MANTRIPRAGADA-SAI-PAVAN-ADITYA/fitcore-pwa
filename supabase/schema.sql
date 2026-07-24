-- ============================================================
-- LooP — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  phone       text unique,
  name        text,
  role        text check (role in ('driver', 'shipper', 'both', 'admin')) default 'shipper',
  company     text,
  kyc_status  text check (kyc_status in ('none', 'pending', 'approved', 'rejected')) default 'none',
  credits     integer default 5,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. KYC DOCUMENTS
-- ============================================================
create table if not exists public.kyc_documents (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  doc_type    text check (doc_type in ('license', 'rc', 'gst', 'aadhar', 'pan')) not null,
  file_url    text not null,
  file_name   text,
  status      text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  admin_note  text,
  uploaded_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- After KYC doc review, update profile kyc_status
create or replace function public.sync_kyc_status()
returns trigger language plpgsql security definer as $$
declare
  doc_count   integer;
  approved_count integer;
  rejected_count integer;
begin
  select count(*),
         count(*) filter (where status = 'approved'),
         count(*) filter (where status = 'rejected')
  into doc_count, approved_count, rejected_count
  from public.kyc_documents
  where user_id = new.user_id;

  if doc_count = 0 then
    update public.profiles set kyc_status = 'none' where id = new.user_id;
  elsif rejected_count > 0 then
    update public.profiles set kyc_status = 'rejected' where id = new.user_id;
  elsif approved_count >= 2 then
    update public.profiles set kyc_status = 'approved' where id = new.user_id;
  else
    update public.profiles set kyc_status = 'pending' where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_kyc_updated on public.kyc_documents;
create trigger on_kyc_updated
  after insert or update on public.kyc_documents
  for each row execute procedure public.sync_kyc_status();

-- ============================================================
-- 3. PRICING CONFIG
-- ============================================================
create table if not exists public.pricing_config (
  id                 uuid default uuid_generate_v4() primary key,
  truck_type         text unique not null,
  base_rate_per_km   numeric(8,2) not null,  -- ₹ per km
  fuel_surcharge     numeric(4,2) default 1.15, -- multiplier
  demand_multiplier  numeric(4,2) default 1.0,  -- 0.8 = low, 1.0 = normal, 1.2 = high
  updated_at         timestamptz default now()
);

-- Load type factors
create table if not exists public.load_type_factors (
  id          uuid default uuid_generate_v4() primary key,
  load_type   text unique not null,
  factor      numeric(4,2) not null,
  label       text  -- human-readable label
);

-- Seed pricing config
insert into public.pricing_config (truck_type, base_rate_per_km, fuel_surcharge, demand_multiplier)
values
  ('mini',       12.00, 1.15, 1.0),
  ('lcv',        15.00, 1.15, 1.0),
  ('hcv',        20.00, 1.18, 1.0),
  ('trailer',    25.00, 1.20, 1.0),
  ('container',  28.00, 1.20, 1.0)
on conflict (truck_type) do nothing;

insert into public.load_type_factors (load_type, factor, label)
values
  ('general',    1.00, 'General Goods'),
  ('fragile',    1.20, 'Fragile Items'),
  ('perishable', 1.30, 'Perishable / Cold Chain'),
  ('hazardous',  1.50, 'Hazardous Materials'),
  ('oversized',  1.40, 'Oversized / OD Cargo')
on conflict (load_type) do nothing;

-- ============================================================
-- 4. TRUCKS
-- ============================================================
create table if not exists public.trucks (
  id               uuid default uuid_generate_v4() primary key,
  driver_id        uuid references public.profiles(id) on delete cascade not null,
  origin           text not null,
  origin_lat       double precision,
  origin_lng       double precision,
  destination      text not null,
  dest_lat         double precision,
  dest_lng         double precision,
  truck_type       text check (truck_type in ('mini', 'lcv', 'hcv', 'trailer', 'container')) not null,
  capacity_tons    numeric(6,2) not null,
  available_date   date not null,
  price_per_km     numeric(8,2),  -- optional, driver's asking price
  notes            text,
  status           text check (status in ('active', 'matched', 'completed', 'cancelled')) default 'active',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists trucks_origin_idx on public.trucks(origin_lat, origin_lng);
create index if not exists trucks_status_idx on public.trucks(status);
create index if not exists trucks_driver_idx on public.trucks(driver_id);

-- ============================================================
-- 5. LOADS
-- ============================================================
create table if not exists public.loads (
  id               uuid default uuid_generate_v4() primary key,
  shipper_id       uuid references public.profiles(id) on delete cascade not null,
  origin           text not null,
  origin_lat       double precision,
  origin_lng       double precision,
  destination      text not null,
  dest_lat         double precision,
  dest_lng         double precision,
  weight_tons      numeric(6,2) not null,
  load_type        text check (load_type in ('general', 'fragile', 'perishable', 'hazardous', 'oversized')) default 'general',
  pickup_date      date not null,
  budget_min       numeric(10,2),
  budget_max       numeric(10,2),
  notes            text,
  status           text check (status in ('active', 'matched', 'completed', 'cancelled')) default 'active',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists loads_origin_idx on public.loads(origin_lat, origin_lng);
create index if not exists loads_status_idx on public.loads(status);
create index if not exists loads_shipper_idx on public.loads(shipper_id);

-- ============================================================
-- 6. UNLOCKS (Lead reveal)
-- ============================================================
create table if not exists public.unlocks (
  id             uuid default uuid_generate_v4() primary key,
  unlocker_id    uuid references public.profiles(id) on delete cascade not null,
  listing_type   text check (listing_type in ('truck', 'load')) not null,
  listing_id     uuid not null,
  credits_spent  integer default 1,
  unlocked_at    timestamptz default now(),
  unique(unlocker_id, listing_type, listing_id)  -- prevent double unlock
);

-- Deduct credit and record unlock atomically
create or replace function public.unlock_listing(
  p_unlocker_id  uuid,
  p_listing_type text,
  p_listing_id   uuid
)
returns json language plpgsql security definer as $$
declare
  v_credits integer;
  v_phone   text;
  v_already boolean;
begin
  -- Check already unlocked
  select exists(
    select 1 from public.unlocks
    where unlocker_id = p_unlocker_id
      and listing_type = p_listing_type
      and listing_id = p_listing_id
  ) into v_already;

  if v_already then
    -- Return phone without charging again
    if p_listing_type = 'truck' then
      select p.phone into v_phone from public.trucks t
      join public.profiles p on p.id = t.driver_id
      where t.id = p_listing_id;
    else
      select p.phone into v_phone from public.loads l
      join public.profiles p on p.id = l.shipper_id
      where l.id = p_listing_id;
    end if;
    return json_build_object('success', true, 'phone', v_phone, 'already_unlocked', true);
  end if;

  -- Check credits
  select credits into v_credits from public.profiles where id = p_unlocker_id;
  if v_credits < 1 then
    return json_build_object('success', false, 'error', 'Insufficient credits');
  end if;

  -- Deduct credit
  update public.profiles set credits = credits - 1 where id = p_unlocker_id;

  -- Record unlock
  insert into public.unlocks (unlocker_id, listing_type, listing_id)
  values (p_unlocker_id, p_listing_type, p_listing_id);

  -- Get phone
  if p_listing_type = 'truck' then
    select p.phone into v_phone from public.trucks t
    join public.profiles p on p.id = t.driver_id
    where t.id = p_listing_id;
  else
    select p.phone into v_phone from public.loads l
    join public.profiles p on p.id = l.shipper_id
    where l.id = p_listing_id;
  end if;

  return json_build_object('success', true, 'phone', v_phone, 'already_unlocked', false);
end;
$$;

-- ============================================================
-- 7. TRIPS
-- ============================================================
create table if not exists public.trips (
  id            uuid default uuid_generate_v4() primary key,
  truck_id      uuid references public.trucks(id),
  load_id       uuid references public.loads(id),
  driver_id     uuid references public.profiles(id) not null,
  shipper_id    uuid references public.profiles(id) not null,
  status        text check (status in ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')) default 'pending',
  agreed_price  numeric(12,2),
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists trips_driver_idx on public.trips(driver_id);
create index if not exists trips_shipper_idx on public.trips(shipper_id);

-- ============================================================
-- 8. MATCHING FUNCTION (Haversine-based)
-- ============================================================
-- Haversine distance in km
create or replace function public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision language plpgsql immutable as $$
declare
  r  double precision := 6371;
  d_lat double precision;
  d_lng double precision;
  a double precision;
begin
  d_lat := radians(lat2 - lat1);
  d_lng := radians(lng2 - lng1);
  a := sin(d_lat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng/2)^2;
  return r * 2 * asin(sqrt(a));
end;
$$;

-- Match loads to a truck listing
create or replace function public.match_loads_for_truck(
  p_truck_id    uuid,
  p_radius_km   double precision default 150
)
returns table (
  load_id       uuid,
  shipper_name  text,
  origin        text,
  destination   text,
  weight_tons   numeric,
  load_type     text,
  pickup_date   date,
  budget_max    numeric,
  origin_dist   double precision,
  dest_dist     double precision
)
language plpgsql stable as $$
declare
  v_truck public.trucks%rowtype;
begin
  select * into v_truck from public.trucks where id = p_truck_id;

  return query
  select
    l.id,
    p.name,
    l.origin,
    l.destination,
    l.weight_tons,
    l.load_type,
    l.pickup_date,
    l.budget_max,
    public.haversine_km(v_truck.origin_lat, v_truck.origin_lng, l.origin_lat, l.origin_lng) as origin_dist,
    public.haversine_km(v_truck.dest_lat, v_truck.dest_lng, l.dest_lat, l.dest_lng) as dest_dist
  from public.loads l
  join public.profiles p on p.id = l.shipper_id
  where l.status = 'active'
    and l.weight_tons <= v_truck.capacity_tons
    and l.pickup_date >= v_truck.available_date
    and public.haversine_km(v_truck.origin_lat, v_truck.origin_lng, l.origin_lat, l.origin_lng) <= p_radius_km
    and public.haversine_km(v_truck.dest_lat, v_truck.dest_lng, l.dest_lat, l.dest_lng) <= p_radius_km
  order by (origin_dist + dest_dist);
end;
$$;

-- Match trucks to a load listing
create or replace function public.match_trucks_for_load(
  p_load_id   uuid,
  p_radius_km double precision default 150
)
returns table (
  truck_id      uuid,
  driver_name   text,
  origin        text,
  destination   text,
  truck_type    text,
  capacity_tons numeric,
  available_date date,
  price_per_km  numeric,
  origin_dist   double precision,
  dest_dist     double precision
)
language plpgsql stable as $$
declare
  v_load public.loads%rowtype;
begin
  select * into v_load from public.loads where id = p_load_id;

  return query
  select
    t.id,
    p.name,
    t.origin,
    t.destination,
    t.truck_type,
    t.capacity_tons,
    t.available_date,
    t.price_per_km,
    public.haversine_km(v_load.origin_lat, v_load.origin_lng, t.origin_lat, t.origin_lng) as origin_dist,
    public.haversine_km(v_load.dest_lat, v_load.dest_lng, t.dest_lat, t.dest_lng) as dest_dist
  from public.trucks t
  join public.profiles p on p.id = t.driver_id
  where t.status = 'active'
    and t.capacity_tons >= v_load.weight_tons
    and t.available_date <= v_load.pickup_date
    and public.haversine_km(v_load.origin_lat, v_load.origin_lng, t.origin_lat, t.origin_lng) <= p_radius_km
    and public.haversine_km(v_load.dest_lat, v_load.dest_lng, t.dest_lat, t.dest_lng) <= p_radius_km
  order by (origin_dist + dest_dist);
end;
$$;

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.trucks enable row level security;
alter table public.loads enable row level security;
alter table public.unlocks enable row level security;
alter table public.trips enable row level security;
alter table public.pricing_config enable row level security;
alter table public.load_type_factors enable row level security;

-- Profiles: anyone authenticated can read; only owner can update
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- KYC: owner can CRUD; admin can read/update all
create policy "kyc_owner_select" on public.kyc_documents for select using (auth.uid() = user_id or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "kyc_owner_insert" on public.kyc_documents for insert with check (auth.uid() = user_id);
create policy "kyc_admin_update" on public.kyc_documents for update using (auth.uid() = user_id or exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Trucks: authenticated can read active; driver can CRUD own
create policy "trucks_select" on public.trucks for select using (auth.role() = 'authenticated');
create policy "trucks_insert" on public.trucks for insert with check (auth.uid() = driver_id);
create policy "trucks_update" on public.trucks for update using (auth.uid() = driver_id);
create policy "trucks_delete" on public.trucks for delete using (auth.uid() = driver_id);

-- Loads: same pattern
create policy "loads_select" on public.loads for select using (auth.role() = 'authenticated');
create policy "loads_insert" on public.loads for insert with check (auth.uid() = shipper_id);
create policy "loads_update" on public.loads for update using (auth.uid() = shipper_id);
create policy "loads_delete" on public.loads for delete using (auth.uid() = shipper_id);

-- Unlocks: owner can read/insert
create policy "unlocks_select" on public.unlocks for select using (auth.uid() = unlocker_id);
create policy "unlocks_insert" on public.unlocks for insert with check (auth.uid() = unlocker_id);

-- Trips: participants can read; either can update
create policy "trips_select" on public.trips for select using (auth.uid() = driver_id or auth.uid() = shipper_id);
create policy "trips_insert" on public.trips for insert with check (auth.uid() = driver_id or auth.uid() = shipper_id);
create policy "trips_update" on public.trips for update using (auth.uid() = driver_id or auth.uid() = shipper_id);

-- Pricing: public read
create policy "pricing_select" on public.pricing_config for select using (true);
create policy "pricing_update" on public.pricing_config for update using (exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "load_factors_select" on public.load_type_factors for select using (true);

-- ============================================================
-- 10. STORAGE BUCKET
-- Run separately in Storage → Policies after creating bucket
-- ============================================================
-- Bucket name: kyc-documents (private)
-- Policy: authenticated users can upload to their own folder
-- Path pattern: {user_id}/{doc_type}/{filename}
