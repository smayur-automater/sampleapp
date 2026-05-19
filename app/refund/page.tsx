'use client'
import React from 'react'
import Shell from '@/components/Shell'

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>{title}</h2>
      {children}
    </div>
  )
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.8, marginBottom: 12 }}>{children}</p>
}
function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '0 0 14px' }}>
      {items.map((item, i) => <li key={i} style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.8, marginBottom: 4 }}>{item}</li>)}
    </ul>
  )
}

export default function RefundPolicy() {
  return (
    <Shell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Refund Policy</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 44 }}>Effective date: 18 May 2026 · Last updated: 18 May 2026</p>

        <S title="1. Overview">
          <P>This Refund Policy applies to all subscriptions and purchases made through KidExpense, operated by Xfiniti Technology Pty Ltd. By subscribing to our Premium plan, you agree to this policy.</P>
          <P>We offer a <strong>7-day free trial</strong> so you can evaluate all Premium features before committing to a paid subscription. No payment is required during the trial period.</P>
        </S>

        <S title="2. No refunds after 7-day trial">
          <P><strong>We do not offer refunds once your paid subscription has commenced</strong>, subject to the exceptions listed in Section 4.</P>
          <P>Because KidExpense provides a full 7-day free trial with unrestricted access to all features, we consider this a sufficient opportunity for users to assess whether the product meets their needs before making any payment.</P>
          <P>By starting a paid subscription after your trial, you acknowledge that:</P>
          <UL items={[
            'You have had 7 days of full access to evaluate the product',
            'You are satisfied that KidExpense meets your requirements',
            'You agree to the no-refund policy for the subscription period',
          ]}/>
        </S>

        <S title="3. Cancellation">
          <P>You may cancel your Premium subscription at any time. Cancellation is effective at the <strong>end of your current billing period</strong> — you will retain full Premium access until that date, and no further charges will be made after cancellation is processed.</P>
          <P>To cancel, email <a href="mailto:info@xfiniti.com.au" style={{ color: '#2563eb' }}>info@xfiniti.com.au</a> with subject "Premium Cancellation Request" or use the "Request cancellation" button in your account settings under Plan. We will process your request within 24 hours.</P>
          <P>Cancellation does not entitle you to a refund of any amounts already charged for the current billing period.</P>
        </S>

        <S title="4. Exceptions — when refunds may be granted">
          <P>We will consider a refund in the following limited circumstances:</P>
          <UL items={[
            'You were charged due to a technical error or billing system fault on our part',
            'You were charged after a confirmed cancellation request was received',
            'You experienced a complete service outage for more than 72 consecutive hours during your paid period',
            'Australian Consumer Law or other applicable legislation requires a refund',
          ]}/>
          <P>To request a refund under these circumstances, contact us at <a href="mailto:info@xfiniti.com.au" style={{ color: '#2563eb' }}>info@xfiniti.com.au</a> with your account email, the date of the charge, and a description of the issue. We will respond within 5 business days.</P>
        </S>

        <S title="5. Australian Consumer Law">
          <P>Nothing in this Refund Policy excludes, restricts, or modifies any rights you have under the Australian Consumer Law (Schedule 2 of the Competition and Consumer Act 2010 (Cth)) or any other applicable consumer protection legislation. Where the law provides for statutory guarantees, remedies, or refund rights, those rights apply in addition to this policy.</P>
        </S>

        <S title="6. App Store purchases">
          <P>If you subscribed via the Apple App Store or Google Play Store, refund requests for those purchases are subject to the respective platform's refund policies:</P>
          <UL items={[
            'Apple App Store: reportaproblem.apple.com',
            'Google Play Store: play.google.com/store/account/subscriptions',
          ]}/>
          <P>We are unable to process refunds for purchases made through third-party app stores — you must contact the relevant platform directly.</P>
        </S>

        <S title="7. Contact us">
          <P>If you have a question about this policy or wish to raise a billing concern, contact us at:</P>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '16px 20px', marginTop: 8 }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#111827' }}>Xfiniti Technology Pty Ltd (trading as KidExpense)</p>
            <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>Email: <a href="mailto:info@xfiniti.com.au" style={{ color: '#2563eb' }}>info@xfiniti.com.au</a> — we respond within 5 business days</p>
          </div>
        </S>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#9ca3af' }}>
          <p style={{ margin: 0 }}>KidExpense Refund Policy · Xfiniti Technology Pty Ltd · Effective 18 May 2026</p>
        </div>
      </div>
    </Shell>
  )
}
