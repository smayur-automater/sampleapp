-- ════════════════════════════════════════════════════════════════
-- CoParent Premium + Data Retention Migration
-- Run AFTER main schema and admin migration
-- ════════════════════════════════════════════════════════════════

-- 1. Add plan column to household_members
alter table public.household_members
  add column if not exists plan text default 'free' check (plan in ('free','premium')),
  add column if not exists plan_assigned_at timestamptz,
  add column if not exists plan_assigned_by uuid references auth.users(id);

-- 2. Enable RLS plan visibility
create or replace function public.get_my_plan()
returns text language sql security definer set search_path = public as $$
  select coalesce(
    (select plan from public.household_members where user_id = auth.uid() limit 1),
    'free'
  );
$$;

-- 3. Enforce 10 expense limit for free users (trigger)
create or replace function public.check_expense_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_plan text;
  expense_count int;
begin
  -- Get user's plan
  select plan into user_plan
  from public.household_members
  where user_id = NEW.created_by limit 1;

  if coalesce(user_plan, 'free') = 'premium' then
    return NEW;
  end if;

  -- Count existing expenses by this user
  select count(*) into expense_count
  from public.expenses
  where created_by = NEW.created_by;

  if expense_count >= 10 then
    raise exception 'Free plan limit: maximum 10 expenses. Upgrade to Premium for unlimited entries.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_expense_limit on public.expenses;
create trigger enforce_expense_limit
  before insert on public.expenses
  for each row execute procedure public.check_expense_limit();

-- 4. Data retention: mark expenses older than 7 years as archived (not deleted)
alter table public.expenses
  add column if not exists archived boolean default false;

-- Scheduled function to archive old data (call via cron or manually)
create or replace function public.archive_old_expenses()
returns int language plpgsql security definer set search_path = public as $$
declare archived_count int;
begin
  update public.expenses
  set archived = true
  where date < current_date - interval '7 years'
    and archived = false;
  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

-- Update expense queries to exclude archived by default
-- (handled in app layer with .eq('archived', false))

-- 5. Admin RPCs for plan management
create or replace function public.admin_set_plan(uid uuid, new_plan text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  if new_plan not in ('free','premium') then raise exception 'Invalid plan'; end if;

  update public.household_members
  set plan = new_plan,
      plan_assigned_at = now(),
      plan_assigned_by = auth.uid()
  where user_id = uid;

  return json_build_object('ok', true, 'user_id', uid, 'plan', new_plan);
end;
$$;

-- 6. RPC to get current user's plan + expense count
create or replace function public.get_my_usage()
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  user_plan text;
  expense_count int;
begin
  select plan into user_plan from public.household_members where user_id = uid limit 1;
  select count(*) into expense_count from public.expenses where created_by = uid and archived = false;

  return json_build_object(
    'plan', coalesce(user_plan, 'free'),
    'expense_count', expense_count,
    'limit', case when coalesce(user_plan,'free') = 'premium' then null else 10 end,
    'can_add', case when coalesce(user_plan,'free') = 'premium' then true else expense_count < 10 end
  );
end;
$$;

-- 7. Update admin_get_users to include plan info
create or replace function public.admin_get_users()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  select json_agg(row_to_json(t)) into result from (
    select
      u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
      hm.display_name, hm.color, hm.role, hm.household_id, hm.plan,
      hm.plan_assigned_at,
      h.name as household_name,
      count(distinct e.id)::int as expense_count,
      coalesce(sum(e.amount), 0)::numeric as total_spend
    from auth.users u
    left join public.household_members hm on hm.user_id = u.id
    left join public.households h on h.id = hm.household_id
    left join public.expenses e on e.created_by = u.id and e.archived = false
    group by u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
             hm.display_name, hm.color, hm.role, hm.household_id, hm.plan,
             hm.plan_assigned_at, h.name
    order by u.created_at desc
  ) t;
  return coalesce(result, '[]'::json);
end;
$$;


-- ════════════════════════════════════════════════════════════════
-- Audit Trail
-- ════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id          uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete set null,
  actor_name  text,
  action      text not null,   -- 'expense.add' | 'expense.edit' | 'expense.delete' | 'kid.add' etc
  entity      text,            -- human-readable name of the thing changed
  detail      text,            -- extra context e.g. "$45.00 Medical"
  created_at  timestamptz default now()
);
alter table public.audit_log enable row level security;
create index audit_log_household_idx on public.audit_log(household_id, created_at desc);

