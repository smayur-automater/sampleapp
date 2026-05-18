'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isConfigured } from '@/lib/supabase'

type View = 'signin' | 'signup' | 'otp' | 'forgot' | 'forgot_sent'

const COUNTRIES = [
  {dial:'+61',flag:'🇦🇺',name:'Australia'},{dial:'+1',flag:'🇺🇸',name:'United States'},
  {dial:'+44',flag:'🇬🇧',name:'United Kingdom'},{dial:'+64',flag:'🇳🇿',name:'New Zealand'},
  {dial:'+1',flag:'🇨🇦',name:'Canada'},{dial:'+91',flag:'🇮🇳',name:'India'},
  {dial:'+65',flag:'🇸🇬',name:'Singapore'},{dial:'+971',flag:'🇦🇪',name:'UAE'},
  {dial:'+966',flag:'🇸🇦',name:'Saudi Arabia'},{dial:'+27',flag:'🇿🇦',name:'South Africa'},
  {dial:'+63',flag:'🇵🇭',name:'Philippines'},{dial:'+60',flag:'🇲🇾',name:'Malaysia'},
  {dial:'+234',flag:'🇳🇬',name:'Nigeria'},{dial:'+254',flag:'🇰🇪',name:'Kenya'},
  {dial:'+92',flag:'🇵🇰',name:'Pakistan'},{dial:'+880',flag:'🇧🇩',name:'Bangladesh'},
  {dial:'+94',flag:'🇱🇰',name:'Sri Lanka'},{dial:'+49',flag:'🇩🇪',name:'Germany'},
  {dial:'+33',flag:'🇫🇷',name:'France'},{dial:'+39',flag:'🇮🇹',name:'Italy'},
  {dial:'+34',flag:'🇪🇸',name:'Spain'},{dial:'+81',flag:'🇯🇵',name:'Japan'},
  {dial:'+86',flag:'🇨🇳',name:'China'},{dial:'+82',flag:'🇰🇷',name:'South Korea'},
  {dial:'+55',flag:'🇧🇷',name:'Brazil'},{dial:'+52',flag:'🇲🇽',name:'Mexico'},
  {dial:'+20',flag:'🇪🇬',name:'Egypt'},{dial:'+90',flag:'🇹🇷',name:'Turkey'},
  {dial:'+353',flag:'🇮🇪',name:'Ireland'},{dial:'+41',flag:'🇨🇭',name:'Switzerland'},
  {dial:'+31',flag:'🇳🇱',name:'Netherlands'},{dial:'+46',flag:'🇸🇪',name:'Sweden'},
  {dial:'+47',flag:'🇳🇴',name:'Norway'},{dial:'+45',flag:'🇩🇰',name:'Denmark'},
]

