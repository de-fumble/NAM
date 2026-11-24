-- Naija Auto Market — core marketplace schema
-- Paste into Supabase → SQL Editor → Run. Safe to re-run (idempotent).
--
-- Access model: the Next.js server talks to these tables with the secret key (bypasses RLS).
-- RLS is enabled on every table with NO policies, so the public/publishable key can read or
-- write nothing directly. All reads/writes go through /api/* routes that check the session.


-- ───────────────────────────── Enums ─────────────────────────────
do $$ begin
  create type public.user_role as enum ('customer', 'dealer', 'rental', 'parts');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.account_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.listing_status as enum ('active', 'paused', 'sold', 'removed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.lead_stage as enum ('new', 'contacted', 'viewing', 'negotiating', 'won', 'lost');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.booking_status as enum ('pending', 'confirmed', 'active', 'completed', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

-- ───────────────────────────── People & businesses ─────────────────────────────
create table if not exists public.businesses (
  id            text primary key,
  name          text not null,
  type          public.user_role not null check (type <> 'customer'),
  tagline       text not null default '',
  about         text not null default '',
  city          text not null default '',
  state         text not null default '',
  phone         text not null default '',
  rating        numeric(2,1) not null default 5,
  reviews       integer not null default 0,
  since         integer not null default extract(year from now()),
  response_mins integer not null default 15,
  verified      boolean not null default false,
  status        public.account_status not null default 'active',
  cover         text not null default '',
  hue           integer not null default 150,
  owner_phone   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  phone         text primary key,
  name          text not null,
  email         text,
  user_id       uuid references auth.users (id) on delete set null,
  role          public.user_role not null default 'customer',
  business_id   text references public.businesses(id) on delete set null,
  status        public.account_status not null default 'active',
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ───────────────────────────── Catalogue ─────────────────────────────
-- `data` holds the full listing document the storefront renders; the typed columns are the
-- fields that sellers and admins change, so they can be filtered and indexed.
create table if not exists public.cars (
  id          text primary key,
  seller_id   text not null,
  make        text not null,
  model       text not null,
  year        integer not null,
  price       bigint not null check (price >= 0),
  status      public.listing_status not null default 'active',
  featured    boolean not null default false,
  source      text not null default 'user' check (source in ('catalog', 'user')),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.parts (
  id          text primary key,
  seller_id   text not null,
  name        text not null,
  category    text not null,
  price       bigint not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  active      boolean not null default true,
  source      text not null default 'user' check (source in ('catalog', 'user')),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.vehicles (
  id          text primary key,
  company_id  text not null,
  name        text not null,
  category    text not null,
  daily       bigint not null check (daily >= 0),
  status      text not null default 'available' check (status in ('available', 'maintenance', 'removed')),
  source      text not null default 'user' check (source in ('catalog', 'user')),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ───────────────────────────── Activity ─────────────────────────────
create table if not exists public.leads (
  id              text primary key,
  car_id          text not null,
  business_id     text not null,
  customer_name   text not null,
  customer_phone  text not null,
  kind            text not null check (kind in ('message', 'offer', 'inspection', 'call')),
  amount          bigint,
  note            text not null default '',
  stage           public.lead_stage not null default 'new',
  created_at      timestamptz not null default now()
);

create table if not exists public.threads (
  id              text primary key,
  business_id     text not null,
  customer_name   text not null,
  customer_phone  text not null,
  topic           jsonb not null,
  unread_biz      integer not null default 0,
  unread_cust     integer not null default 0,
  updated_at      timestamptz not null default now()
);

create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  thread_id   text not null references public.threads(id) on delete cascade,
  sender      text not null check (sender in ('customer', 'business')),
  body        text not null,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id              text primary key,
  customer_name   text not null,
  customer_phone  text not null,
  address         text not null default '',
  state           text not null default '',
  pay             text not null default 'card',
  lines           jsonb not null,             -- [{partId, name, qty, price, sellerId}]
  fulfil          jsonb not null,             -- {sellerId: placed|packed|shipped|delivered|cancelled}
  subtotal        bigint not null,
  delivery        bigint not null,
  vat             bigint not null,
  total           bigint not null,
  refunded        boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.bookings (
  id              text primary key,
  rental_id       text not null,
  company_id      text not null,
  vehicle         text not null,
  customer_name   text not null,
  customer_phone  text not null,
  city            text not null default '',
  start_date      date not null,
  end_date        date not null,
  days            integer not null,
  driver          boolean not null default true,
  total           bigint not null,
  status          public.booking_status not null default 'pending',
  created_at      timestamptz not null default now()
);

create table if not exists public.part_requests (
  id              text primary key,
  customer_name   text not null,
  customer_phone  text not null,
  part            text not null,
  vehicle         text not null,
  state           text not null default '',
  note            text not null default '',
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now()
);

create table if not exists public.quotes (
  request_id   text not null references public.part_requests(id) on delete cascade,
  business_id  text not null,
  price        bigint not null,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  primary key (request_id, business_id)
);

create table if not exists public.inspections (
  id              text primary key,
  car_id          text not null,
  business_id     text not null,
  customer_name   text not null,
  customer_phone  text not null,
  date            date not null,
  slot            text not null,
  plan            text not null,
  price           bigint not null,
  created_at      timestamptz not null default now()
);

-- ───────────────────────────── Platform control ─────────────────────────────
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor       text not null,            -- 'admin:<email>' | 'user:<phone>' | 'system'
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('fee_percent', '2.5'::jsonb),
  ('announcement', '{"text": "", "tone": "info"}'::jsonb),
  ('signups_open', 'true'::jsonb),
  ('data_mode', '"stock"'::jsonb),         -- 'stock' (sample catalogue) | 'live' (real data only)
  ('email_verification', 'true'::jsonb)
on conflict (key) do nothing;

-- ───────────────────────────── Indexes ─────────────────────────────
-- Email sign-in (also in 20261123090000_email_auth.sql for databases created before it existed)
alter table public.profiles add column if not exists email   text;
alter table public.profiles add column if not exists user_id uuid references auth.users (id) on delete set null;
create unique index if not exists profiles_email_key   on public.profiles (lower(email));
create unique index if not exists profiles_user_id_key on public.profiles (user_id);
create index if not exists cars_seller_idx        on public.cars (seller_id);
create index if not exists cars_status_idx        on public.cars (status);
create index if not exists parts_seller_idx       on public.parts (seller_id);
create index if not exists vehicles_company_idx   on public.vehicles (company_id);
create index if not exists leads_business_idx     on public.leads (business_id, created_at desc);
create index if not exists leads_customer_idx     on public.leads (customer_phone);
create index if not exists threads_business_idx   on public.threads (business_id, updated_at desc);
create index if not exists threads_customer_idx   on public.threads (customer_phone);
create index if not exists messages_thread_idx    on public.messages (thread_id, created_at);
create index if not exists orders_customer_idx    on public.orders (customer_phone);
create index if not exists orders_created_idx     on public.orders (created_at desc);
create index if not exists orders_fulfil_idx      on public.orders using gin (fulfil);
create index if not exists bookings_company_idx   on public.bookings (company_id, start_date);
create index if not exists bookings_customer_idx  on public.bookings (customer_phone);
create index if not exists requests_status_idx    on public.part_requests (status, created_at desc);
create index if not exists inspections_biz_idx    on public.inspections (business_id);
create index if not exists audit_created_idx      on public.audit_log (created_at desc);
create index if not exists profiles_created_idx   on public.profiles (created_at desc);

-- ───────────────────────────── updated_at triggers ─────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['businesses', 'cars', 'parts', 'vehicles', 'settings'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ───────────────────────────── Row Level Security ─────────────────────────────
-- Locked down: no policies = no access for anon/authenticated keys. The server uses the secret key.
do $$
declare t text;
begin
  foreach t in array array['businesses', 'profiles', 'cars', 'parts', 'vehicles', 'leads', 'threads', 'messages',
                           'orders', 'bookings', 'part_requests', 'quotes', 'inspections', 'settings', 'audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Stock decrement used by checkout (atomic, never below zero).
create or replace function public.decrement_stock(p_part text, p_qty integer) returns void
language sql set search_path = '' as $$
  update public.parts set stock = greatest(0, stock - p_qty) where id = p_part;
$$;
revoke all on function public.decrement_stock(text, integer) from public, anon, authenticated;

-- ───────────────────────────── Storage ─────────────────────────────
-- Public-read bucket for listing photos. Uploads happen server-side with the secret key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