-- Both parents can read the audit log for their household
create policy "household members can view audit log"
  on public.audit_log for select
  using (public.is_household_member(household_id));

-- Any household member can insert (app writes on their behalf)
create policy "household members can insert audit log"
  on public.audit_log for insert
  with check (public.is_household_member(household_id) and user_id = auth.uid());


-- ════════════════════════════════════════════════════════════════
-- Smart Rules + Monthly Statements
-- ════════════════════════════════════════════════════════════════

-- Split rules per category
create table if not exists public.split_rules (
  id           uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  category_id  uuid references public.categories(id) on delete cascade not null,
  split_pct    int  not null check (split_pct between 0 and 100),  -- % for creator/first parent
  is_optional  boolean default false,   -- "optional" = mark with flag, no auto-split
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now(),
  unique (household_id, category_id)
);
alter table public.split_rules enable row level security;
create policy "household members manage rules"
  on public.split_rules for all
  using  (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Monthly statement log (track which months have been emailed)
create table if not exists public.monthly_statements (
  id           uuid default uuid_generate_v4() primary key,
  household_id uuid references public.households(id) on delete cascade not null,
  year         int  not null,
  month        int  not null check (month between 1 and 12),
  generated_at timestamptz default now(),
  emailed      boolean default false,
  emailed_at   timestamptz,
  unique (household_id, year, month)
);
alter table public.monthly_statements enable row level security;
create policy "household members view statements"
  on public.monthly_statements for all
  using  (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- RPC: get monthly summary data
create or replace function public.get_monthly_summary(hh_id uuid, yr int, mo int)
returns json language plpgsql security definer set search_path = public as $$
declare
  result json;
  uid uuid := auth.uid();
begin
  if not public.is_household_member(hh_id) then raise exception 'Unauthorized'; end if;

  select json_build_object(
    'year',  yr,
    'month', mo,
    'total', coalesce((
      select sum(amount) from public.expenses
      where household_id = hh_id
        and extract(year from date)  = yr
        and extract(month from date) = mo
        and archived = false
    ), 0),
    'by_currency', (
      select json_agg(row_to_json(c)) from (
        select currency, sum(amount)::numeric as total, count(*)::int as count
        from public.expenses
        where household_id = hh_id
          and extract(year from date)  = yr
          and extract(month from date) = mo
          and archived = false
        group by currency
      ) c
    ),
    'by_member', (
      select json_agg(row_to_json(m)) from (
        select
          e.paid_by_user_id as user_id,
          hm.display_name,
          hm.color,
          sum(e.amount)::numeric as paid,
          sum(e.amount * case when e.created_by = hm.user_id then e.split_pct else 100-e.split_pct end / 100)::numeric as owed
        from public.expenses e
        join public.household_members hm on hm.user_id = e.paid_by_user_id and hm.household_id = hh_id
        where e.household_id = hh_id
          and extract(year from e.date) = yr
          and extract(month from e.date) = mo
          and e.archived = false
        group by e.paid_by_user_id, hm.display_name, hm.color
      ) m
    ),
    'by_category', (
      select json_agg(row_to_json(c)) from (
        select
          cat.name, cat.color,
          sum(e.amount)::numeric as total,
          count(*)::int as count
        from public.expenses e
        join public.categories cat on cat.id = e.category_id
        where e.household_id = hh_id
          and extract(year from e.date) = yr
          and extract(month from e.date) = mo
          and e.archived = false
        group by cat.name, cat.color
        order by total desc
      ) c
    ),
    'expenses', (
      select json_agg(row_to_json(ex)) from (
        select
          e.id, e.description, e.amount, e.currency, e.date, e.split_pct,
          k.name as kid_name, cat.name as category_name,
          paid.display_name as paid_by_name,
          creator.display_name as created_by_name
        from public.expenses e
        left join public.kids k on k.id = e.kid_id
        left join public.categories cat on cat.id = e.category_id
        left join public.household_members paid on paid.user_id = e.paid_by_user_id and paid.household_id = hh_id
        left join public.household_members creator on creator.user_id = e.created_by and creator.household_id = hh_id
        where e.household_id = hh_id
          and extract(year from e.date) = yr
          and extract(month from e.date) = mo
          and e.archived = false
        order by e.date asc
      ) ex
    )
  ) into result;

  return result;
end;
$$;
