-- ═══════════════════════════════════════════════════════════════════════
-- KidExpense — COMPLETE DATABASE SETUP
-- Run this ONE file in Supabase SQL Editor to set up everything.
-- Safe to run multiple times (all statements use IF NOT EXISTS / OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════

-- Households
CREATE TABLE IF NOT EXISTS public.households (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Household members (parents)
CREATE TABLE IF NOT EXISTS public.household_members (
  household_id      uuid REFERENCES public.households(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      text NOT NULL,
  color             text DEFAULT '#1a3a6b',
  role              text DEFAULT 'parent',
  relationship      text DEFAULT 'Parent',
  plan              text DEFAULT 'free' CHECK (plan IN ('free','premium')),
  plan_assigned_at  timestamptz,
  permanent_premium boolean DEFAULT false,
  joined_at         timestamptz DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Add columns if they don't exist (safe for existing databases)
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS relationship      text DEFAULT 'Parent';
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS plan              text DEFAULT 'free';
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS plan_assigned_at  timestamptz;
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS permanent_premium boolean DEFAULT false;

-- Invites
CREATE TABLE IF NOT EXISTS public.invites (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id  uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email text NOT NULL,
  code          text NOT NULL UNIQUE,
  accepted      boolean DEFAULT false,
  accepted_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz DEFAULT (now() + interval '7 days')
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS invites_code_idx ON public.invites(code);

-- Kids
CREATE TABLE IF NOT EXISTS public.kids (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name         text NOT NULL,
  dob          date,
  color        text DEFAULT '#475569',
  gender       text DEFAULT 'Unknown',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Unknown';

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name         text NOT NULL,
  icon         text DEFAULT 'tag',
  color        text DEFAULT '#374151',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon  text DEFAULT 'tag';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#374151';

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id                 uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id       uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  kid_id             uuid REFERENCES public.kids(id) ON DELETE SET NULL,
  category_id        uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  paid_by_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  description        text NOT NULL,
  amount             numeric(12,2) NOT NULL,
  currency           text DEFAULT 'AUD',
  date               date NOT NULL DEFAULT CURRENT_DATE,
  split_pct          numeric(5,2) DEFAULT 50,
  receipt_url        text,
  archived           boolean DEFAULT false,
  settlement_status  text DEFAULT 'outstanding' CHECK (settlement_status IN ('outstanding','partial','settled')),
  settled_amount     numeric(12,2) DEFAULT 0,
  settled_at         timestamptz,
  settlement_note    text,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url       text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS archived          boolean DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'outstanding';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS settled_amount    numeric(12,2) DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS settled_at        timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS settlement_note   text;

-- Settlements
CREATE TABLE IF NOT EXISTS public.settlements (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id    uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  paid_by         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  received_by     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount          numeric(12,2) NOT NULL,
  curr            text DEFAULT 'AUD',
  settlement_date date NOT NULL DEFAULT CURRENT_DATE,
  note            text,
  exp_id          uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Split rules (Premium)
CREATE TABLE IF NOT EXISTS public.split_rules (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  category_id  uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  split_pct    numeric(5,2) DEFAULT 50,
  is_optional  boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (household_id, category_id)
);
ALTER TABLE public.split_rules ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  action       text NOT NULL,
  entity       text,
  detail       text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins
CREATE TABLE IF NOT EXISTS public.admins (
  user_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email    text NOT NULL,
  added_at timestamptz DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Monthly statements (Premium)
CREATE TABLE IF NOT EXISTS public.monthly_statements (
  id           uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  month_year   text NOT NULL,
  total_spend  numeric(12,2) DEFAULT 0,
  balance      numeric(12,2) DEFAULT 0,
  generated_at timestamptz DEFAULT now(),
  UNIQUE (household_id, month_year)
);
ALTER TABLE public.monthly_statements ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════════════

-- Helper: is_household_member
CREATE OR REPLACE FUNCTION public.is_household_member(hh_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hh_id AND user_id = auth.uid()
  );
$$;

-- Helper: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

-- Households
DROP POLICY IF EXISTS "members view household"   ON public.households;
CREATE POLICY "members view household" ON public.households FOR SELECT
  USING (public.is_household_member(id));

-- Household members
DROP POLICY IF EXISTS "members view members"     ON public.household_members;
DROP POLICY IF EXISTS "members update own"       ON public.household_members;
CREATE POLICY "members view members"   ON public.household_members FOR SELECT
  USING (public.is_household_member(household_id));
CREATE POLICY "members update own"     ON public.household_members FOR UPDATE
  USING (user_id = auth.uid());

-- Invites
DROP POLICY IF EXISTS "household invite access"  ON public.invites;
CREATE POLICY "household invite access" ON public.invites FOR ALL
  USING (public.is_household_member(household_id));
DROP POLICY IF EXISTS "invited user can view"    ON public.invites;
CREATE POLICY "invited user can view" ON public.invites FOR SELECT
  USING (invited_email = auth.email());

-- Kids
DROP POLICY IF EXISTS "household kids access"    ON public.kids;
CREATE POLICY "household kids access" ON public.kids FOR ALL
  USING (public.is_household_member(household_id));

-- Categories
DROP POLICY IF EXISTS "household cats access"    ON public.categories;
CREATE POLICY "household cats access" ON public.categories FOR ALL
  USING (public.is_household_member(household_id));

-- Expenses
DROP POLICY IF EXISTS "view expenses"            ON public.expenses;
DROP POLICY IF EXISTS "insert expenses"          ON public.expenses;
DROP POLICY IF EXISTS "update own expenses"      ON public.expenses;
DROP POLICY IF EXISTS "delete own expenses"      ON public.expenses;
CREATE POLICY "view expenses"       ON public.expenses FOR SELECT
  USING (public.is_household_member(household_id));
CREATE POLICY "insert expenses"     ON public.expenses FOR INSERT
  WITH CHECK (public.is_household_member(household_id) AND created_by = auth.uid());
CREATE POLICY "update own expenses" ON public.expenses FOR UPDATE
  USING (created_by = auth.uid() AND public.is_household_member(household_id));
CREATE POLICY "delete own expenses" ON public.expenses FOR DELETE
  USING (created_by = auth.uid() AND public.is_household_member(household_id));

-- Settlements
DROP POLICY IF EXISTS "members view settlements" ON public.settlements;
CREATE POLICY "members view settlements" ON public.settlements FOR ALL
  USING (public.is_household_member(household_id));

-- Split rules
DROP POLICY IF EXISTS "members manage split rules" ON public.split_rules;
CREATE POLICY "members manage split rules" ON public.split_rules FOR ALL
  USING (public.is_household_member(household_id));

-- Audit log
DROP POLICY IF EXISTS "members view audit"       ON public.audit_log;
CREATE POLICY "members view audit" ON public.audit_log FOR ALL
  USING (public.is_household_member(household_id));

-- Monthly statements
DROP POLICY IF EXISTS "members view statements"  ON public.monthly_statements;
CREATE POLICY "members view statements" ON public.monthly_statements FOR ALL
  USING (public.is_household_member(household_id));

-- Admins
DROP POLICY IF EXISTS "admins can view own row"  ON public.admins;
DROP POLICY IF EXISTS "superuser insert"         ON public.admins;
DROP POLICY IF EXISTS "superuser delete"         ON public.admins;
CREATE POLICY "admins can view own row" ON public.admins FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "superuser insert" ON public.admins FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);
CREATE POLICY "superuser delete" ON public.admins FOR DELETE
  USING (auth.uid() IS NULL OR auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════
-- STORAGE
-- ══════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipt upload"  ON storage.objects;
DROP POLICY IF EXISTS "receipt view"    ON storage.objects;
DROP POLICY IF EXISTS "receipt delete"  ON storage.objects;
CREATE POLICY "receipt upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "receipt view"   ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');
CREATE POLICY "receipt delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts');

-- ══════════════════════════════════════════════════════════════════════
-- CORE FUNCTIONS & TRIGGER
-- ══════════════════════════════════════════════════════════════════════

-- New user trigger: create household + seed categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_hh_id    uuid;
  first_name   text;
  last_name    text;
  display_name text;
BEGIN
  IF (new.raw_user_meta_data->>'joined_household') IS NOT NULL THEN RETURN new; END IF;

  first_name   := TRIM(COALESCE(new.raw_user_meta_data->>'first_name', ''));
  last_name    := TRIM(COALESCE(new.raw_user_meta_data->>'last_name', ''));

  IF first_name <> '' AND last_name <> '' THEN
    display_name := first_name || ' ' || last_name;
  ELSIF first_name <> '' THEN
    display_name := first_name;
  ELSE
    display_name := SPLIT_PART(COALESCE(new.email, 'user'), '@', 1);
  END IF;

  INSERT INTO public.households (name)
  VALUES (display_name || '''s household')
  RETURNING id INTO new_hh_id;

  INSERT INTO public.household_members (household_id, user_id, display_name, color, role)
  VALUES (new_hh_id, new.id, display_name, '#1a3a6b', 'parent');

  INSERT INTO public.categories (household_id, created_by, name, icon, color) VALUES
    (new_hh_id, new.id, 'Medical',    'heart',        '#dc2626'),
    (new_hh_id, new.id, 'School',     'academic-cap', '#1a3a6b'),
    (new_hh_id, new.id, 'Sports',     'trophy',       '#059669'),
    (new_hh_id, new.id, 'Excursions', 'map-pin',      '#4f46e5'),
    (new_hh_id, new.id, 'Travel',     'plane',        '#0891b2'),
    (new_hh_id, new.id, 'Dental',     'sparkles',     '#7c3aed'),
    (new_hh_id, new.id, 'Clothing',   'shopping-bag', '#374151'),
    (new_hh_id, new.id, 'Food',       'cake',         '#d97706'),
    (new_hh_id, new.id, 'Activities', 'puzzle',       '#db2777'),
    (new_hh_id, new.id, 'Other',      'tag',          '#374151');

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Accept invite RPC
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv   record;
  uid   uuid := auth.uid();
BEGIN
  SELECT * INTO inv FROM public.invites
  WHERE code = invite_code AND accepted = false
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid or expired invite');
  END IF;

  IF EXISTS (SELECT 1 FROM public.household_members WHERE user_id = uid) THEN
    RETURN json_build_object('ok', false, 'error', 'Already in a household');
  END IF;

  INSERT INTO public.household_members (household_id, user_id, display_name, color, role)
  VALUES (inv.household_id, uid,
    COALESCE(
      NULLIF(NULLIF(TRIM(
        COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = uid), '') || ' ' ||
        COALESCE((SELECT raw_user_meta_data->>'last_name'  FROM auth.users WHERE id = uid), '')
      ), ' '), ''),
      SPLIT_PART((SELECT email FROM auth.users WHERE id = uid), '@', 1)
    ),
    '#2ec4a0', 'coparent');

  UPDATE public.invites
  SET accepted = true, accepted_by = uid
  WHERE id = inv.id;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"joined_household": true}'
  WHERE id = uid;

  RETURN json_build_object('ok', true, 'household_id', inv.household_id);
END;
$$;

-- get_my_usage RPC
CREATE OR REPLACE FUNCTION public.get_my_usage()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hh_id      uuid;
  exp_count  int;
  user_plan  text;
BEGIN
  SELECT household_id INTO hh_id FROM public.household_members
  WHERE user_id = auth.uid() LIMIT 1;

  IF hh_id IS NULL THEN
    RETURN json_build_object('count',0,'plan','free','can_add',true,'limit',10);
  END IF;

  SELECT COALESCE(plan,'free') INTO user_plan
  FROM public.household_members WHERE user_id = auth.uid() AND household_id = hh_id;

  SELECT COUNT(*) INTO exp_count FROM public.expenses
  WHERE household_id = hh_id AND COALESCE(archived, false) = false;

  RETURN json_build_object(
    'count',   exp_count,
    'plan',    user_plan,
    'can_add', (user_plan = 'premium' OR exp_count < 10),
    'limit',   CASE WHEN user_plan = 'premium' THEN NULL ELSE 10 END
  );
END;
$$;

-- record_settlement RPC
DROP FUNCTION IF EXISTS public.record_settlement(uuid,uuid,uuid,numeric,text,text,date,uuid,text);
DROP FUNCTION IF EXISTS public.record_settlement(uuid,numeric,text,date);
CREATE FUNCTION public.record_settlement(
  hh_id        uuid,
  paid_by_uid  uuid,
  recv_by_uid  uuid,
  amt          numeric,
  curr         text    DEFAULT 'AUD',
  note_text    text    DEFAULT NULL,
  settle_date  date    DEFAULT CURRENT_DATE,
  exp_id       uuid    DEFAULT NULL,
  month_yr     text    DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_settled numeric;
  exp_amount  numeric;
  new_status  text;
BEGIN
  IF exp_id IS NOT NULL THEN
    SELECT amount INTO exp_amount FROM public.expenses WHERE id = exp_id;
    new_settled := COALESCE((SELECT settled_amount FROM public.expenses WHERE id = exp_id),0) + amt;
    IF new_settled >= exp_amount THEN new_status := 'settled'; new_settled := exp_amount;
    ELSE new_status := 'partial'; END IF;
    UPDATE public.expenses
    SET settled_amount = new_settled, settlement_status = new_status,
        settled_at = CASE WHEN new_status='settled' THEN now() ELSE NULL END,
        settlement_note = note_text
    WHERE id = exp_id;
  END IF;
  IF month_yr IS NOT NULL THEN
    UPDATE public.expenses
    SET settlement_status='settled', settled_at=now(), settled_amount=amount,
        settlement_note=COALESCE(note_text,'Monthly settlement '||month_yr)
    WHERE household_id=hh_id AND TO_CHAR(date,'YYYY-MM')=month_yr
      AND settlement_status != 'settled' AND COALESCE(archived,false)=false;
  END IF;
  INSERT INTO public.settlements (household_id,paid_by,received_by,amount,curr,settlement_date,note,exp_id)
  VALUES (hh_id,paid_by_uid,recv_by_uid,amt,curr,settle_date,note_text,exp_id);
  RETURN json_build_object('ok',true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('ok',false,'error',SQLERRM);
END;
$$;

-- archive_old_expenses RPC
CREATE OR REPLACE FUNCTION public.archive_old_expenses()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.expenses SET archived = true
  WHERE date < (CURRENT_DATE - interval '7 years') AND archived = false;
END;
$$;

-- ── Admin RPCs ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_plan(uid uuid, new_plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF new_plan = 'free' AND EXISTS (
    SELECT 1 FROM public.household_members WHERE user_id = uid AND permanent_premium = true
  ) THEN RAISE EXCEPTION 'Account has permanent premium'; END IF;
  UPDATE public.household_members SET plan = new_plan WHERE user_id = uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(uid uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.settlements WHERE paid_by = uid OR received_by = uid;
  DELETE FROM public.household_members WHERE user_id = uid;
  UPDATE public.expenses   SET created_by = null, paid_by_user_id = null WHERE created_by = uid;
  UPDATE public.expenses   SET paid_by_user_id = null WHERE paid_by_user_id = uid;
  UPDATE public.kids       SET created_by = null WHERE created_by = uid;
  UPDATE public.categories SET created_by = null WHERE created_by = uid;
  UPDATE public.invites    SET invited_by = null  WHERE invited_by = uid;
  DELETE FROM public.admins WHERE user_id = uid;
  DELETE FROM auth.users   WHERE id = uid;
  RETURN json_build_object('ok',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r json; BEGIN
  SELECT json_build_object(
    'total_users',        (SELECT COUNT(*) FROM auth.users),
    'total_households',   (SELECT COUNT(*) FROM public.households),
    'total_kids',         (SELECT COUNT(*) FROM public.kids),
    'total_expenses',     (SELECT COUNT(*) FROM public.expenses WHERE COALESCE(archived,false)=false),
    'total_spend',        (SELECT COALESCE(SUM(amount),0) FROM public.expenses WHERE COALESCE(archived,false)=false),
    'linked_households',  (SELECT COUNT(*) FROM public.households h WHERE (SELECT COUNT(*) FROM public.household_members WHERE household_id=h.id)>=2),
    'pending_invites',    (SELECT COUNT(*) FROM public.invites WHERE accepted=false AND expires_at>now()),
    'new_users_7d',       (SELECT COUNT(*) FROM auth.users WHERE created_at > now()-interval '7 days'),
    'new_expenses_7d',    (SELECT COUNT(*) FROM public.expenses WHERE created_at > now()-interval '7 days'),
    'expenses_by_day',    (
      SELECT json_agg(row_to_json(d)) FROM (
        SELECT DATE(created_at) AS day, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount
        FROM public.expenses WHERE created_at > now()-interval '30 days'
        GROUP BY DATE(created_at) ORDER BY day
      ) d
    )
  ) INTO r; RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r json; BEGIN
  SELECT json_agg(row_to_json(u)) INTO r FROM (
    SELECT
      au.id, au.email, au.created_at, au.last_sign_in_at, au.email_confirmed_at,
      hm.display_name, hm.color, hm.role, hm.household_id, h.name AS household_name,
      COALESCE(hm.plan,'free') AS plan, hm.plan_assigned_at,
      (SELECT COUNT(*) FROM public.expenses e WHERE e.household_id=hm.household_id AND e.created_by=au.id)::int AS expense_count,
      (SELECT COALESCE(SUM(amount),0) FROM public.expenses e WHERE e.household_id=hm.household_id AND e.created_by=au.id) AS total_spend
    FROM auth.users au
    LEFT JOIN public.household_members hm ON hm.user_id = au.id
    LEFT JOIN public.households h ON h.id = hm.household_id
    ORDER BY au.created_at DESC
  ) u; RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_households()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r json; BEGIN
  SELECT json_agg(row_to_json(h)) INTO r FROM (
    SELECT
      hh.id, hh.name, hh.created_at,
      (SELECT COUNT(*) FROM public.household_members WHERE household_id=hh.id)::int AS member_count,
      (SELECT COUNT(*) FROM public.kids WHERE household_id=hh.id)::int AS kid_count,
      (SELECT COUNT(*) FROM public.expenses WHERE household_id=hh.id AND COALESCE(archived,false)=false)::int AS expense_count,
      (SELECT COALESCE(SUM(amount),0) FROM public.expenses WHERE household_id=hh.id AND COALESCE(archived,false)=false) AS total_spend,
      (SELECT MAX(created_at) FROM public.expenses WHERE household_id=hh.id) AS last_expense_at,
      (SELECT json_agg(row_to_json(m)) FROM (
        SELECT user_id, display_name, color, role, joined_at FROM public.household_members WHERE household_id=hh.id
      ) m) AS members
    FROM public.households hh ORDER BY hh.created_at DESC
  ) h; RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_household_detail(hh_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r json; BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_build_object(
    'household', (SELECT row_to_json(h) FROM (SELECT id,name,created_at FROM public.households WHERE id=hh_id) h),
    'members',   (SELECT json_agg(row_to_json(m)) FROM (SELECT hm.user_id,hm.display_name,hm.color,hm.role,hm.joined_at,au.email FROM public.household_members hm JOIN auth.users au ON au.id=hm.user_id WHERE hm.household_id=hh_id) m),
    'kids',      (SELECT json_agg(row_to_json(k)) FROM (SELECT id,name,dob,color FROM public.kids WHERE household_id=hh_id ORDER BY name) k),
    'expenses',  (SELECT json_agg(row_to_json(e)) FROM (SELECT ex.id,ex.description,ex.amount,ex.currency,ex.date,k.name AS kid_name,c.name AS category_name,(SELECT email FROM auth.users WHERE id=ex.created_by) AS creator_email FROM public.expenses ex LEFT JOIN public.kids k ON k.id=ex.kid_id LEFT JOIN public.categories c ON c.id=ex.category_id WHERE ex.household_id=hh_id AND COALESCE(ex.archived,false)=false ORDER BY ex.created_at DESC LIMIT 50) e),
    'invites',   (SELECT json_agg(row_to_json(i)) FROM (SELECT id,invited_email,accepted,expires_at FROM public.invites WHERE household_id=hh_id ORDER BY created_at DESC) i)
  ) INTO r; RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_household(hh_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.settlements WHERE household_id = hh_id;
  DELETE FROM public.expenses    WHERE household_id = hh_id;
  DELETE FROM public.kids        WHERE household_id = hh_id;
  DELETE FROM public.categories  WHERE household_id = hh_id;
  DELETE FROM public.invites     WHERE household_id = hh_id;
  DELETE FROM public.split_rules WHERE household_id = hh_id;
  DELETE FROM public.audit_log   WHERE household_id = hh_id;
  DELETE FROM public.household_members WHERE household_id = hh_id;
  DELETE FROM public.households  WHERE id = hh_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_member(hh_id uuid, uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.household_members WHERE household_id=hh_id AND user_id=uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_kid(kid_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.kids WHERE id = kid_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_expense(expense_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.expenses WHERE id = expense_id;
END;
$$;

-- Free tier limit trigger
CREATE OR REPLACE FUNCTION public.check_expense_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_plan  text;
  exp_count  int;
BEGIN
  SELECT COALESCE(plan,'free') INTO user_plan FROM public.household_members
  WHERE user_id = auth.uid() AND household_id = NEW.household_id;
  IF user_plan = 'premium' THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO exp_count FROM public.expenses
  WHERE household_id = NEW.household_id AND COALESCE(archived,false) = false;
  IF exp_count >= 10 THEN
    RAISE EXCEPTION 'Free plan limit reached. Upgrade to Premium for unlimited expenses.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_expense_limit ON public.expenses;
CREATE TRIGGER enforce_expense_limit
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.check_expense_limit();

-- ══════════════════════════════════════════════════════════════════════
-- ADMIN SETUP
-- Set xfinititech@gmail.com as admin + permanent premium
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  admin_uid uuid := '4d58513a-6f17-4be4-a92d-ccbb62baf966';
BEGIN
  INSERT INTO public.admins (user_id, email)
  VALUES (admin_uid, 'xfinititech@gmail.com')
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.household_members
  SET plan = 'premium', permanent_premium = true
  WHERE user_id = admin_uid;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- BACKFILL: create households for any users who don't have one
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  u         record;
  new_hh_id uuid;
  dname     text;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = au.id)
  LOOP
    dname := COALESCE(
      NULLIF(TRIM(
        COALESCE(u.raw_user_meta_data->>'first_name','') || ' ' ||
        COALESCE(u.raw_user_meta_data->>'last_name','')
      ),''),
      SPLIT_PART(COALESCE(u.email,'user'),'@',1)
    );

    INSERT INTO public.households (name)
    VALUES (dname || '''s household')
    RETURNING id INTO new_hh_id;

    INSERT INTO public.household_members (household_id, user_id, display_name, color, role)
    VALUES (new_hh_id, u.id, dname, '#1a3a6b', 'parent');

    INSERT INTO public.categories (household_id, created_by, name, icon, color) VALUES
      (new_hh_id, u.id, 'Medical',    'heart',        '#dc2626'),
      (new_hh_id, u.id, 'School',     'academic-cap', '#1a3a6b'),
      (new_hh_id, u.id, 'Sports',     'trophy',       '#059669'),
      (new_hh_id, u.id, 'Excursions', 'map-pin',      '#4f46e5'),
      (new_hh_id, u.id, 'Clothing',   'shopping-bag', '#374151'),
      (new_hh_id, u.id, 'Food',       'cake',         '#d97706'),
      (new_hh_id, u.id, 'Other',      'tag',          '#374151');

    RAISE NOTICE 'Created household for: %', u.email;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════════════
SELECT
  (SELECT COUNT(*) FROM public.households)        AS households,
  (SELECT COUNT(*) FROM public.household_members) AS members,
  (SELECT COUNT(*) FROM public.categories)        AS categories,
  (SELECT COUNT(*) FROM public.admins)            AS admins,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') AS trigger_exists,
  (SELECT COUNT(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = u.id)) AS users_without_household;
