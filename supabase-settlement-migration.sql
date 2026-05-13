-- ════════════════════════════════════════════════════════════════
-- Settlement System Migration
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Add settlement fields to expenses
alter table public.expenses
  add column if not exists settlement_status text default 'outstanding'
    check (settlement_status in ('outstanding','partial','settled')),
  add column if not exists settled_amount    numeric(12,2) default 0,
  add column if not exists settled_at        timestamptz,
  add column if not exists settled_by        uuid references auth.users(id) on delete set null,
  add column if not exists settlement_note   text;

-- 2. Settlements log — every payment against an expense
create table if not exists public.settlements (
  id             uuid default uuid_generate_v4() primary key,
  household_id   uuid references public.households(id) on delete cascade not null,
  expense_id     uuid references public.expenses(id) on delete cascade,  -- null = monthly bulk settlement
  paid_by        uuid references auth.users(id) on delete set null not null,
  received_by    uuid references auth.users(id) on delete set null not null,
  amount         numeric(12,2) not null,
  currency       text default 'AUD',
  note           text,
  settlement_date date not null default current_date,
  month_year     text,   -- 'YYYY-MM' for monthly bulk settlements
  created_at     timestamptz default now()
);
alter table public.settlements enable row level security;
create index if not exists settlements_household_idx on public.settlements(household_id, settlement_date desc);
create index if not exists settlements_expense_idx   on public.settlements(expense_id);

create policy "household members manage settlements"
  on public.settlements for all
  using  (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- 3. RPC: record a settlement payment (single expense or bulk)
create or replace function public.record_settlement(
  hh_id        uuid,
  paid_by_uid  uuid,
  recv_by_uid  uuid,
  amt          numeric,
  curr         text,
  note_text    text,
  settle_date  date,
  exp_id       uuid default null,   -- null = monthly bulk
  month_yr     text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  new_settled  numeric;
  exp_owed     numeric;
  new_status   text;
begin
  if not public.is_household_member(hh_id) then raise exception 'Unauthorized'; end if;

  -- Insert settlement record
  insert into public.settlements(household_id, expense_id, paid_by, received_by, amount, currency, note, settlement_date, month_year)
  values (hh_id, exp_id, paid_by_uid, recv_by_uid, amt, curr, note_text, settle_date, month_yr);

  -- Update expense status if linked to one expense
  if exp_id is not null then
    select
      coalesce(settled_amount, 0) + amt,
      amount * (case when created_by = paid_by_uid then (100 - split_pct) else split_pct end) / 100
    into new_settled, exp_owed
    from public.expenses where id = exp_id;

    new_status := case
      when new_settled <= 0                  then 'outstanding'
      when new_settled >= exp_owed - 0.01    then 'settled'
      else                                        'partial'
    end;

    update public.expenses
    set settled_amount    = new_settled,
        settlement_status = new_status,
        settled_at        = case when new_status = 'settled' then now() else null end,
        settled_by        = case when new_status = 'settled' then paid_by_uid else null end,
        settlement_note   = note_text
    where id = exp_id;
  end if;

  -- Bulk monthly settlement — mark all outstanding/partial for this month as settled
  if month_yr is not null and exp_id is null then
    update public.expenses
    set settlement_status = 'settled',
        settled_at        = now(),
        settled_by        = paid_by_uid,
        settlement_note   = coalesce(note_text, 'Monthly settlement ' || month_yr)
    where household_id = hh_id
      and settlement_status != 'settled'
      and to_char(date, 'YYYY-MM') = month_yr
      and archived = false;
  end if;

  return json_build_object('ok', true);
end;
$$;

-- 4. RPC: dashboard summary with settlement states
create or replace function public.get_settlement_summary(hh_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not public.is_household_member(hh_id) then raise exception 'Unauthorized'; end if;
  return (
    select json_build_object(
      'total_outstanding', coalesce(sum(case when settlement_status = 'outstanding' then amount else 0 end),0),
      'total_partial',     coalesce(sum(case when settlement_status = 'partial'     then amount else 0 end),0),
      'total_settled',     coalesce(sum(case when settlement_status = 'settled'     then amount else 0 end),0),
      'count_outstanding', count(case when settlement_status = 'outstanding' then 1 end),
      'count_partial',     count(case when settlement_status = 'partial'     then 1 end),
      'count_settled',     count(case when settlement_status = 'settled'     then 1 end)
    )
    from public.expenses
    where household_id = hh_id and archived = false
  );
end;
$$;
