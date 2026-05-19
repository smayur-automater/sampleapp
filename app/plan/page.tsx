
'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

// Format currency: commas, drop .00 if whole number, keep cents if present
function fmtAmt(n: number): string {
  const hasCents = (Math.round(n * 100) % 100) !== 0
  return hasCents
    ? n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}



interface Usage {
  plan: 'free'|'premium'
  trial_active: boolean
  trial_days_left: number
  trial_expired: boolean
}

export default function PlanPage() {
  const [usage,    setUsage]    = useState<Usage|null>(null)
  const [userId,   setUserId]   = useState('')
  const [email,    setEmail]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [cancelling,      setCancelling]      = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading,   setPortalLoading]   = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [toast,    setToast]    = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const upgrade = params.get('upgrade')
    if (upgrade === 'success')   showToast('Payment successful — Premium is now active!')
    if (upgrade === 'cancelled') showToast('Checkout cancelled — your plan was not changed')
  }, []) // eslint-disable-line

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id ?? '')
      setEmail(user.email ?? '')
      const { data } = await supabase.rpc('get_my_usage')
      if (data) setUsage(data as Usage)
      setLoading(false)
    })
  }, [])

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 4000) }

  async function startCheckout() {
    if (!userId || !email) return
    setCheckoutLoading(true)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: userId, email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast('Could not start checkout — ' + (data.error ?? 'please try again'))
      }
    } catch {
      showToast('Could not connect to payment system — please try again')
    }
    setCheckoutLoading(false)
  }

  async function openPortal() {
    if (!userId) return
    setPortalLoading(true)
    try {
      const res  = await fetch('/api/stripe/portal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast(data.error ?? 'Could not open billing portal')
      }
    } catch {
      showToast('Could not connect — please email info@xfiniti.com.au')
    }
    setPortalLoading(false)
  }

  async function requestCancellation() {
    if (!confirm('Send a cancellation request? Your Premium access will remain active until our team processes the request (within 24 hours).')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email.split('@')[0],
          email,
          subject: 'Premium Cancellation Request',
          message: `Please cancel the Premium subscription for account: ${email}. I understand my access will remain active until the end of the current billing period.`,
        }),
      })
      setCancelling(false)
      if (res.ok) { setCancelDone(true); showToast('Cancellation request sent — we will process it within 24 hours') }
      else showToast('Could not send request — please email info@xfiniti.com.au directly')
    } catch { setCancelling(false); showToast('Could not send request — please email info@xfiniti.com.au') }
  }

  const isPremium    = usage?.plan === 'premium'
  const trialDays    = usage?.trial_days_left ?? 7
  const trialExpired = usage?.trial_expired ?? false
  const trialActive  = !isPremium && !trialExpired

  const PREMIUM_FEATURES = [
    'Unlimited shared expenses',
    'Smart split rules by category and child',
    'Monthly statements and expense reports',
    'Receipt photo attachments',
    'Full analytics and charts',
    'CSV export',
    'Priority support',
  ]

  return (
    <Shell>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 60px', fontFamily: 'system-ui,sans-serif' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Subscription Plan</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            {isPremium ? 'Your Premium subscription is active.' : trialExpired ? 'Your trial has ended. Upgrade to continue.' : `Free trial — ${trialDays} day${trialDays!==1?'s':''} remaining.`}
          </p>
        </div>

        {trialActive && (
          <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderLeft: '3px solid #059669', borderRadius: 4, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClockIcon style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }}/>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Free trial active — {trialDays} day{trialDays!==1?'s':''} remaining</span>
              <p style={{ fontSize: 12, color: '#065f46', margin: '2px 0 0' }}>Full access to all features. No credit card required during trial.</p>
            </div>
          </div>
        )}

        {trialExpired && !isPremium && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: 4, padding: '12px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Trial expired</span>
            <p style={{ fontSize: 12, color: '#991b1b', margin: '2px 0 0' }}>Upgrade to Premium to continue tracking shared expenses.</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Trial card */}
            <div style={{ background: '#fff', border: `1px solid ${trialActive?'#d1fae5':'#e5e7eb'}`, borderRadius: 4, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 3 }}>Free Trial</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>$0 <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>/ 7 days</span></div>
                </div>
                {trialActive  && <span style={{ padding: '2px 8px', background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: 3, fontSize: 11, fontWeight: 700, color: '#059669' }}>Active</span>}
                {trialExpired && <span style={{ padding: '2px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 3, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Expired</span>}
                {isPremium    && <span style={{ padding: '2px 8px', background: '#f1f5f9', border: '1px solid #e5e7eb', borderRadius: 3, fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Completed</span>}
              </div>
              {trialActive && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${Math.max(((7-trialDays)/7)*100,4)}%`, background: trialDays<=2?'#dc2626':trialDays<=4?'#d97706':'#059669', borderRadius: 2 }}/>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{trialDays} of 7 days remaining</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['All Premium features included', 'No credit card required', 'Full access for 7 days'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {trialActive ? <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669', flexShrink: 0 }}/> : <XCircleIcon style={{ width: 13, height: 13, color: '#d1d5db', flexShrink: 0 }}/>}
                    <span style={{ fontSize: 12, color: trialActive?'#374151':'#9ca3af' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium card */}
            <div style={{ background: '#0f172a', border: '1px solid #0f172a', borderRadius: 4, padding: '20px', position: 'relative' }}>
              {isPremium && <div style={{ position: 'absolute', top: 12, right: 12, padding: '2px 8px', background: '#059669', borderRadius: 3, fontSize: 11, fontWeight: 700, color: '#fff' }}>Active</div>}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 3 }}>Premium</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>$7.00 <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>AUD / month</span></div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Cancel anytime</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                {PREMIUM_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircleIcon style={{ width: 13, height: 13, color: '#4ade80', flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{f}</span>
                  </div>
                ))}
              </div>
              {!isPremium && (
                <button onClick={startCheckout} disabled={checkoutLoading}
                  style={{ width: '100%', padding: 11, background: checkoutLoading?'#6b7280':'#fff', color: '#0f172a', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 700, cursor: checkoutLoading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {checkoutLoading ? 'Connecting to Stripe…' : 'Upgrade to Premium — $7.00/month'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Manage subscription — Premium users */}
        {isPremium && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Manage subscription</div>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65, margin: '0 0 12px' }}>
              View invoices, update your payment method, or cancel your subscription through the Stripe billing portal. Cancellation takes effect at the end of your current billing period.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={openPortal} disabled={portalLoading}
                style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: portalLoading?'not-allowed':'pointer' }}>
                {portalLoading ? 'Opening…' : 'Manage billing & invoices'}
              </button>
              <button onClick={requestCancellation} disabled={cancelling}
                style={{ padding: '9px 18px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: cancelling?'not-allowed':'pointer' }}>
                {cancelling ? 'Sending…' : 'Request cancellation by email'}
              </button>
            </div>
            {cancelDone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: 4, marginTop: 10 }}>
                <CheckCircleIcon style={{ width: 15, height: 15, color: '#059669', flexShrink: 0 }}/>
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>Cancellation request sent — we will process it within 24 hours.</span>
              </div>
            )}
          </div>
        )}

        {/* Stripe security note */}
        {!isPremium && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Payments are securely processed by <strong>Stripe</strong>. We never store your card details. Your subscription renews monthly — cancel anytime from the billing portal.
            </p>
          </div>
        )}

        <p style={{ fontSize: 12, color: '#9ca3af' }}>
          By subscribing you agree to our{" "}
          <a href="/privacy" style={{ color: '#6b7280', textDecoration: 'underline' }}>Privacy Policy</a>.
          Pricing in AUD.
        </p>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 3, fontSize: 13, fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </Shell>
  )
}
