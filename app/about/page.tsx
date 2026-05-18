'use client'
import React from 'react'
import Shell from '@/components/Shell'
import {
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  MapPinIcon,
  ReceiptPercentIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'

const FEATURES = [
  {
    icon: ReceiptPercentIcon,
    title: 'Expense tracking',
    desc: 'Log every shared expense with category, date, and receipt photo. Full auditable history for both parents.',
    photo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&q=80&fit=crop',
    alt: 'Receipt and expense documents',
  },
  {
    icon: CheckBadgeIcon,
    title: 'Settlement approval',
    desc: 'Both parents confirm every settlement. No disputes — the record is agreed, signed-off, and final.',
    photo: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&q=80&fit=crop',
    alt: 'Two people agreeing on a document',
  },
  {
    icon: ChartBarIcon,
    title: 'Analytics',
    desc: 'Spending by category, child, and month. Build custom charts to understand patterns in your shared expenses.',
    photo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&q=80&fit=crop',
    alt: 'Analytics charts on a screen',
  },
  {
    icon: DocumentTextIcon,
    title: 'Monthly statements',
    desc: 'Download PDF or CSV statements by month, year, or child. Suitable for legal proceedings and family court.',
    photo: 'https://images.unsplash.com/photo-1568234928966-359c35dd8327?w=200&q=80&fit=crop',
    alt: 'Professional documents and reports',
  },
  {
    icon: UsersIcon,
    title: 'Co-parent household',
    desc: 'Invite your co-parent to a shared household. Both see the same data in real time — no back-and-forth.',
    photo: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=200&q=80&fit=crop',
    alt: 'Two adults collaborating on a screen',
  },
  {
    icon: AdjustmentsHorizontalIcon,
    title: 'Smart split rules',
    desc: 'Set custom split percentages per category or per child. Rules apply automatically on every entry.',
    photo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&q=80&fit=crop',
    alt: 'Person adjusting financial settings',
  },
]

const TRIAL_ITEMS   = ['All features included', 'No credit card required', 'Full access for 7 days']
const PREMIUM_ITEMS = ['Unlimited shared expenses', 'Smart split rules (category + child)', 'Monthly statements — PDF and CSV', 'Receipt photo attachments', 'Analytics and custom charts', 'Priority support']

const S: React.CSSProperties = { fontFamily: 'system-ui,-apple-system,sans-serif' }
const DIV: React.CSSProperties = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '40px 0' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14 }
const PHOTO: React.CSSProperties = { borderRadius: 10, overflow: 'hidden', background: '#f3f4f6' }

export default function AboutPage() {
  return (
    <Shell>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px', ...S }}>

        {/* ── HERO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', paddingBottom: 40, borderBottom: '1px solid #e5e7eb', marginBottom: 40 }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#f0fdf4', color: '#059669', letterSpacing: '0.05em', marginBottom: 16 }}>
              Child expense management
            </span>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: '#111827', lineHeight: 1.25, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
              CoParent Pay — shared child expenses, made simple
            </h1>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, margin: '0 0 24px' }}>
              Whether you are a single parent or co-parenting after separation, CoParent Pay gives both parties a single, transparent view of every shared expense — with a settlement workflow both sides must agree on.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </div>
              <div style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.3.17.65.19.97.06l12.75-7.37-2.82-2.82-10.9 10.13zm-1.93-19.44A2 2 0 0 0 1 5.5v13c0 .47.17.9.44 1.23l.07.07 7.28-7.28v-.17L1.25 4.32zm17.09 5.44-2.52-1.46-3.14 3.14 3.14 3.14 2.55-1.47c.73-.42.73-1.5-.03-1.92l.03.03-.03-.42zM4.15.24L16.9 7.61l-2.82 2.82L4.15.76A1 1 0 0 0 3.18.24z"/></svg>
                Google Play
              </div>
            </div>
          </div>

          {/* Hero photo grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '170px 120px', gap: 8 }}>
            <div style={{ ...PHOTO, gridRow: '1/3', height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&q=80&fit=crop" alt="Parent and child smiling together" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
            <div style={{ ...PHOTO, height: 80 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80&fit=crop" alt="Family co-parenting warmly" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
            <div style={{ ...PHOTO, height: 80 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=300&q=80&fit=crop&crop=faces" alt="Parents cooperating calmly" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
          </div>
        </div>

        {/* ── WHO IT'S FOR ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', marginBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 220 }}>
            <div style={PHOTO}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=300&q=80&fit=crop" alt="Single parent with child at home" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
            <div style={PHOTO}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=300&q=80&fit=crop" alt="Two adults reviewing documents" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
          </div>
          <div>
            <span style={LBL}>Who it is for</span>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, marginBottom: 14 }}>
              CoParent Pay is designed for separated or divorced parents sharing the financial costs of raising children. It removes the friction and disputes that come with spreadsheets and text messages — creating an auditable, court-friendly record both parents can trust.
            </p>
            <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: 0 }}>
              Equally useful for single parents who need a structured record for budgeting, tax, or legal purposes.
            </p>
          </div>
        </div>

        <hr style={DIV} />

        {/* ── FEATURES ── */}
        <div style={{ marginBottom: 40 }}>
          <span style={LBL}>Features</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FEATURES.map(({ icon: Icon, title, desc, photo, alt }) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ ...PHOTO, width: 68, height: 68, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <Icon style={{ width: 15, height: 15, color: '#6b7280', flexShrink: 0 }}/>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</p>
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr style={DIV} />

        {/* ── PRICING ── */}
        <div style={{ marginBottom: 40 }}>
          <span style={LBL}>Pricing</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Trial */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: 140, overflow: 'hidden', background: '#f3f4f6' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=700&q=80&fit=crop" alt="Parent and child relaxed at home" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              </div>
              <div style={{ padding: '18px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Free Trial</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>$0</span>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>/ 7 days</span>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>No credit card required</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {TRIAL_ITEMS.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669', flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <XCircleIcon style={{ width: 13, height: 13, color: '#d1d5db', flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Expires after 7 days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium */}
            <div style={{ background: '#fff', border: '2px solid #2563eb', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: 140, overflow: 'hidden', background: '#f3f4f6', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=700&q=80&fit=crop" alt="Happy co-parenting family" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '3px 9px', background: '#eff6ff', color: '#2563eb', borderRadius: 99 }}>Recommended</span>
              </div>
              <div style={{ padding: '18px 20px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Premium</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>$7.00</span>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>AUD / month</span>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>Cancel anytime</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {PREMIUM_ITEMS.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669', flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        <hr style={DIV} />

        {/* ── BUILT BY ── */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2563eb', flexShrink: 0, letterSpacing: '-0.5px' }}>
            XT
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 5px' }}>Xfiniti Technologies Pty Ltd</p>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 10px' }}>
              CoParent Pay is a product of Xfiniti Technologies, an Australian company specialising in AI-powered consumer applications and cybersecurity. We build software that is secure by design, practical in daily use, and built to last.
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <EnvelopeIcon style={{ width: 13, height: 13, color: '#9ca3af' }}/>
                <a href="mailto:info@xfiniti.com.au" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>info@xfiniti.com.au</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPinIcon style={{ width: 13, height: 13, color: '#9ca3af' }}/>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Australia</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  )
}
