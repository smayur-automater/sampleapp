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
