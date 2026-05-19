-- ════════════════════════════════════════════════════════════════
-- KidExpense Admin Layer
-- Run in Supabase SQL Editor AFTER the main schema
-- ════════════════════════════════════════════════════════════════

-- 1. Admin users table
create table if not exists public.admins (
  user_id uuid references auth.users(id) on delete cascade primary key,
  email   text not null,
  added_at timestamptz default now()
);
alter table public.admins enable row level security;

-- RLS policies for admins table
drop policy if exists "admins can view own row" on public.admins;
drop policy if exists "superuser insert"        on public.admins;
drop policy if exists "superuser delete"        on public.admins;

-- Logged-in users can see their own row
create policy "admins can view own row" on public.admins
  for select using (user_id = auth.uid());

-- SQL Editor / service role (no auth.uid) can insert and delete
create policy "superuser insert" on public.admins
  for insert with check (auth.uid() is null or auth.uid() = user_id);

create policy "superuser delete" on public.admins
  for delete using (auth.uid() is null or auth.uid() = user_id);

-- 2. Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 3. RPC: get all households with member counts, expense totals, last activity
create or replace function public.admin_get_households()
returns json language plpgsql security definer set search_path = public as $$
declare
  result json;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  select json_agg(row_to_json(t)) into result from (
    select
      h.id,
      h.name,
      h.created_at,
      count(distinct hm.user_id)::int          as member_count,
      count(distinct k.id)::int                as kid_count,
      count(distinct e.id)::int                as expense_count,
      coalesce(sum(e.amount), 0)::numeric      as total_spend,
      max(e.created_at)                        as last_expense_at,
      json_agg(distinct jsonb_build_object(
        'user_id', hm.user_id,
        'display_name', hm.display_name,
        'color', hm.color,
        'role', hm.role,
        'joined_at', hm.joined_at
      )) filter (where hm.user_id is not null) as members
    from public.households h
    left join public.household_members hm on hm.household_id = h.id
    left join public.kids              k  on k.household_id  = h.id
    left join public.expenses          e  on e.household_id  = h.id
    group by h.id
    order by h.created_at desc
  ) t;

  return coalesce(result, '[]'::json);
end;
$$;

-- 4. RPC: get all users with their household info
create or replace function public.admin_get_users()
returns json language plpgsql security definer set search_path = public as $$
declare
  result json;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  select json_agg(row_to_json(t)) into result from (
    select
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at,
      hm.display_name,
      hm.color,
      hm.role,
      hm.household_id,
      h.name as household_name,
      count(distinct e.id)::int       as expense_count,
      coalesce(sum(e.amount), 0)::numeric as total_spend
    from auth.users u
    left join public.household_members hm on hm.user_id = u.id
    left join public.households        h  on h.id = hm.household_id
    left join public.expenses          e  on e.created_by = u.id
    group by u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
             hm.display_name, hm.color, hm.role, hm.household_id, h.name
    order by u.created_at desc
  ) t;

  return coalesce(result, '[]'::json);
end;
$$;

-- 5. RPC: get platform-wide stats
create or replace function public.admin_get_stats()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  return (
    select json_build_object(
      'total_users',       (select count(*) from auth.users),
      'total_households',  (select count(*) from public.households),
      'total_kids',        (select count(*) from public.kids),
      'total_expenses',    (select count(*) from public.expenses),
      'total_spend',       (select coalesce(sum(amount), 0) from public.expenses),
      'linked_households', (select count(*) from (
                              select household_id from public.household_members
                              group by household_id having count(*) >= 2
                            ) x),
      'pending_invites',   (select count(*) from public.invites where accepted = false and expires_at > now()),
      'new_users_7d',      (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'new_expenses_7d',   (select count(*) from public.expenses where created_at > now() - interval '7 days'),
      'expenses_by_day',   (
        select json_agg(row_to_json(d)) from (
          select
            date_trunc('day', created_at)::date as day,
            count(*)::int as count,
            coalesce(sum(amount), 0)::numeric as amount
          from public.expenses
          where created_at > now() - interval '30 days'
          group by 1 order by 1
        ) d
      )
    )
  );
end;
$$;

-- 6. RPC: delete a household and all its data
create or replace function public.admin_delete_household(hh_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  delete from public.households where id = hh_id;
  return json_build_object('ok', true);
end;
$$;

-- 7. RPC: remove a member from a household
create or replace function public.admin_remove_member(hh_id uuid, uid uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  delete from public.household_members where household_id = hh_id and user_id = uid;
  return json_build_object('ok', true);
end;
$$;

-- 8. RPC: delete a kid
create or replace function public.admin_delete_kid(kid_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  delete from public.kids where id = kid_id;
  return json_build_object('ok', true);
end;
$$;

-- 9. RPC: delete an expense
create or replace function public.admin_delete_expense(expense_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;
  delete from public.expenses where id = expense_id;
  return json_build_object('ok', true);
end;
$$;

-- 10. RPC: get full detail for one household
create or replace function public.admin_get_household_detail(hh_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  select json_build_object(
    'household', (select row_to_json(h) from public.households h where h.id = hh_id),
    'members', (
      select json_agg(row_to_json(m)) from (
        select hm.*, au.email from public.household_members hm
        join auth.users au on au.id = hm.user_id
        where hm.household_id = hh_id
      ) m
    ),
    'kids', (
      select json_agg(row_to_json(k)) from public.kids k where k.household_id = hh_id
    ),
    'expenses', (
      select json_agg(row_to_json(e)) from (
        select e.*,
          kid.name as kid_name,
          cat.name as category_name,
          au.email as creator_email
        from public.expenses e
        left join public.kids k2 on k2.id = e.kid_id
        left join public.categories cat on cat.id = e.category_id
        left join auth.users au on au.id = e.created_by
        left join public.kids kid on kid.id = e.kid_id
        where e.household_id = hh_id
        order by e.date desc
        limit 100
      ) e
    ),
    'invites', (
      select json_agg(row_to_json(i)) from public.invites i where i.household_id = hh_id
    )
  ) into result;

  return result;
end;
$$;

-- ── HOW TO ADD YOURSELF AS ADMIN ─────────────────────────────────
-- After running this SQL, run the following with your user's UUID:
-- INSERT INTO public.admins (user_id, email) VALUES ('your-user-uuid-here', 'your@email.com');
--
-- Find your UUID in: Supabase → Authentication → Users → click your user


-- ════════════════════════════════════════════════════════════════
-- Hard delete a user + all their data (run this instead of
-- deleting directly from Supabase Auth UI)
-- ════════════════════════════════════════════════════════════════

create or replace function public.admin_delete_user(uid uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Unauthorized'; end if;

  -- 1. Delete settlements where this user was payer or receiver
  --    (paid_by / received_by are NOT NULL so we can't set them to null)
  delete from public.settlements where paid_by = uid or received_by = uid;

  -- 2. Remove from household (cascades household membership)
  delete from public.household_members where user_id = uid;

  -- 3. Null out created_by on records so other parent's data is preserved
  update public.expenses   set created_by = null, paid_by_user_id = null where created_by = uid;
  update public.expenses   set paid_by_user_id = null where paid_by_user_id = uid;
  update public.kids       set created_by = null where created_by = uid;
  update public.categories set created_by = null where created_by = uid;
  update public.invites    set invited_by = null where invited_by = uid;

  -- 4. Remove from admins table if present
  delete from public.admins where user_id = uid;

  -- 5. Finally delete the auth user
  delete from auth.users where id = uid;

  return json_build_object('ok', true, 'deleted_user_id', uid);
end;
$$;
