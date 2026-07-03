-- PIXL Internet Service — initial schema
-- Tables: profiles (roles), plans, clients, payments, usage + RLS policies.

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, stores the app role (client | admin)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies below
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  monthly_price numeric(10, 2) not null check (monthly_price >= 0)
);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  pppoe_username text not null unique,
  plan_id uuid references public.plans (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  balance numeric(10, 2) not null default 0,
  due_date date not null default (current_date + 30),
  created_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients (user_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null default 'gcash' check (method in ('gcash', 'qrph', 'card', 'cash', 'other')),
  status text not null default 'pending' check (status in ('paid', 'pending', 'failed')),
  paymongo_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_client_id_idx on public.payments (client_id);
create index if not exists payments_paymongo_ref_idx on public.payments (paymongo_ref);

-- ---------------------------------------------------------------------------
-- Usage (daily bandwidth per client)
-- ---------------------------------------------------------------------------
create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  download_mb integer not null default 0,
  upload_mb integer not null default 0,
  unique (client_id, date)
);

create index if not exists usage_client_id_date_idx on public.usage (client_id, date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.clients enable row level security;
alter table public.payments enable row level security;
alter table public.usage enable row level security;

-- Profiles: users read their own; admins read all. Role changes go through
-- the service role only (no update policy on purpose).
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Plans: public pricing page, everyone can read. Only admins mutate.
create policy "plans_select_all" on public.plans
  for select using (true);
create policy "plans_admin_write" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- Clients: users see their own record; admins manage all.
create policy "clients_select_own" on public.clients
  for select using (user_id = auth.uid() or public.is_admin());
create policy "clients_admin_insert" on public.clients
  for insert with check (public.is_admin());
create policy "clients_admin_update" on public.clients
  for update using (public.is_admin()) with check (public.is_admin());
create policy "clients_admin_delete" on public.clients
  for delete using (public.is_admin());

-- Payments: users see payments for their own client record; admins see all.
-- Inserts/updates happen via the service role (PayMongo webhook) or admins.
create policy "payments_select_own" on public.payments
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.clients c
      where c.id = payments.client_id and c.user_id = auth.uid()
    )
  );
create policy "payments_admin_write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- Usage: users see their own usage; admins see all.
create policy "usage_select_own" on public.usage
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.clients c
      where c.id = usage.client_id and c.user_id = auth.uid()
    )
  );
create policy "usage_admin_write" on public.usage
  for all using (public.is_admin()) with check (public.is_admin());
