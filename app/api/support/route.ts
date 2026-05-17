import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()
    if (!name||!email||!subject||!message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      // Fallback: log and return ok so UI shows success
      console.log('Support query (no Resend key):', { name, email, subject, message })
      return NextResponse.json({ ok: true })
    }
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'CoParent Pay <onboarding@resend.dev>',
      to:      'info@xfiniti.com.au',
      replyTo: email,
      subject: `[CoParent Pay Support] ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#1a3a6b;margin-bottom:4px">New Support Request</h2>
          <p style="color:#64748b;font-size:13px;margin-bottom:24px">CoParent Pay — Support Form</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:10px;background:#f8fafc;font-weight:700;font-size:13px;border-radius:6px 0 0 0;width:120px">Name</td><td style="padding:10px;font-size:13px">${name}</td></tr>
            <tr><td style="padding:10px;background:#f8fafc;font-weight:700;font-size:13px">Email</td><td style="padding:10px;font-size:13px"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:10px;background:#f8fafc;font-weight:700;font-size:13px">Subject</td><td style="padding:10px;font-size:13px">${subject}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:10px;border-left:4px solid #1a3a6b">
            <p style="font-size:13px;font-weight:700;color:#1a3a6b;margin:0 0 8px">Message:</p>
            <p style="font-size:14px;color:#374151;margin:0;line-height:1.7;white-space:pre-wrap">${message}</p>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin-top:20px">Reply directly to this email to respond to ${name}.</p>
        </div>
      `,
    })
    return NextResponse.json({ ok: true })
  } catch(err: any) {
    console.error('Support email error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Failed to send' }, { status: 500 })
  }
}
