-- ════════════════════════════════════════════════════════════════════
-- CoParent v3 — Household-shared schema with invite-based parent linking
-- Run this entire file in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- Clean slate
drop trigger if exists on_user_created on auth.users cascade;
drop trigger if exists on_auth_user_created on auth.users cascade;
drop function if exists public.seed_categories() cascade;
drop function if exists public.seed_default_categories() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.accept_invite(text) cascade;
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.kids cascade;
drop table if exists public.parents cascade;
drop table if exists public.household_members cascade;
drop table if exists public.invites cascade;
drop table if exists public.households cascade;

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Households (shared workspaces) ───────────────────────────────────
create table public.households (
  id uuid default uuid_generate_v4() primary key,
  name text default 'My household',
  created_at timestamptz default now()
);
alter table public.households enable row level security;

-- ── Members (which users belong to which household) ──────────────────
create table public.household_members (
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  color text default '#2563eb',
  role text default 'parent' check (role in ('parent','coparent')),
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);
alter table public.household_members enable row level security;

-- ── Invites ──────────────────────────────────────────────────────────
create table public.invites (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  invited_email text,
  code text not null unique,
  accepted boolean default false,
  accepted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);
alter table public.invites enable row level security;
create index invites_code_idx on public.invites(code);

-- ── Kids (now belong to a household, not a user) ─────────────────────
create table public.kids (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  dob date,
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.kids enable row level security;

-- ── Categories (per household) ───────────────────────────────────────
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  emoji text default '🏷️',
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.categories enable row level security;

-- ── Expenses ─────────────────────────────────────────────────────────
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  kid_id uuid references public.kids(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  paid_by_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  currency text default 'AUD',
  date date not null,
  split_pct numeric(5,2) default 50,  -- % paid by the creator's side
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create index expenses_household_date_idx on public.expenses(household_id, date desc);

-- ── Helper: check household membership ───────────────────────────────
create or replace function public.is_household_member(hh_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh_id and user_id = auth.uid()
  );
$$;

-- ── RLS policies — both parents see everything in their household ────
create policy "view household" on public.households for select
  using (public.is_household_member(id));
create policy "update household" on public.households for update
  using (public.is_household_member(id));

create policy "view members" on public.household_members for select
  using (public.is_household_member(household_id));
create policy "insert self" on public.household_members for insert
  with check (user_id = auth.uid());
create policy "update self" on public.household_members for update
  using (user_id = auth.uid());
create policy "delete self" on public.household_members for delete
  using (user_id = auth.uid());

create policy "view invites" on public.invites for select
  using (public.is_household_member(household_id) or invited_by = auth.uid());
create policy "create invites" on public.invites for insert
  with check (public.is_household_member(household_id) and invited_by = auth.uid());
create policy "update invites" on public.invites for update
  using (true);  -- accept_invite() handles auth via SECURITY DEFINER

create policy "all kids" on public.kids for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "all categories" on public.categories for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "all expenses" on public.expenses for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ── Auto-create household + seed categories when a user signs up ─────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_hh_id uuid;
  email_local text;
begin
  -- Skip if user joined via invite (we'll set this metadata via accept_invite)
  if (new.raw_user_meta_data->>'joined_household') is not null then
    return new;
  end if;

  -- Get display name from email
  email_local := split_part(coalesce(new.email, 'user'), '@', 1);

  -- Create household
  insert into public.households (name) values (email_local || '''s household')
  returning id into new_hh_id;

  -- Add user as primary parent
  insert into public.household_members (household_id, user_id, display_name, color, role)
  values (new_hh_id, new.id, email_local, '#2563eb', 'parent');

  -- Seed default categories
  insert into public.categories (household_id, name, emoji, color) values
    (new_hh_id, 'Medical',    '❤️',  '#dc2626'),
    (new_hh_id, 'School',     '📚',  '#2563eb'),
    (new_hh_id, 'Sports',     '⚽',  '#059669'),
    (new_hh_id, 'Excursions', '📍',  '#d97706'),
    (new_hh_id, 'Travel',     '✈️',  '#7c3aed'),
    (new_hh_id, 'Dental',     '😁',  '#db2777'),
    (new_hh_id, 'Clothing',   '🛍️',  '#0891b2'),
    (new_hh_id, 'Food',       '🍽️',  '#d97706'),
    (new_hh_id, 'Other',      '🏷️',  '#475569');

  return new;
exception when others then
  raise warning 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$;

create trigger on_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RPC: accept an invite code ───────────────────────────────────────
create or replace function public.accept_invite(invite_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  inv record;
  current_user_id uuid := auth.uid();
  user_email text;
  email_local text;
  existing_hh uuid;
begin
  if current_user_id is null then
    return json_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  -- Find valid invite
  select * into inv from public.invites
  where code = invite_code and accepted = false and expires_at > now()
  limit 1;

  if inv is null then
    return json_build_object('ok', false, 'error', 'Invite code is invalid or expired');
  end if;

  -- Prevent inviting yourself if already in this household
  if exists (select 1 from public.household_members where household_id = inv.household_id and user_id = current_user_id) then
    return json_build_object('ok', false, 'error', 'You are already in this household');
  end if;

  -- Check if user is in another household — we'll remove them from it
  select household_id into existing_hh from public.household_members where user_id = current_user_id limit 1;

  -- Get email for display name
  select email into user_email from auth.users where id = current_user_id;
  email_local := split_part(coalesce(user_email, 'partner'), '@', 1);

  -- Remove from old household (only their membership, not the household itself)
  if existing_hh is not null then
    delete from public.household_members where user_id = current_user_id;
    -- If they were the only member of old household, clean it up
    if not exists (select 1 from public.household_members where household_id = existing_hh) then
      delete from public.households where id = existing_hh;
    end if;
  end if;

  -- Add to new household
  insert into public.household_members (household_id, user_id, display_name, color, role)
  values (inv.household_id, current_user_id, email_local, '#d97706', 'coparent');

  -- Mark invite as accepted
  update public.invites set accepted = true, accepted_by = current_user_id where id = inv.id;

  return json_build_object('ok', true, 'household_id', inv.household_id);
end;
$$;
