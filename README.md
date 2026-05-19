# KidExpense

**Shared Expenses. Shared Responsibility.**

A production-ready co-parenting shared expense tracker built with Next.js 14, TypeScript, and Supabase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, React |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel |

---

## Features

### Free plan
- Track shared expenses for your children
- 50/50 or custom split per expense
- Kids management
- Category management
- Invite co-parent via link
- Receipt photo attachment
- **10 expense limit**

### Premium plan (admin-assigned)
- **Unlimited expenses**
- Smart split rules — auto-apply splits per category
- Monthly statements with full breakdown
- Export to CSV and PDF
- Activity audit trail (real-time)

### Settlement system
Every expense has one of three states:
- 🔴 **Outstanding** — not paid yet
- 🟡 **Partial** — some amount paid
- 🟢 **Settled** — fully paid

Settle individual expenses or bulk-settle an entire month in one tap.

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/kidexpense.git
cd kidexpense
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. In Supabase SQL Editor, run these files **in order**:
   - `supabase-schema.sql` — core tables
   - `supabase-receipt-migration.sql` — receipt storage
   - `supabase-admin-migration.sql` — admin panel RPCs
   - `supabase-premium-migration.sql` — plans, audit log, rules, statements
   - `supabase-settlement-migration.sql` — settlement states

3. Create a Storage bucket named `receipts` (public)

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase URL and anon key from:
**Supabase → Settings → API**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Fix Google OAuth branding

In Google Cloud Console → APIs & Services → OAuth consent screen:
- Set **App name** to `KidExpense`
- Add your Vercel domain to **Authorized domains**

---

## Admin Panel

Visit `/admin` — only accessible by users in the `admins` table.

### Add yourself as admin

Run this in Supabase SQL Editor (replace with your email):

```sql
INSERT INTO public.admins (user_id, email)
SELECT id, email FROM auth.users
WHERE email = 'your@email.com';
```

### Admin capabilities
- View all households, members, expenses
- Delete households or individual expenses
- Remove members
- Upgrade/downgrade users between Free and Premium
- Platform-wide stats dashboard

---

## Project Structure

```
kidexpense/
├── app/
│   ├── page.tsx              # Login
│   ├── layout.tsx            # Root layout + metadata
│   ├── dashboard/page.tsx    # Main dashboard (settlement-centric)
│   ├── kids/page.tsx         # Children management
│   ├── parents/page.tsx      # Household & co-parent management
│   ├── categories/page.tsx   # Expense categories
│   ├── rules/page.tsx        # Smart split rules (Premium)
│   ├── statements/page.tsx   # Monthly statements (Premium)
│   ├── admin/page.tsx        # Admin panel
│   ├── invite/[code]/        # Invite accept flow
│   └── auth/callback/        # OAuth callback
├── components/
│   ├── Shell.tsx             # App shell + nav
│   ├── AuditPanel.tsx        # Real-time activity sidebar
│   ├── CurrencySelect.tsx    # Currency picker
│   └── CategoryIcon.tsx      # Icon mapper
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── household.ts          # useHousehold() hook
│   └── audit.ts              # Audit logging utilities
├── public/
│   ├── logo.png              # App logo
│   ├── icon-192.png          # PWA icon
│   ├── icon-512.png          # PWA icon
│   └── apple-touch-icon.png  # iOS icon
└── supabase-*.sql            # Database migrations
```

---

## Database Migrations (run in order)

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Core tables: households, members, kids, categories, expenses, invites |
| `supabase-receipt-migration.sql` | Adds `receipt_url` column + storage bucket |
| `supabase-admin-migration.sql` | Admins table + all admin RPCs |
| `supabase-premium-migration.sql` | Plans, expense limit trigger, audit_log, split_rules, monthly_statements |
| `supabase-settlement-migration.sql` | Settlement fields on expenses + settlements table |

---

## License

MIT
