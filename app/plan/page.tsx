'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface Usage {
  plan: 'free'|'premium'
  trial_active: boolean
  trial_days_left: number
  trial_expired: boolean
}

export default function PlanPage() {
  const [usage,   setUsage]   = useState<Usage|null>(null)
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.rpc('get_my_usage')
      if (data) setUsage(data as Usage)
      setLoading(false)
    })
  }, [])

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

  function requestUpgrade() {
    const subject = encodeURIComponent('CoParent Pay — Premium Upgrade Request')
    const body = encodeURIComponent(
      `Hi,\n\nI would like to upgrade my CoParent Pay account to Premium (AUD $7.00/month).\n\nMy account email: ${email}\n\nPlease activate Premium on my account.\n\nThank you`
    )
    window.open(`mailto:info@xfiniti.com.au?subject=${subject}&body=${body}`)
  }

  return (
    <Shell>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 16px 60px', fontFamily:'system-ui,sans-serif' }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#111827', margin:'0 0 4px' }}>Subscription Plan</h1>
          <p style={{ fontSize:14, color:'#6b7280', margin:0 }}>
            {isPremium ? 'Your Premium subscription is active.' : trialExpired ? 'Your trial has ended. Upgrade to continue.' : `Free trial — ${trialDays} day${trialDays!==1?'s':''} remaining.`}
          </p>
        </div>

        {trialActive && (
          <div style={{ background:'#f0fdf4', border:'1px solid #d1fae5', borderLeft:'3px solid #059669', borderRadius:4, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <ClockIcon style={{ width:16, height:16, color:'#059669', flexShrink:0 }}/>
            <div>
              <span style={{ fontSize:13, fontWeight:700, color:'#059669' }}>Free trial active — {trialDays} day{trialDays!==1?'s':''} remaining</span>
              <p style={{ fontSize:12, color:'#065f46', margin:'2px 0 0' }}>Full access to all features. No credit card required during trial.</p>
            </div>
          </div>
        )}

        {trialExpired && !isPremium && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderLeft:'3px solid #dc2626', borderRadius:4, padding:'12px 16px', marginBottom:20 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>Trial expired</span>
            <p style={{ fontSize:12, color:'#991b1b', margin:'2px 0 0' }}>Upgrade to Premium to continue tracking shared expenses.</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#9ca3af', fontSize:14 }}>Loading…</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>

            {/* Trial card */}
            <div style={{ background:'#fff', border:`1px solid ${trialActive?'#d1fae5':'#e5e7eb'}`, borderRadius:4, padding:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Free Trial</div>
                  <div style={{ fontSize:26, fontWeight:800, color:'#111827' }}>$0 <span style={{ fontSize:13, fontWeight:400, color:'#9ca3af' }}>/ 7 days</span></div>
                </div>
                {trialActive && <span style={{ padding:'2px 8px', background:'#f0fdf4', border:'1px solid #d1fae5', borderRadius:3, fontSize:11, fontWeight:700, color:'#059669' }}>Active</span>}
                {trialExpired && <span style={{ padding:'2px 8px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:3, fontSize:11, fontWeight:700, color:'#dc2626' }}>Expired</span>}
                {isPremium && <span style={{ padding:'2px 8px', background:'#f1f5f9', border:'1px solid #e5e7eb', borderRadius:3, fontSize:11, fontWeight:600, color:'#9ca3af' }}>Completed</span>}
              </div>
              {trialActive && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                    <div style={{ height:'100%', width:`${Math.max(((7-trialDays)/7)*100,4)}%`, background:trialDays<=2?'#dc2626':trialDays<=4?'#d97706':'#059669', borderRadius:2 }}/>
                  </div>
                  <div style={{ fontSize:11, color:'#6b7280' }}>{trialDays} of 7 days remaining</div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {['All Premium features included','No credit card required','Full access for 7 days'].map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:7 }}>
                    {trialActive
                      ? <CheckCircleIcon style={{ width:13, height:13, color:'#059669', flexShrink:0 }}/>
                      : <XCircleIcon style={{ width:13, height:13, color:'#d1d5db', flexShrink:0 }}/>
                    }
                    <span style={{ fontSize:12, color:trialActive?'#374151':'#9ca3af' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium card */}
            <div style={{ background:'#0f172a', border:'1px solid #0f172a', borderRadius:4, padding:'20px', position:'relative' }}>
              {isPremium && (
                <div style={{ position:'absolute', top:12, right:12, padding:'2px 8px', background:'#059669', borderRadius:3, fontSize:11, fontWeight:700, color:'#fff' }}>Active</div>
              )}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Premium</div>
                <div style={{ fontSize:26, fontWeight:800, color:'#fff' }}>$7.00 <span style={{ fontSize:13, fontWeight:400, color:'rgba(255,255,255,0.4)' }}>/ month</span></div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3 }}>Billed monthly · Cancel anytime</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:18 }}>
                {PREMIUM_FEATURES.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <CheckCircleIcon style={{ width:13, height:13, color:'#4ade80', flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.85)' }}>{f}</span>
                  </div>
                ))}
              </div>
              {!isPremium && (
                <button onClick={requestUpgrade}
                  style={{ width:'100%', padding:11, background:'#fff', color:'#0f172a', border:'none', borderRadius:3, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Upgrade to Premium
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:4, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>How to upgrade</div>
          <p style={{ fontSize:13, color:'#4b5563', lineHeight:1.7, margin:0 }}>
            Click "Upgrade to Premium" to send a request to our team at <strong>info@xfiniti.com.au</strong>. We will activate your account within a few hours. Questions? Email <a href="mailto:info@xfiniti.com.au" style={{ color:'#1d4ed8' }}>info@xfiniti.com.au</a>.
          </p>
        </div>

        <p style={{ fontSize:12, color:'#9ca3af' }}>
          By subscribing, you agree to our{' '}
          <a href="/privacy" style={{ color:'#6b7280', textDecoration:'underline' }}>Privacy Policy</a>.
          Subscriptions are managed via the App Store or Google Play. Pricing in AUD. Cancel anytime via your App Store account settings.
        </p>
      </div>
    </Shell>
  )
}
