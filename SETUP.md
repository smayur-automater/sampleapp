# CoParent Pay — Setup Guide

## 1. Database (Supabase)
Run `COMPLETE-DATABASE-SETUP.sql` in Supabase → SQL Editor.
This is safe to run on any database state (empty or existing).

## 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase credentials.

## 3. Deploy
Push to GitHub. Connect to Vercel. Add the two env vars in Vercel Dashboard.

## 4. Admin Access
After running the SQL, sign in at `/admin-login` with `xfinititech@gmail.com`.

## 5. Invite Emails
Deploy the edge function for automatic invite emails:
  supabase functions deploy send-invite
  supabase secrets set ZOHO_SMTP_USER=info@xfiniti.com.au
  supabase secrets set ZOHO_SMTP_PASS=YOUR_APP_PASSWORD
  supabase secrets set APP_URL=https://your-app.vercel.app
  supabase secrets set FROM_NAME="CoParent Pay"

Until deployed, the invite link can be copied and shared manually.
