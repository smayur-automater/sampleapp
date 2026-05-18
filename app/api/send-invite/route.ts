import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { to_email, invite_code, sender_name, app_url } = await req.json()

    if (!to_email || !invite_code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const apiKey  = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'CoParent Pay <onboarding@resend.dev>'
    const appUrl  = app_url ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    if (!apiKey) {
      return NextResponse.json({
        error: 'RESEND_API_KEY not set — add it to Vercel environment variables'
      }, { status: 500 })
    }

    const resend      = new Resend(apiKey)
    const inviteLink  = `${appUrl}/invite/${invite_code}`
    const senderName  = sender_name ?? 'Your co-parent'

    const { error } = await resend.emails.send({
      from:    fromEmail,
      to:      to_email,
      subject: `${senderName} invited you to CoParent Pay`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1a3a6b;padding:24px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;">CoParent<span style="color:#2ec4a0;"> Pay</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;">Shared Expenses. Shared Responsibility.</div>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">You have been invited!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
        <strong style="color:#0f172a;">${senderName}</strong> has invited you to join CoParent Pay —
        the simplest way to track and split your children's shared expenses.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:12px;">Together you can</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div style="width:20px;height:20px;border-radius:50%;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:700;flex-shrink:0;">✓</div><span style="font-size:14px;color:#374151;">Track and split shared expenses</span></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div style="width:20px;height:20px;border-radius:50%;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:700;flex-shrink:0;">✓</div><span style="font-size:14px;color:#374151;">See who owes what instantly</span></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div style="width:20px;height:20px;border-radius:50%;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:700;flex-shrink:0;">✓</div><span style="font-size:14px;color:#374151;">Settle payments in one tap</span></div>
        <div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;border-radius:50%;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:700;flex-shrink:0;">✓</div><span style="font-size:14px;color:#374151;">Get monthly statements</span></div>
      </div>
      <a href="${inviteLink}" style="display:block;background:#1a3a6b;color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-weight:700;font-size:16px;">Accept invitation →</a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
        Or copy: <a href="${inviteLink}" style="color:#1a3a6b;word-break:break-all;">${inviteLink}</a>
      </p>
    </div>
    <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by ${senderName} · Link expires in 7 days.<br>If you were not expecting this, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('send-invite error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Failed to send' }, { status: 500 })
  }
}
