create extension if not exists "uuid-ossp";

create table if not exists public.kids (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  dob date,
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.kids enable row level security;
create policy "Own kids" on public.kids for all using (auth.uid() = user_id);

create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  emoji text default '🏷️',
  color text default '#2563eb',
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "Own categories" on public.categories for all using (auth.uid() = user_id);

create table if not exists public.expenses (
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
create policy "Own expenses" on public.expenses for all using (auth.uid() = user_id);

create or replace function public.seed_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into public.categories (user_id, name, emoji, color) values
    (new.id, 'Medical','❤️','#dc2626'),
    (new.id, 'School','📚','#2563eb'),
    (new.id, 'Sports','⚽','#059669'),
    (new.id, 'Excursions','📍','#d97706'),
    (new.id, 'Travel','✈️','#7c3aed'),
    (new.id, 'Dental','😁','#db2777'),
    (new.id, 'Clothing','🛍️','#0891b2'),
    (new.id, 'Food','🍽️','#d97706'),
    (new.id, 'Other','🏷️','#475569');
  return new;
end;
$$;

drop trigger if exists on_user_created on auth.users;
create trigger on_user_created
  after insert on auth.users
  for each row execute procedure public.seed_categories();
