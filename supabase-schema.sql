-- ════════════════════════════════════════════════════════════════════
-- CoParent v5 — Lucide icons, household sharing, creator-only edit
-- Run this entire file in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

drop trigger if exists on_user_created on auth.users cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.accept_invite(text) cascade;
drop function if exists public.remove_coparent() cascade;
drop function if exists public.is_household_member(uuid) cascade;
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.kids cascade;
drop table if exists public.household_members cascade;
drop table if exists public.invites cascade;
drop table if exists public.households cascade;
drop table if exists public.parents cascade;

create extension if not exists "uuid-ossp";

create table public.households (
  id uuid default uuid_generate_v4() primary key,
  name text default 'My household',
  created_at timestamptz default now()
);
alter table public.households enable row level security;

create table public.household_members (
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  color text default '#475569',
  role text default 'parent' check (role in ('parent','coparent')),
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);
alter table public.household_members enable row level security;

create table public.invites (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  invited_email text not null,
  code text not null unique,
  accepted boolean default false,
  accepted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);
alter table public.invites enable row level security;
create index invites_code_idx on public.invites(code);

create table public.kids (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  dob date,
  color text default '#475569',
  created_at timestamptz default now()
);
alter table public.kids enable row level security;

-- icon is now a lucide-react icon name
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  icon text default 'tag',
  color text default '#475569',
  created_at timestamptz default now()
);
alter table public.categories enable row level security;

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
  split_pct numeric(5,2) default 50,
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create index expenses_household_date_idx on public.expenses(household_id, date desc);

create or replace function public.is_household_member(hh_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.household_members where household_id = hh_id and user_id = auth.uid());
$$;

create policy "view household" on public.households for select using (public.is_household_member(id));
create policy "update household" on public.households for update using (public.is_household_member(id));

create policy "view members" on public.household_members for select using (public.is_household_member(household_id));
create policy "insert self" on public.household_members for insert with check (user_id = auth.uid());
create policy "update self" on public.household_members for update using (user_id = auth.uid());
create policy "delete self" on public.household_members for delete using (user_id = auth.uid());

create policy "view invites" on public.invites for select using (public.is_household_member(household_id) or invited_by = auth.uid());
create policy "create invites" on public.invites for insert with check (public.is_household_member(household_id) and invited_by = auth.uid());
create policy "update invites" on public.invites for update using (true);
create policy "delete invites" on public.invites for delete using (invited_by = auth.uid());

create policy "view kids" on public.kids for select using (public.is_household_member(household_id));
create policy "insert kids" on public.kids for insert with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "update own kids" on public.kids for update using (created_by = auth.uid() and public.is_household_member(household_id));
create policy "delete own kids" on public.kids for delete using (created_by = auth.uid() and public.is_household_member(household_id));

create policy "view categories" on public.categories for select using (public.is_household_member(household_id));
create policy "insert categories" on public.categories for insert with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "update own categories" on public.categories for update using (created_by = auth.uid() and public.is_household_member(household_id));
create policy "delete own categories" on public.categories for delete using (created_by = auth.uid() and public.is_household_member(household_id));

create policy "view expenses" on public.expenses for select using (public.is_household_member(household_id));
create policy "insert expenses" on public.expenses for insert with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "update own expenses" on public.expenses for update using (created_by = auth.uid() and public.is_household_member(household_id));
create policy "delete own expenses" on public.expenses for delete using (created_by = auth.uid() and public.is_household_member(household_id));

-- New user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_hh_id uuid;
  email_local text;
begin
  if (new.raw_user_meta_data->>'joined_household') is not null then return new; end if;
  email_local := split_part(coalesce(new.email, 'user'), '@', 1);

  insert into public.households (name) values (email_local || '''s household') returning id into new_hh_id;

  insert into public.household_members (household_id, user_id, display_name, color, role)
  values (new_hh_id, new.id, email_local, '#475569', 'parent');

  insert into public.categories (household_id, created_by, name, icon, color) values
    (new_hh_id, new.id, 'Medical',    'heart-pulse', '#64748b'),
    (new_hh_id, new.id, 'School',     'graduation-cap', '#64748b'),
    (new_hh_id, new.id, 'Sports',     'dumbbell', '#64748b'),
    (new_hh_id, new.id, 'Excursions', 'map-pin', '#64748b'),
    (new_hh_id, new.id, 'Travel',     'plane', '#64748b'),
    (new_hh_id, new.id, 'Dental',     'sparkles', '#64748b'),
    (new_hh_id, new.id, 'Clothing',   'shirt', '#64748b'),
    (new_hh_id, new.id, 'Food',       'utensils', '#64748b'),
    (new_hh_id, new.id, 'Music',      'music', '#64748b'),
    (new_hh_id, new.id, 'Other',      'tag', '#64748b');

  return new;
exception when others then
  raise warning 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$;

create trigger on_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Accept invite
create or replace function public.accept_invite(invite_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  inv record;
  current_user_id uuid := auth.uid();
  user_email text;
  email_local text;
  existing_hh uuid;
begin
  if current_user_id is null then return json_build_object('ok', false, 'error', 'Not authenticated'); end if;

  select * into inv from public.invites
  where code = invite_code and accepted = false and expires_at > now() limit 1;

  if inv is null then return json_build_object('ok', false, 'error', 'Invite is invalid or expired'); end if;

  if exists (select 1 from public.household_members where household_id = inv.household_id and user_id = current_user_id) then
    return json_build_object('ok', false, 'error', 'You are already in this household');
  end if;

  select household_id into existing_hh from public.household_members where user_id = current_user_id limit 1;
  select email into user_email from auth.users where id = current_user_id;
  email_local := split_part(coalesce(user_email, 'partner'), '@', 1);

  if existing_hh is not null then
    delete from public.household_members where user_id = current_user_id;
    if not exists (select 1 from public.household_members where household_id = existing_hh) then
      delete from public.households where id = existing_hh;
    end if;
  end if;

  insert into public.household_members (household_id, user_id, display_name, color, role)
  values (inv.household_id, current_user_id, email_local, '#475569', 'coparent');

  update public.invites set accepted = true, accepted_by = current_user_id where id = inv.id;

  return json_build_object('ok', true, 'household_id', inv.household_id);
end;
$$;

-- Remove the co-parent (called by primary parent only)
create or replace function public.remove_coparent(coparent_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  hh_id uuid;
begin
  if current_user_id is null then return json_build_object('ok', false, 'error', 'Not authenticated'); end if;

  -- Find shared household
  select hm1.household_id into hh_id
  from public.household_members hm1
  join public.household_members hm2 on hm1.household_id = hm2.household_id
  where hm1.user_id = current_user_id and hm2.user_id = coparent_user_id
  limit 1;

  if hh_id is null then
    return json_build_object('ok', false, 'error', 'Not in the same household');
  end if;

  -- Remove the co-parent from the household
  delete from public.household_members
  where household_id = hh_id and user_id = coparent_user_id;

  return json_build_object('ok', true);
end;
$$;
