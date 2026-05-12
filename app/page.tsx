'use client'
import { useState } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Tab  = 'signin' | 'signup'
type Step = 'form' | 'otp' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [tab,     setTab]     = useState<Tab>('signin')
  const [step,    setStep]    = useState<Step>('form')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [pw2,     setPw2]     = useState('')
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [gLoading,setGLoading]= useState(false)
  const [error,   setError]   = useState('')
  const [ok,      setOk]      = useState('')

  const E = (t: string) => { setError(t); setOk('') }
  const O = (t: string) => { setOk(t);   setError('') }
  const clear = () => { setError(''); setOk('') }

  async function googleLogin() {
    setGLoading(true); clear()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { E(error.message); setGLoading(false) }
  }

  async function signIn() {
    if (!email || !pw) { E('Enter email and password'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setLoading(false)
    if (error) E('Wrong email or password')
    else router.push('/dashboard')
  }

  async function signUp() {
    if (!email || !pw)     { E('Enter email and password'); return }
    if (pw.length < 6)     { E('Password must be at least 6 characters'); return }
    if (pw !== pw2)        { E("Passwords do not match"); return }
    setLoading(true); clear()
    const { error: e1 } = await supabase.auth.signUp({ email: email.trim(), password: pw })
    if (e1) { setLoading(false); E(e1.message.includes('already') ? 'Already registered — try signing in' : e1.message); return }
    const { error: e2 } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
    setLoading(false)
    if (e2) E('Account created but could not send code: ' + e2.message)
    else { setStep('otp'); O(`Verification code sent to ${email}`) }
  }

  async function verifyOtp() {
    if (otp.length < 6) { E('Enter the 6-digit code'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: 'email' })
    setLoading(false)
    if (error) E('Invalid or expired code')
    else router.push('/dashboard')
  }

  async function forgotPw() {
    if (!email) { E('Enter your email first'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/callback` })
    setLoading(false)
    if (error) E(error.message)
    else O('Reset link sent — check your inbox')
  }

  // ── Styles ──────────────────────────────────────────────────
  const c = {
    page:   { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' } as React.CSSProperties,
    card:   { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } as React.CSSProperties,
    inp:    { width: '100%', padding: '11px 13px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const },
    btn:    { width: '100%', padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    label:  { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: '0.06em' } as React.CSSProperties,
    ghost:  { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: '8px 0', width: '100%' } as React.CSSProperties,
  }

  return (
    <div style={c.page}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Config warning */}
        {!isConfigured && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
            ⚠️ Supabase not configured — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel environment variables
          </div>
        )}

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: '#2563eb', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>CoParent</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Shared expense tracker for your kids</div>
        </div>

        <div style={c.card}>

          {/* OTP verify step */}
          {step === 'otp' && (<>
            <button onClick={() => { setStep('form'); clear() }} style={{ ...c.ghost, textAlign: 'left', marginBottom: 16, width: 'auto' }}>← Back</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Check your email</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Enter the 6-digit code sent to <strong>{email}</strong></div>
            <label style={c.label}>6-DIGIT CODE</label>
            <input
              value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); clear() }}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()}
              placeholder="000000" maxLength={6} autoFocus
              style={{ ...c.inp, fontSize: 26, letterSpacing: 12, textAlign: 'center', marginBottom: 12, fontFamily: 'monospace' }}
            />
            {error && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
            {ok    && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#059669', marginBottom: 12 }}>{ok}</div>}
            <button onClick={verifyOtp} disabled={loading} style={{ ...c.btn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
          </>)}

          {/* Forgot password step */}
          {step === 'forgot' && (<>
            <button onClick={() => { setStep('form'); clear() }} style={{ ...c.ghost, textAlign: 'left', marginBottom: 16, width: 'auto' }}>← Back</button>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Reset password</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Enter your email and we will send a reset link</div>
            <label style={c.label}>EMAIL</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }} onKeyDown={e => e.key === 'Enter' && forgotPw()} placeholder="you@example.com" style={{ ...c.inp, marginBottom: 12 }} autoFocus />
            {error && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
            {ok    && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#059669', marginBottom: 12 }}>{ok}</div>}
            <button onClick={forgotPw} disabled={loading} style={{ ...c.btn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>)}

          {/* Main login / signup */}
          {step === 'form' && (<>
            {/* Google */}
            <button onClick={googleLogin} disabled={gLoading} style={{ width: '100%', padding: '11px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: gLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, opacity: gLoading ? 0.6 : 1, color: '#0f172a' }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {gLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>or use email</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* Tab toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 20, gap: 2 }}>
              {(['signin','signup'] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); clear() }}
                  style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400, background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#0f172a' : '#64748b', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {t === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {/* Fields */}
            <label style={c.label}>EMAIL</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }}
              onKeyDown={e => { if (e.key === 'Enter' && tab === 'signin') signIn() }}
              placeholder="you@example.com" autoFocus style={{ ...c.inp, marginBottom: 12 }} />

            <label style={c.label}>PASSWORD</label>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); clear() }}
              onKeyDown={e => { if (e.key === 'Enter' && tab === 'signin') signIn() }}
              placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'} style={{ ...c.inp, marginBottom: 12 }} />

            {tab === 'signup' && (<>
              <label style={c.label}>CONFIRM PASSWORD</label>
              <input type="password" value={pw2} onChange={e => { setPw2(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signUp()}
                placeholder="Re-enter password" style={{ ...c.inp, marginBottom: 12 }} />
            </>)}

            {error && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
            {ok    && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#059669', marginBottom: 12 }}>{ok}</div>}

            <button onClick={tab === 'signin' ? signIn : signUp} disabled={loading}
              style={{ ...c.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>

            {tab === 'signin' && (
              <button onClick={() => { setStep('forgot'); clear() }} style={c.ghost}>
                Forgot password?
              </button>
            )}
          </>)}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>CoParent · Secure sign-in</div>
      </div>
    </div>
  )
}
