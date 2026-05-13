// Supabase Edge Function — triggered by database webhook on expenses INSERT
// Sends an email notification to the OTHER parent in the household

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')  ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')     ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL         = Deno.env.get('APP_URL')          ?? 'https://your-app.vercel.app'

// Service-role client so we can read across RLS
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async (req) => {
  // Supabase webhook sends a POST with the new row as JSON
  const payload = await req.json()

  // The webhook body structure: { type, table, schema, record, old_record }
  const expense = payload.record
  if (!expense) return new Response('No record', { status: 200 })

  try {
    // 1. Get household members for this expense
    const { data: members } = await db
      .from('household_members')
      .select('user_id, display_name, color')
      .eq('household_id', expense.household_id)

    if (!members || members.length < 2) {
      return new Response('Single parent household — no notification needed', { status: 200 })
    }

    // 2. Find the creator and the OTHER parent
    const creator   = members.find((m: any) => m.user_id === expense.created_by)
    const recipient = members.find((m: any) => m.user_id !== expense.created_by)

    if (!recipient) return new Response('No recipient found', { status: 200 })

    // 3. Get recipient's email from auth.users (needs service role)
    const { data: userData } = await db.auth.admin.getUserById(recipient.user_id)
    const recipientEmail = userData?.user?.email
    if (!recipientEmail) return new Response('No email for recipient', { status: 200 })

    // 4. Get child name
    const { data: kid } = await db
      .from('kids')
      .select('name')
      .eq('id', expense.kid_id)
      .single()

    // 5. Get category name
    const { data: cat } = await db
      .from('categories')
      .select('name')
      .eq('id', expense.category_id)
      .single()

    // 6. Build the email
    const currency = expense.currency ?? 'AUD'
    const amount   = Number(expense.amount).toFixed(2)
    const date     = new Date(expense.date).toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const myShare  = (Number(expense.amount) * (100 - expense.split_pct) / 100).toFixed(2)
    const creatorName  = creator?.display_name  ?? 'Your co-parent'
    const recipientName = recipient?.display_name ?? 'there'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

    <!-- Header -->
    <div style="background:#2563eb;padding:24px 28px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:800;font-size:14px;">CP</span>
        </div>
        <span style="color:#fff;font-size:18px;font-weight:700;">CoParent</span>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="margin:0 0 6px;font-size:14px;color:#64748b;">Hi ${recipientName},</p>
      <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">New expense added</h2>

      <!-- Expense card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#0f172a;">${expense.description}</div>
            <div style="font-size:13px;color:#64748b;margin-top:3px;">${kid?.name ?? ''} · ${cat?.name ?? ''}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:800;color:#0f172a;">${currency} ${amount}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${date}</div>
          </div>
        </div>

        <div style="border-top:1px solid #e2e8f0;padding-top:14px;display:flex;gap:16px;">
          <div style="flex:1;text-align:center;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Added by</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;">${creatorName}</div>
          </div>
          <div style="width:1px;background:#e2e8f0;"></div>
          <div style="flex:1;text-align:center;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Your share</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${currency} ${myShare}</div>
          </div>
          <div style="width:1px;background:#e2e8f0;"></div>
          <div style="flex:1;text-align:center;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:3px;">Split</div>
            <div style="font-size:14px;font-weight:600;color:#0f172a;">${expense.split_pct}/${100-expense.split_pct}</div>
          </div>
        </div>
      </div>

      <a href="${APP_URL}/dashboard" style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:13px;border-radius:10px;font-weight:600;font-size:14px;">View in CoParent →</a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">You're receiving this because you share a household on CoParent.<br>Manage notifications in app settings.</p>
    </div>
  </div>
</body>
</html>`

    // 7. Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'CoParent <notifications@your-domain.com>',  // update with your domain
        to:      [recipientEmail],
        subject: `${creatorName} added an expense: ${expense.description} (${currency} ${amount})`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response('Email send failed: ' + err, { status: 500 })
    }

    console.log(`Notified ${recipientEmail} about expense: ${expense.description}`)
    return new Response('OK', { status: 200 })

  } catch (e) {
    console.error('Edge function error:', e)
    return new Response('Internal error', { status: 500 })
  }
})
