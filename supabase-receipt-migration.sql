-- ════════════════════════════════════════════════════════════════
-- CoParent — Add receipt_url to expenses + Storage bucket policy
-- Run this in Supabase SQL Editor (safe to run on existing data)
-- ════════════════════════════════════════════════════════════════

-- 1. Add receipt_url column to existing expenses table
alter table public.expenses
  add column if not exists receipt_url text;

-- 2. Create the receipts storage bucket (public read, authenticated write)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 3. Storage RLS policies
-- Members of the same household can view receipts
create policy "household members can view receipts"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and auth.uid() is not null
  and exists (
    select 1 from public.household_members hm1
    join public.household_members hm2 on hm1.household_id = hm2.household_id
    where hm1.user_id = auth.uid()
    -- path is: receipts/{household_id}/{expense_id}/{filename}
    and (storage.objects.name like hm1.household_id::text || '/%')
  )
);

-- Only authenticated users can upload
create policy "authenticated users can upload receipts"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and auth.uid() is not null
);

-- Only the uploader can delete their receipt
create policy "uploader can delete receipts"
on storage.objects for delete
using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[3]
);