const inp: React.CSSProperties = {width:'100%',padding:'12px 14px',border:'1.5px solid #e2e8f0',borderRadius:11,fontSize:15,color:'#0f172a',background:'#f8fafc',outline:'none',boxSizing:'border-box'}
const lbl: React.CSSProperties = {display:'block',fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6,letterSpacing:'0.07em',textTransform:'uppercase'}
const btn: React.CSSProperties = {width:'100%',padding:14,background:'#0f172a',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer'}

export default function Page() {
  const router  = useRouter()
  const [view,      setView]      = useState<View>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [dialCode,  setDialCode]  = useState('+61')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [pw,        setPw]        = useState('')
  const [pw2,       setPw2]       = useState('')
  const [otp,       setOtp]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState('')
  const [ok,        setOk]        = useState('')

  const E = (t:string) => { setErr(t); setOk('') }
  const O = (t:string) => { setOk(t);  setErr('') }
  const off: React.CSSProperties = {opacity:0.55,cursor:'not-allowed'}

  function redirect() {
    const inv = typeof window!=='undefined' ? localStorage.getItem('pendingInvite') : null
    if (inv) {
      // Keep the code in localStorage — the invite page will read it
      // Don't remove it here; remove it only after successful join
      router.replace(`/invite/${inv}`)
    } else {
      router.replace('/dashboard')
    }
  }

  async function signIn() {
    if (!email.trim()||!pw) { E('Enter email and password'); return }
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setLoading(false)
    if (error) { E('Incorrect email or password'); return }
    redirect()
  }

  async function signUp() {
    if (!firstName.trim()) { E('Enter your first name'); return }
    if (!lastName.trim())  { E('Enter your last name'); return }
    if (!phone.trim())     { E('Enter your phone number'); return }
    if (!email.trim()||!email.includes('@')) { E('Enter a valid email address'); return }
    if (!pw||pw.length<6) { E('Password must be at least 6 characters'); return }
    if (pw!==pw2)          { E('Passwords do not match'); return }
    setLoading(true); setErr('')

    const { data, error: e1 } = await supabase.auth.signUp({
      email: email.trim(), password: pw,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), phone: dialCode+' '+phone.trim() } }
    })
    if (e1) {
      setLoading(false)
      E(e1.message.toLowerCase().includes('already') ? 'Email already registered — try signing in' : e1.message)
      return
    }
    if (data.session) { setLoading(false); redirect(); return }

    // Email confirmation required — try to send OTP
    const { error: e2 } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    setLoading(false)
    if (e2 && e2.message.toLowerCase().includes('security')) {
      // Rate limited — account was created, OTP will come via confirmation email
      setView('otp'); O('Check your email for a verification code')
    } else if (e2) {
      E('Account created — please check your email to verify, then sign in')
    } else {
      setView('otp'); O('Verification code sent to '+email.trim())
    }
  }

  async function verifyOtp() {
    if (otp.length<6) { E('Enter the 6-digit code'); return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: 'email' })
    setLoading(false)
    if (error) { E('Invalid or expired code — try requesting a new one'); return }
    redirect()
  }

  async function resendOtp() {
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    setLoading(false)
    if (error) E(error.message); else O('New code sent')
  }

  async function forgotPw() {
    if (!email.trim()) { E('Enter your email address'); return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin+'/auth/callback' })
    setLoading(false)
    if (error) { E(error.message); return }
    setView('forgot_sent')
  }

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <div style={{width:'100%',maxWidth:420}}>
        {!isConfigured&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'11px 14px',marginBottom:14,fontSize:13,color:'#dc2626',textAlign:'center'}}>⚠️ Missing Supabase environment variables</div>}
        <div style={{textAlign:'center',marginBottom:24}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CoParent Pay" style={{width:76,height:76,objectFit:'contain',margin:'0 auto 10px',display:'block'}}/>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:'-0.5px'}}>
            <span style={{color:'#1a3a6b'}}>CoParent</span><span style={{color:'#2ec4a0'}}> Pay</span>
          </div>
          <div style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Shared Expenses. Shared Responsibility.</div>
        </div>

        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'28px 28px 24px',boxShadow:'0 1px 6px rgba(0,0,0,0.06)'}}>

          {/* SIGN IN */}
          {view==='signin'&&<>
            <div style={{fontSize:20,fontWeight:800,color:'#0f172a',marginBottom:20}}>Sign in</div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Email address</label>
              <input type="email" value={email} autoFocus onChange={e=>{setEmail(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&signIn()} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:4}}>
              <label style={lbl}>Password</label>
              <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&signIn()} placeholder="••••••••" style={inp}/>
            </div>
            <div style={{textAlign:'right',marginBottom:16}}>
              <button onClick={()=>{setView('forgot');setErr('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#1a3a6b',fontSize:13,padding:0}}>Forgot password?</button>
            </div>
            {err&&<Alert type="error">{err}</Alert>}
            <button onClick={signIn} disabled={loading} style={{...btn,...(loading?off:{})}}>{loading?'Signing in…':'Sign in'}</button>
            <p style={{textAlign:'center',marginTop:16,fontSize:13,color:'#64748b'}}>
              No account? <button onClick={()=>{setView('signup');setErr('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#1a3a6b',fontWeight:700,fontSize:13}}>Create one</button>
            </p>
          </>}

          {/* SIGN UP */}
          {view==='signup'&&<>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
              <button onClick={()=>{setView('signin');setErr('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#1a3a6b',fontSize:22,lineHeight:1,padding:0}}>←</button>
              <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Create account</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div><label style={lbl}>First name</label><input value={firstName} autoFocus onChange={e=>{setFirstName(e.target.value);setErr('')}} placeholder="Sarah" style={inp}/></div>
              <div><label style={lbl}>Last name</label><input value={lastName} onChange={e=>{setLastName(e.target.value);setErr('')}} placeholder="Smith" style={inp}/></div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Phone number</label>
              <PhoneField dialCode={dialCode} onDial={setDialCode} value={phone} onChange={v=>{setPhone(v);setErr('')}} baseInp={inp}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Email address</label>
              <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr('')}} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Password</label>
              <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr('')}} placeholder="At least 6 characters" style={inp}/>
            </div>
            <div style={{marginBottom:18}}>
              <label style={lbl}>Confirm password</label>
              <input type="password" value={pw2} onChange={e=>{setPw2(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&signUp()} placeholder="Re-enter password" style={inp}/>
            </div>
            {err&&<Alert type="error">{err}</Alert>}
            <button onClick={signUp} disabled={loading} style={{...btn,...(loading?off:{})}}>{loading?'Creating account…':'Create account →'}</button>
            <p style={{textAlign:'center',marginTop:12,fontSize:12,color:'#94a3b8',lineHeight:1.6}}>A verification code will be emailed to confirm your account.</p>
          </>}

          {/* OTP */}
          {view==='otp'&&<>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <button onClick={()=>{setView('signup');setErr('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#1a3a6b',fontSize:22,lineHeight:1,padding:0}}>←</button>
              <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Check your email</div>
            </div>
            <p style={{fontSize:14,color:'#64748b',marginBottom:18,lineHeight:1.65}}>Enter the 6-digit code sent to <strong style={{color:'#0f172a'}}>{email}</strong></p>
            {ok&&<Alert type="ok">{ok}</Alert>}
            {err&&<Alert type="error">{err}</Alert>}
            <div style={{marginBottom:16}}>
              <label style={lbl}>6-digit code</label>
              <input value={otp} autoFocus maxLength={6} onChange={e=>{setOtp(e.target.value.replace(/\D/g,'').slice(0,6));setErr('')}} onKeyDown={e=>e.key==='Enter'&&verifyOtp()} placeholder="000000" style={{...inp,fontSize:30,letterSpacing:14,textAlign:'center',fontFamily:'monospace',fontWeight:700}}/>
            </div>
            <button onClick={verifyOtp} disabled={loading||otp.length<6} style={{...btn,...(loading||otp.length<6?off:{})}}>{loading?'Verifying…':'Verify & sign in'}</button>
            <div style={{textAlign:'center',marginTop:14}}><button onClick={resendOtp} style={{background:'none',border:'none',cursor:'pointer',color:'#1a3a6b',fontSize:13}}>Resend code</button></div>
          </>}

          {/* FORGOT */}
          {view==='forgot'&&<>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <button onClick={()=>{setView('signin');setErr('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#1a3a6b',fontSize:22,lineHeight:1,padding:0}}>←</button>
              <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Reset password</div>
            </div>
            <p style={{fontSize:14,color:'#64748b',marginBottom:18,lineHeight:1.65}}>Enter your email and we&apos;ll send a reset link.</p>
            <div style={{marginBottom:18}}>
              <label style={lbl}>Email address</label>
              <input type="email" value={email} autoFocus onChange={e=>{setEmail(e.target.value);setErr('')}} onKeyDown={e=>e.key==='Enter'&&forgotPw()} placeholder="you@example.com" style={inp}/>
            </div>
            {err&&<Alert type="error">{err}</Alert>}
            <button onClick={forgotPw} disabled={loading} style={{...btn,...(loading?off:{})}}>{loading?'Sending…':'Send reset link'}</button>
          </>}

          {/* FORGOT SENT */}
          {view==='forgot_sent'&&<div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:44,marginBottom:12}}></div>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:8}}>Check your inbox</div>
            <p style={{fontSize:14,color:'#64748b',lineHeight:1.7,marginBottom:24}}>A reset link was sent to <strong style={{color:'#0f172a'}}>{email}</strong></p>
            <button onClick={()=>setView('signin')} style={btn}>Back to sign in</button>
          </div>}

        </div>
        <p style={{textAlign:'center',marginTop:20,fontSize:12,color:'#94a3b8'}}>CoParent Pay · Secure sign-in</p>
      </div>
    </div>
  )
}

