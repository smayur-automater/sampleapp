-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Kids table
create table if not exists public.kids (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  date_of_birth date,
  avatar_color text default '#2563eb',
  created_at timestamptz default now()
);

alter table public.kids enable row level security;

create policy "Users can manage their own kids"
  on public.kids for all
  using (auth.uid() = user_id);

-- Categories table
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text default 'tag',
  color text default '#64748b',
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id);

-- Expenses table
create table if not exists public.expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  kid_id uuid references public.kids(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  amount numeric(12,2) not null,
  currency text default 'AUD',
  description text not null,
  date date not null,
  split_percentage numeric(5,2) default 50,
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;

create policy "Users can manage their own expenses"
  on public.expenses for all
  using (auth.uid() = user_id);

-- Seed default categories for new users (via trigger)
create or replace function public.seed_default_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name, icon, color) values
    (new.id, 'Medical', 'heart', '#ef4444'),
    (new.id, 'School', 'book-open', '#3b82f6'),
    (new.id, 'Sports', 'activity', '#10b981'),
    (new.id, 'Excursions', 'map-pin', '#f59e0b'),
    (new.id, 'Travel', 'plane', '#6366f1'),
    (new.id, 'Dental', 'smile', '#ec4899'),
    (new.id, 'Clothing', 'shopping-bag', '#8b5cf6'),
    (new.id, 'Food', 'utensils', '#f97316'),
    (new.id, 'Other', 'tag', '#64748b');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.seed_default_categories();
