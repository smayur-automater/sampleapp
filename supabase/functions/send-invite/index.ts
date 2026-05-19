// Supabase Edge Function: send-invite
// Sends a co-parent invite email using Zoho SMTP via the smtp Deno library
// Deploy: supabase functions deploy send-invite
// Secrets needed: ZOHO_SMTP_USER, ZOHO_SMTP_PASS, APP_URL, FROM_NAME

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ZOHO_USER            = Deno.env.get('ZOHO_SMTP_USER') ?? ''   // info@xfiniti.com.au
const ZOHO_PASS            = Deno.env.get('ZOHO_SMTP_PASS') ?? ''
const FROM_NAME            = Deno.env.get('FROM_NAME') ?? 'KidExpense'
const APP_URL              = Deno.env.get('APP_URL') ?? 'https://your-app.vercel.app'

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await db.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { invite_id, invite_code, to_email } = body
    if (!invite_id || !invite_code || !to_email) {
      return json({ error: 'Missing required fields: invite_id, invite_code, to_email' }, 400)
    }

    // Verify invite belongs to this user
    const { data: inv } = await db
      .from('invites')
      .select('household_id, invited_email, expires_at, accepted')
      .eq('id', invite_id)
      .eq('invited_by', user.id)
      .maybeSingle()

    if (!inv)         return json({ error: 'Invite not found or does not belong to you' }, 404)
    if (inv.accepted) return json({ error: 'This invite has already been accepted' }, 400)

    // Get sender display name
    const { data: member } = await db
      .from('household_members')
      .select('display_name')
      .eq('user_id', user.id)
      .eq('household_id', inv.household_id)
      .maybeSingle()

    const senderName  = member?.display_name ?? user.email?.split('@')[0] ?? 'Your co-parent'
    const inviteLink  = `${APP_URL}/invite/${invite_code}`
    const expiryDate  = new Date(inv.expires_at).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    // Build email HTML
    const html = buildEmail(senderName, to_email, inviteLink, expiryDate)
    const subject = `${senderName} invited you to KidExpense`

    // Send via Zoho SMTP using deno smtp library
    const smtpResult = await sendSmtp({ to: to_email, subject, html })
    if (!smtpResult.ok) {
      console.error('SMTP error:', smtpResult.error)
      return json({ error: smtpResult.error }, 500)
    }

    console.log(`✓ Invite email sent to ${to_email}`)
    return json({ ok: true })

  } catch (err: any) {
    console.error('send-invite exception:', err)
    return json({ error: err?.message ?? 'Internal error' }, 500)
  }
})

async function sendSmtp({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    // Try Zoho SSL (port 465) first
    const { SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts')
    const client = new SmtpClient()

    let connected = false
    try {
      await client.connectTLS({ hostname: 'smtp.zoho.com.au', port: 465, username: ZOHO_USER, password: ZOHO_PASS })
      connected = true
    } catch {
      // Try global Zoho server as fallback
      try {
        await client.connectTLS({ hostname: 'smtp.zoho.com', port: 465, username: ZOHO_USER, password: ZOHO_PASS })
        connected = true
      } catch {
        // Try STARTTLS port 587
        try {
          await client.connect({ hostname: 'smtp.zoho.com.au', port: 587, username: ZOHO_USER, password: ZOHO_PASS })
          connected = true
        } catch (e3) {
          return { ok: false, error: `Cannot connect to Zoho SMTP: ${e3}` }
        }
      }
    }

    if (!connected) return { ok: false, error: 'SMTP connection failed' }

    await client.send({
      from:    `${FROM_NAME} <${ZOHO_USER}>`,
      to,
      subject,
      content: 'This email requires an HTML-capable email client.',
      html,
    })

    await client.close()
    return { ok: true }

  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) }
  }
}

function buildEmail(sender: string, toEmail: string, link: string, expiry: string): string {
  const recipient = toEmail.split('@')[0]
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You've been invited to KidExpense</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:#1a3a6b;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              Kid<span style="color:#2ec4a0;">Expense</span>
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">
              Shared Expenses. Shared Responsibility.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;font-size:14px;color:#64748b;">Hi ${recipient},</p>
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;">
              You've been invited!
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
              <strong style="color:#0f172a;">${sender}</strong> has invited you to join their household on
              <strong style="color:#1a3a6b;">KidExpense</strong> — the simplest way to track and split
              your children's shared expenses.
            </p>

            <!-- Feature list -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
              <tr><td>
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;">Together you can</p>
                ${['Track and split shared expenses', 'Know exactly who owes what', 'Settle payments in one tap', 'Get monthly statements and reports'].map(item => `
                <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
                  <td style="width:22px;vertical-align:top;">
                    <span style="display:inline-block;width:18px;height:18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:50%;text-align:center;line-height:18px;font-size:11px;color:#059669;font-weight:700;">✓</span>
                  </td>
                  <td style="font-size:14px;color:#374151;padding-left:8px;line-height:1.5;">${item}</td>
                </tr></table>`).join('')}
              </td></tr>
            </table>

            <!-- CTA button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:#1a3a6b;border-radius:13px;">
                  <a href="${link}" style="display:block;padding:16px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">
                    Accept invite →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Link fallback -->
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
              Or copy this link into your browser:<br>
              <a href="${link}" style="color:#1a3a6b;word-break:break-all;font-size:11px;">${link}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              This invite was sent by <strong>${sender}</strong> and expires on ${expiry}.<br>
              If you weren't expecting this, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}
