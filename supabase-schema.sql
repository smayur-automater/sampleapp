-- ════════════════════════════════════════════════════════════════
-- CoParent — Database Schema (2 parents, simple split)
-- Run this whole file in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Clean slate
drop trigger if exists on_user_created on auth.users cascade;
drop trigger if exists on_auth_user_created on auth.users cascade;
drop function if exists public.seed_categories() cascade;
drop function if exists public.seed_default_categories() cascade;
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.kids cascade;
drop table if exists public.parents cascade;

create extension if not exists "uuid-ossp";

-- Parents: exactly 2 — me + co-parent
create table public.parents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#2563eb',
  role text not null check (role in ('me', 'coparent')),
  created_at timestamptz default now(),
  unique (user_id, role)
);
alter table public.parents enable row level security;
create policy "own parents" on public.parents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Kids (no default split anymore — slider always starts at 50/50)
create table public.kids (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dob date,
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.kids enable row level security;
create policy "own kids" on public.kids for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Categories
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text default '🏷️',
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "own categories" on public.categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expenses
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  kid_id uuid references public.kids(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  paid_by_id uuid references public.parents(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  currency text default 'AUD',
  date date not null,
  split_pct numeric(5,2) default 50,
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "own expenses" on public.expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists expenses_user_date_idx on public.expenses(user_id, date desc);
