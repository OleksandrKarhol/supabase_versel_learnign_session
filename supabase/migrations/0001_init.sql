-- Client Pulse — Phase 1: roles, profiles, clients directory
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'manager', 'rep');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row, created automatically on signup
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'rep',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER + owned by a superuser (default for SQL-editor-created
-- functions) bypasses RLS internally, which avoids the infinite-recursion
-- trap of a profiles policy that queries profiles directly.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin_all"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'rep');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clients — shared reference directory, readable by anyone signed in.
-- (Per-rep access control arrives later via a `tracked_clients` table —
-- this table is deliberately org-wide readable, like an internal directory.)
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  plan text,
  customer_since date,
  arr numeric not null default 0,
  active_rooms integer not null default 0,
  total_rooms integer not null default 0,
  total_users integer not null default 0,
  data_volume_gb numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients_select_authenticated"
  on public.clients for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Seed data — illustrative clients only
-- ---------------------------------------------------------------------------
insert into public.clients
  (name, industry, plan, customer_since, arr, active_rooms, total_rooms, total_users, data_volume_gb)
values
  ('Meridian Capital Partners', 'Financial Services / M&A', 'Enterprise', '2022-03-01', 412000, 7, 14, 186, 4800),
  ('Northwind Legal Group', 'Legal Services', 'Growth', '2023-06-15', 128000, 3, 6, 54, 1200),
  ('Atlas Biotech Holdings', 'Life Sciences', 'Enterprise', '2021-11-10', 356000, 5, 9, 142, 3100),
  ('Summit Ridge Advisors', 'Financial Services', 'Growth', '2024-01-20', 87000, 2, 3, 29, 540),
  ('Blackstone Harbor Real Estate', 'Real Estate', 'Enterprise', '2020-05-05', 501000, 9, 20, 240, 6700);
