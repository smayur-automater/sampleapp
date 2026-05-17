'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function PlanPage() {
  const [plan, setPlan] = useState<'free'|'premium'|null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) return
      setEmail(user.email??'')
      const {data} = await supabase.from('household_members').select('plan').eq('user_id', user.id).maybeSingle()
      setPlan((data?.plan as 'free'|'premium') ?? 'free')
    })
  }, [])

  const FREE_FEATURES = [
    { text: 'Up to 10 shared expenses',  ok: true  },
    { text: 'Basic expense tracking',    ok: true  },
    { text: 'Co-parent invitations',     ok: true  },
    { text: 'Kids and categories',       ok: true  },
    { text: 'Settlement workflow',       ok: true  },
    { text: 'Unlimited expenses',        ok: false },
    { text: 'Expense split rules',       ok: false },
    { text: 'Monthly statements',        ok: false },
    { text: 'Receipt attachments',       ok: false },
    { text: 'Analytics & charts',        ok: false },
    { text: 'CSV export',                ok: false },
  ]

  const PREMIUM_FEATURES = [
    { text: 'Everything in Free',                     ok: true },
    { text: 'Unlimited shared expenses',              ok: true },
    { text: 'Smart split rules by category & child',  ok: true },
    { text: 'Monthly statements & reports',           ok: true },
    { text: 'Receipt photo attachments',              ok: true },
    { text: 'Full analytics & charts',               ok: true },
    { text: 'CSV export',                            ok: true },
    { text: 'Priority support',                      ok: true },
  ]

  function requestUpgrade() {
    const subject = encodeURIComponent('CoParent Pay — Premium Upgrade Request')
    const body = encodeURIComponent(`Hi,\n\nI would like to upgrade my CoParent Pay account to Premium ($7/month).\n\nMy account email: ${email}\n\nPlease activate Premium on my account.\n\nThank you`)
    window.open(`mailto:info@xfiniti.com.au?subject=${subject}&body=${body}`)
  }

  return (
    <Shell>
      <div style={{maxWidth:640,margin:'0 auto',padding:'24px 16px 48px',fontFamily:'system-ui,sans-serif'}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:'0 0 6px'}}>Your Plan</h1>
        <p style={{fontSize:14,color:'#64748b',margin:'0 0 24px'}}>
          {plan==='premium' ? 'You are on Premium — all features unlocked.' : 'You are on the Free plan — upgrade to unlock all features.'}
        </p>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {/* FREE */}
          <div style={{background:'#fff',border:`2px solid ${plan==='free'?'#0f172a':'#e2e8f0'}`,borderRadius:16,padding:'20px',position:'relative'}}>
            {plan==='free'&&<div style={{position:'absolute',top:14,right:14,padding:'3px 10px',background:'#0f172a',color:'#fff',borderRadius:99,fontSize:11,fontWeight:700}}>Current</div>}
            <div style={{fontSize:16,fontWeight:800,color:'#374151',marginBottom:4}}>Free</div>
            <div style={{fontSize:28,fontWeight:800,color:'#0f172a',marginBottom:4}}>$0<span style={{fontSize:13,fontWeight:400,color:'#94a3b8'}}> / forever</span></div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:18}}>Get started at no cost</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {FREE_FEATURES.map(f=>(
                <div key={f.text} style={{display:'flex',alignItems:'center',gap:8}}>
                  {f.ok
                    ?<CheckCircleIcon style={{width:16,height:16,color:'#059669',flexShrink:0}}/>
                    :<XCircleIcon style={{width:16,height:16,color:'#d1d5db',flexShrink:0}}/>
                  }
                  <span style={{fontSize:13,color:f.ok?'#374151':'#94a3b8'}}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PREMIUM */}
          <div style={{background:'#1a3a6b',border:'2px solid #1a3a6b',borderRadius:16,padding:'20px',position:'relative',overflow:'hidden'}}>
            {plan==='premium'&&<div style={{position:'absolute',top:14,right:14,padding:'3px 10px',background:'#2ec4a0',color:'#fff',borderRadius:99,fontSize:11,fontWeight:700}}>Active</div>}
            <div style={{position:'absolute',top:14,right:plan==='premium'?70:14,padding:'3px 10px',background:'rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.9)',borderRadius:99,fontSize:11,fontWeight:700}}>⭐ Recommended</div>
            <div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.7)',marginBottom:4,marginTop:8}}>Premium</div>
            <div style={{fontSize:28,fontWeight:800,color:'#fff',marginBottom:4}}>$7<span style={{fontSize:13,fontWeight:400,color:'rgba(255,255,255,0.55)'}}> / month</span></div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginBottom:18}}>Unlock everything</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
              {PREMIUM_FEATURES.map(f=>(
                <div key={f.text} style={{display:'flex',alignItems:'center',gap:8}}>
                  <CheckCircleIcon style={{width:16,height:16,color:'#2ec4a0',flexShrink:0}}/>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.9)'}}>{f.text}</span>
                </div>
              ))}
            </div>
            {plan!=='premium'&&(
              <button onClick={requestUpgrade}
                style={{width:'100%',padding:'13px',background:'#2ec4a0',color:'#fff',border:'none',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                Upgrade to Premium →
              </button>
            )}
          </div>
        </div>

        {/* Info box */}
        <div style={{marginTop:20,padding:'16px 18px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,fontSize:13,color:'#92400e',lineHeight:1.7}}>
          <strong>How to upgrade:</strong> Click "Upgrade to Premium" above to send an email request to our team. We&apos;ll activate your Premium account within a few hours. You&apos;ll be charged $7/month via your preferred payment method.
          <br/>Questions? Email <a href="mailto:info@xfiniti.com.au" style={{color:'#92400e',fontWeight:700}}>info@xfiniti.com.au</a>
        </div>
      </div>
    </Shell>
  )
}
