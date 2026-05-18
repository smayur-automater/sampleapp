'use client'
import React from 'react'
import Shell from '@/components/Shell'
import {
  ReceiptPercentIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MapPinIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

const FEATURES = [
  {
    icon: ReceiptPercentIcon,
    title: 'Expense tracking',
    desc: 'Log every shared expense with description, amount, category, date, and who paid. Attach receipt photos for a complete record.',
  },
  {
    icon: UsersIcon,
    title: 'Co-parent household',
    desc: 'Invite your co-parent to a shared household. Both parties see the same data in real time — no back-and-forth messages.',
  },
  {
    icon: AdjustmentsHorizontalIcon,
    title: 'Flexible split rules',
    desc: 'Set custom split percentages per category or per child. Rules auto-apply when you add expenses, saving time on every entry.',
  },
  {
    icon: CheckCircleIcon,
    title: 'Settlement approval',
    desc: 'When one parent records a settlement, the other must approve it. Both parties confirm — keeping the record honest and agreed.',
  },
  {
    icon: ChartBarIcon,
    title: 'Analytics',
    desc: 'See spending by category, by child, and by month. Build custom charts to understand patterns in your shared expenses.',
  },
  {
    icon: DocumentTextIcon,
    title: 'Monthly statements',
    desc: 'Download PDF or CSV statements by month, year, or per child. Suitable for legal proceedings, family court, or tax records.',
  },
]

const TRIAL_ITEMS  = ['All features during trial', 'Co-parent invitation', 'Expense tracking and settlement']
const PREMIUM_ITEMS = ['Unlimited shared expenses', 'Smart split rules (category + child)', 'Monthly statements — PDF and CSV', 'Receipt photo attachments', 'Analytics and custom charts', 'Priority support']

const S: React.CSSProperties = { fontFamily: 'system-ui,-apple-system,sans-serif' }
const DIVIDER: React.CSSProperties = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '32px 0' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14 }

export default function AboutPage() {
  return (
    <Shell>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 64px', ...S }}>

        {/* Hero */}
        <div style={{ paddingBottom: 32, borderBottom: '1px solid #e5e7eb', marginBottom: 32 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#f0fdf4', color: '#059669', letterSpacing: '0.05em', marginBottom: 16 }}>
            Child expense management
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1.3, margin: '0 0 16px', letterSpacing: '-0.4px' }}>
            CoParent Pay — track and split<br />shared child expenses simply
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, margin: 0 }}>
            Whether you are a single parent managing household costs, or co-parents sharing financial responsibility for your children, CoParent Pay gives both parties a single, transparent view of every expense — from medical bills to school fees — with a clear settlement workflow that both sides must agree on.
          </p>
        </div>

        {/* Who it's for */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>Who it is for</span>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 14px' }}>
            CoParent Pay is designed for separated or divorced parents who share the financial costs of raising children. It removes the friction, confusion, and disputes that come from tracking shared expenses in spreadsheets or text messages. Every expense is recorded, categorised, and attributed — creating an auditable, court-friendly record that both parents can trust.
          </p>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: 0 }}>
            It is equally useful for single parents who want a structured record of all child-related spending for budgeting, tax, or legal purposes.
          </p>
        </div>

        <hr style={DIVIDER} />

        {/* Features */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>Features</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
                <Icon style={{ width: 18, height: 18, color: '#6b7280', marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 5px' }}>{title}</p>
                <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <hr style={DIVIDER} />

        {/* Pricing */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>Pricing</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Free trial */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Free trial</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 3px', letterSpacing: '-0.5px' }}>$0</p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>7 days, full access — no credit card required</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {TRIAL_ITEMS.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <XCircleIcon style={{ width: 13, height: 13, color: '#d1d5db', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>Expires after 7 days</span>
                </div>
              </div>
            </div>

            {/* Premium */}
            <div style={{ background: '#fff', border: '2px solid #2563eb', borderRadius: 8, padding: '20px', position: 'relative' }}>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 99, letterSpacing: '0.05em', marginBottom: 10 }}>
                Premium
              </span>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>Monthly subscription</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 3 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>$7.00</span>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>AUD / month</span>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 16px' }}>Cancel anytime via App Store or Google Play</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {PREMIUM_ITEMS.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr style={DIVIDER} />

        {/* Built by */}
        <div>
          <span style={LBL}>Built by</span>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2563eb', flexShrink: 0, letterSpacing: '-0.5px' }}>
              XT
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 5px' }}>Xfiniti Technologies Pty Ltd</p>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 10px' }}>
                CoParent Pay is a product of Xfiniti Technologies, an Australian technology company specialising in AI-powered consumer applications and cybersecurity. We build software that is secure by design, practical in daily use, and built to last.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <EnvelopeIcon style={{ width: 13, height: 13, color: '#9ca3af' }} />
                  <a href="mailto:info@xfiniti.com.au" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>info@xfiniti.com.au</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPinIcon style={{ width: 13, height: 13, color: '#9ca3af' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Australia</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  )
}