function Alert({type,children}:{type:'error'|'ok',children:React.ReactNode}) {
  return <div style={{padding:'10px 14px',background:type==='error'?'#fef2f2':'#f0fdf4',border:`1px solid ${type==='error'?'#fecaca':'#bbf7d0'}`,borderRadius:10,fontSize:13,color:type==='error'?'#dc2626':'#059669',marginBottom:14,lineHeight:1.55}}>{children}</div>
}

function PhoneField({dialCode,onDial,value,onChange,baseInp}:{dialCode:string,onDial:(c:string)=>void,value:string,onChange:(v:string)=>void,baseInp:React.CSSProperties}) {
  const [open,setOpen]=React.useState(false)
  const [q,setQ]=React.useState('')
  const ref=React.useRef<HTMLDivElement>(null)
  React.useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)}
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  },[])
  const sel=COUNTRIES.find(c=>c.dial===dialCode)??COUNTRIES[0]
  const list=q?COUNTRIES.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())||c.dial.includes(q)):COUNTRIES
  return (
    <div ref={ref} style={{position:'relative',display:'flex',gap:8}}>
      <button type="button" onClick={()=>{setOpen(o=>!o);setQ('')}} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 10px',background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:11,cursor:'pointer',fontSize:14,color:'#0f172a',minWidth:86,flexShrink:0}}>
        <span style={{fontSize:18}}>{sel.flag}</span><span style={{fontWeight:600}}>{sel.dial}</span><span style={{fontSize:10,color:'#94a3b8'}}>▾</span>
      </button>
      <input type="tel" value={value} onChange={e=>onChange(e.target.value)} placeholder="400 000 000" style={{...baseInp,flex:1}}/>
      {open&&<div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:200,width:270,maxHeight:280,overflowY:'auto',background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>
        <div style={{padding:'8px 10px',borderBottom:'1px solid #f1f5f9',position:'sticky',top:0,background:'#fff'}}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search country…" style={{width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,background:'#f8fafc',outline:'none',boxSizing:'border-box'}}/>
        </div>
        {list.map(c=>(
          <button key={c.name+c.dial} type="button" onClick={()=>{onDial(c.dial);setOpen(false);setQ('')}} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:c.dial===dialCode&&c.name===sel.name?'#f0fdf4':'transparent',border:'none',cursor:'pointer',borderBottom:'1px solid #f8fafc'}}>
            <span style={{fontSize:18}}>{c.flag}</span>
            <span style={{flex:1,fontSize:13,color:'#0f172a',textAlign:'left'}}>{c.name}</span>
            <span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>{c.dial}</span>
          </button>
        ))}
      </div>}
    </div>
  )
}
