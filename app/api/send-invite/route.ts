import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { to_email, invite_code, sender_name, app_url } = await req.json()

    if (!to_email || !invite_code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const zohoUser = process.env.ZOHO_SMTP_USER
    const zohoPass = process.env.ZOHO_SMTP_PASS
    const fromName = process.env.FROM_NAME ?? 'CoParent Pay'
    const appUrl   = app_url ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

    if (!zohoUser || !zohoPass) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 500 })
    }

    const inviteLink = `${appUrl}/invite/${invite_code}`
    const senderDisplay = sender_name ?? 'Your co-parent'

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com.au',
      port: 465,
      secure: true,
      auth: { user: zohoUser, pass: zohoPass },
    })

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1a3a6b;padding:24px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;">CoParent<span style="color:#2ec4a0;"> Pay</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px;">Shared Expenses. Shared Responsibility.</div>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0f172a;">You've been invited!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
        <strong style="color:#0f172a;">${senderDisplay}</strong> has invited you to join CoParent Pay — 
        the simplest way to track and split your children's shared expenses.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:12px;">Together you can</div>
        ${['Track and split shared expenses', 'See who owes what instantly', 'Settle payments in one tap', 'Get monthly statements'].map(item => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:20px;height:20px;border-radius:50%;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;line-height:20px;font-size:11px;color:#059669;font-weight:700;flex-shrink:0;">✓</div>
          <span style="font-size:14px;color:#374151;">${item}</span>
        </div>`).join('')}
      </div>
      <a href="${inviteLink}" style="display:block;background:#1a3a6b;color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-weight:700;font-size:16px;">
        Accept invitation →
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
        Or copy this link:<br>
        <a href="${inviteLink}" style="color:#1a3a6b;word-break:break-all;">${inviteLink}</a>
      </p>
    </div>
    <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Sent by ${senderDisplay} · Link expires in 7 days.<br>
        If you weren't expecting this, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from:    `"${fromName}" <${zohoUser}>`,
      to:      to_email,
      subject: `${senderDisplay} invited you to CoParent Pay`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('send-invite error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send' }, { status: 500 })
  }
}
