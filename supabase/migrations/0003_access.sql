-- Client Pulse — Phase 3: tracked clients (with quota), invites, and
-- rep/manager/admin-scoped RLS on reports + tracked_clients.

-- ---------------------------------------------------------------------------
-- is_manager() — same SECURITY DEFINER pattern as is_admin() (0001), so it
-- can be used inside other tables' RLS policies without recursing back
-- into profiles' own SELECT policy.
-- ---------------------------------------------------------------------------
create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'manager'
  );
$$;

-- ---------------------------------------------------------------------------
-- Close a privilege-escalation hole from 0001: profiles_update_own lets a
-- user update their own row with no column restriction, which currently
-- includes `role`. Guard role changes behind is_admin() at the trigger
-- level (RLS WITH CHECK can't safely self-reference profiles without
-- hitting the same recursion trap is_admin() was built to avoid).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (our server-only admin client) bypasses this guard —
  -- BYPASSRLS skips RLS policies but not plain triggers like this one, so
  -- it needs an explicit carve-out for legitimate server-side operations.
  if new.role <> old.role and not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Only admins can change a user''s role';
  end if;
  return new;
end;
$$;

create trigger profiles_role_change_guard
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_escalation();

-- ---------------------------------------------------------------------------
-- handle_new_user() (0001) always assigned the 'rep' default. Extend it to
-- honor an `invited_role` passed in signup metadata, so accepting an invite
-- can set the correct role at signup time instead of a follow-up update.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'invited_role')::public.app_role, 'rep')
  );
  return new;
end;
$$;

-- Admins also need to update *other* profiles' role from /admin/users —
-- 0001 only granted self-update.
create policy "profiles_update_admin_all"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- tracked_clients — which reps are tracking which clients this quarter,
-- capped at 10 per rep per quarter (enforced in the DB, not the app).
-- ---------------------------------------------------------------------------
create table public.tracked_clients (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  quarter text not null,
  requested_at timestamptz not null default now(),
  unique (rep_id, client_id, quarter)
);

alter table public.tracked_clients enable row level security;

create or replace function public.enforce_tracked_clients_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.tracked_clients
  where rep_id = new.rep_id and quarter = new.quarter;

  if current_count >= 10 then
    raise exception 'Quota exceeded: up to 10 tracked clients per rep per quarter (already tracking % for %)',
      current_count, new.quarter;
  end if;

  return new;
end;
$$;

create trigger tracked_clients_quota_check
  before insert on public.tracked_clients
  for each row execute procedure public.enforce_tracked_clients_quota();

create policy "tracked_clients_select_scoped"
  on public.tracked_clients for select
  to authenticated
  using (public.is_admin() or public.is_manager() or rep_id = auth.uid());

create policy "tracked_clients_insert_own"
  on public.tracked_clients for insert
  to authenticated
  with check (rep_id = auth.uid());

create policy "tracked_clients_delete_own"
  on public.tracked_clients for delete
  to authenticated
  using (rep_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reports — was "any authenticated user" in 0002; now scoped to the
-- generating rep, with managers/admins seeing across all reps. This is the
-- visible RLS demo: a rep only sees their own generated snapshots in the
-- "Report Snapshots" list, while an admin sees every rep's.
-- ---------------------------------------------------------------------------
drop policy "reports_select_authenticated" on public.reports;
drop policy "reports_insert_authenticated" on public.reports;

create policy "reports_select_scoped"
  on public.reports for select
  to authenticated
  using (public.is_admin() or public.is_manager() or generated_by = auth.uid());

create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (generated_by = auth.uid());

-- ---------------------------------------------------------------------------
-- invites — admin-only table. No public SELECT policy: the /accept-invite
-- page and its route handler look up a token using the service-role key
-- server-side, never through the anon/authenticated client, so an
-- unauthenticated visitor can never list or browse invites.
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.app_role not null default 'rep',
  invited_by uuid not null references auth.users (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.invites enable row level security;

create policy "invites_select_admin"
  on public.invites for select
  to authenticated
  using (public.is_admin());

create policy "invites_insert_admin"
  on public.invites for insert
  to authenticated
  with check (public.is_admin());

create policy "invites_update_admin"
  on public.invites for update
  to authenticated
  using (public.is_admin());

create unique index invites_token_idx on public.invites (token);
