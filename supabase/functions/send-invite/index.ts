// Supabase Edge Function — send co-parent invite via Zoho SMTP
// Uses raw SMTP over TCP via Deno's net APIs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZOHO_HOST    = Deno.env.get('ZOHO_SMTP_HOST')    ?? 'smtp.zoho.com.au'
const ZOHO_PORT    = parseInt(Deno.env.get('ZOHO_SMTP_PORT') ?? '587')
const ZOHO_USER    = Deno.env.get('ZOHO_SMTP_USER')    ?? ''  // info@xfiniti.com.au
const ZOHO_PASS    = Deno.env.get('ZOHO_SMTP_PASS')    ?? ''
const FROM_NAME    = Deno.env.get('FROM_NAME')          ?? 'CoParent Pay'
const FROM_EMAIL   = Deno.env.get('ZOHO_SMTP_USER')    ?? 'info@xfiniti.com.au'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL              = Deno.env.get('APP_URL') ?? 'https://your-app.vercel.app'

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { invite_id, invite_code, to_email } = await req.json()
    if (!invite_id || !invite_code || !to_email) return json({ error: 'Missing fields' }, 400)

    // Verify invite belongs to caller
    const { data: inv } = await db.from('invites')
      .select('household_id, invited_by, invited_email, expires_at, accepted')
      .eq('id', invite_id).eq('invited_by', user.id).maybeSingle()

    if (!inv)         return json({ error: 'Invite not found' }, 404)
    if (inv.accepted) return json({ error: 'Already accepted' }, 400)

    // Get sender name
    const { data: member } = await db.from('household_members')
      .select('display_name').eq('user_id', user.id)
      .eq('household_id', inv.household_id).maybeSingle()

    const senderName  = member?.display_name ?? user.email?.split('@')[0] ?? 'Your co-parent'
    const inviteLink  = `${APP_URL}/invite/${invite_code}`
    const expiresDate = new Date(inv.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    const recipientDisplay = to_email.split('@')[0]

    const html = buildEmail(senderName, recipientDisplay, inviteLink, expiresDate)
    const subject = `${senderName} invited you to CoParent Pay`

    await sendViaSMTP({ to: to_email, subject, html })

    console.log(`Invite sent to ${to_email} from ${ZOHO_USER}`)
    return json({ ok: true })

  } catch (e: any) {
    console.error('send-invite error:', e)
    return json({ error: e.message ?? 'Internal error' }, 500)
  }
})

// ── SMTP sender using Deno fetch to a relay approach ─────────────
// Deno Deploy doesn't support raw TCP, so we use a fetch-based SMTP relay
// via the smtp2go or simply use the Supabase built-in SMTP helper
// Actually: use fetch to call an SMTP-over-HTTP approach

async function sendViaSMTP({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Encode credentials for AUTH PLAIN
  const authString = btoa(`\0${ZOHO_USER}\0${ZOHO_PASS}`)

  // Supabase Edge Functions run on Deno Deploy which supports fetch but NOT raw TCP sockets.
  // We use the smtp.js approach via a lightweight SMTP-over-HTTPS service,
  // OR we use the Supabase built-in email (supabase.auth.admin.generateLink won't work here).
  // Best approach for Zoho: use fetch to Zoho's API if available, otherwise use smtpjs CDN.
  
  // ── Option: call a self-hosted smtp-http bridge, or use nodemailer via fetch ──
  // Since Deno Deploy supports fetch to external HTTPS, we send via smtp.elasticemail.com 
  // style API. But we have Zoho credentials so we use Zoho's own mail send API:
  
  // Zoho Mail API (OAuth not available here, so we use SMTP relay via fetch to a proxy)
  // Most reliable: encode as multipart and POST to a tiny proxy function
  // 
  // SIMPLEST THAT ACTUALLY WORKS ON DENO DEPLOY: Use fetch to an SMTP-capable endpoint.
  // We'll use the "smtp4dev" pattern — but actually the cleanest is to call
  // Supabase's own SMTP (configured in project settings) via a trigger email,
  // OR use Zoho's REST API.
  
  // Zoho REST API for sending transactional email:
  // POST https://mail.zoho.com.au/api/accounts/{accountId}/messages
  // Requires OAuth — complex for edge functions.
  //
  // PRACTICAL SOLUTION: Use a lightweight SMTP-over-fetch library for Deno

  const smtpRes = await sendSmtpViaFetch({ to, subject, html })
  if (!smtpRes.ok) {
    throw new Error(`SMTP failed: ${smtpRes.error}`)
  }
}

// Uses smtp-client for Deno (works on Deno Deploy with TCP)
async function sendSmtpViaFetch({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    // Import smtp client for Deno — uses TLS/STARTTLS
    const { SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts')
    
    const client = new SmtpClient()
    await client.connectTLS({
      hostname: 'smtp.zoho.com.au',
      port:     465,
      username: ZOHO_USER,
      password: ZOHO_PASS,
    })

    await client.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      content: 'Please view this email in an HTML-capable client.',
      html,
    })

    await client.close()
    return { ok: true }
  } catch (e: any) {
    // Fallback: try port 587 with STARTTLS
    try {
      const { SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts')
      const client = new SmtpClient()
      await client.connect({
        hostname: 'smtp.zoho.com.au',
        port:     587,
        username: ZOHO_USER,
        password: ZOHO_PASS,
      })
      await client.send({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject,
        content: 'Please view this email in an HTML-capable client.',
        html,
      })
      await client.close()
      return { ok: true }
    } catch (e2: any) {
      return { ok: false, error: e2.message }
    }
  }
}

function buildEmail(senderName: string, recipientDisplay: string, inviteLink: string, expiresDate: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1a3a6b;padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
        CoParent<span style="color:#2ec4a0;"> Pay</span>
      </div>
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Shared Expenses. Shared Responsibility.</div>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Hi ${recipientDisplay},</p>
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">You've been invited!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
        <strong style="color:#0f172a;">${senderName}</strong> has invited you to join their household on CoParent Pay — a shared expense tracker that makes splitting children's costs simple and clear.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:12px;">What you can do together</div>
        ${['Track and split shared expenses', 'See who owes what instantly', 'Settle up in one tap', 'Get monthly statements'].map(item => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:20px;height:20px;border-radius:50%;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;line-height:20px;flex-shrink:0;">
            <span style="color:#059669;font-size:12px;font-weight:700;">✓</span>
          </div>
          <span style="font-size:14px;color:#374151;">${item}</span>
        </div>`).join('')}
      </div>
      <a href="${inviteLink}" style="display:block;background:#1a3a6b;color:#ffffff;text-decoration:none;text-align:center;padding:16px;border-radius:13px;font-weight:700;font-size:16px;">
        Accept invite →
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
        Or copy: <a href="${inviteLink}" style="color:#1a3a6b;word-break:break-all;">${inviteLink}</a>
      </p>
    </div>
    <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Sent by ${senderName} · expires ${expiresDate}<br>
        If you didn't expect this, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>`
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}
