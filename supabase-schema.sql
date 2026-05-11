-- ═══════════════════════════════════════════════════════════════
-- CoParent — Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1. Clean up any old/broken installation
drop trigger if exists on_user_created on auth.users;
drop function if exists public.seed_categories();
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.kids cascade;

-- 2. Required extension
create extension if not exists "uuid-ossp";

-- 3. Kids table
create table public.kids (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dob date,
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.kids enable row level security;
create policy "users manage own kids" on public.kids for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Categories table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text default '🏷️',
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "users manage own categories" on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Expenses table
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  kid_id uuid references public.kids(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  description text not null,
  amount numeric(12,2) not null,
  currency text default 'AUD',
  date date not null,
  split_pct numeric(5,2) default 50,
  created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "users manage own expenses" on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Trigger function — seeds default categories for new users
-- Uses SECURITY DEFINER so it can bypass RLS during insert
-- Wrapped in exception handler so signup never fails if seeding fails
create or replace function public.seed_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.categories (user_id, name, emoji, color) values
      (new.id, 'Medical',    '❤️',  '#dc2626'),
      (new.id, 'School',     '📚',  '#2563eb'),
      (new.id, 'Sports',     '⚽',  '#059669'),
      (new.id, 'Excursions', '📍',  '#d97706'),
      (new.id, 'Travel',     '✈️',  '#7c3aed'),
      (new.id, 'Dental',     '😁',  '#db2777'),
      (new.id, 'Clothing',   '🛍️',  '#0891b2'),
      (new.id, 'Food',       '🍽️',  '#d97706'),
      (new.id, 'Other',      '🏷️',  '#475569');
  exception when others then
    -- Never block user signup if seeding fails for any reason
    raise warning 'Could not seed categories for user %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

-- 7. Attach trigger to user creation
create trigger on_user_created
  after insert on auth.users
  for each row execute procedure public.seed_categories();

-- ═══════════════════════════════════════════════════════════════
-- Done! Now go to Authentication → Providers → enable Email/Google
-- ═══════════════════════════════════════════════════════════════
