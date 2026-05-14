'use client'
import { useState } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Tab  = 'signin' | 'signup'
type Step = 'form' | 'otp' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [tab,       setTab]       = useState<Tab>('signin')
  const [step,      setStep]      = useState<Step>('form')
  const [email,     setEmail]     = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [pw,        setPw]        = useState('')
  const [pw2,       setPw2]       = useState('')
  const [otp,       setOtp]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [gLoading,  setGLoading]  = useState(false)
  const [error,     setError]     = useState('')
  const [ok,        setOk]        = useState('')

  const E = (t: string) => { setError(t); setOk('') }
  const O = (t: string) => { setOk(t);   setError('') }
  const clear = () => { setError(''); setOk('') }

  function redirectAfterAuth() {
    const pending = typeof window !== 'undefined' ? localStorage.getItem('pendingInvite') : null
    if (pending) { localStorage.removeItem('pendingInvite'); router.push(`/invite/${pending}`) }
    else router.push('/dashboard')
  }

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
    else redirectAfterAuth()
  }

  async function signUp() {
    if (!firstName.trim()) { E('Enter your first name'); return }
    if (!lastName.trim())  { E('Enter your last name'); return }
    if (!email)            { E('Enter your email'); return }
    if (!pw)               { E('Choose a password'); return }
    if (pw.length < 6)     { E('Password must be at least 6 characters'); return }
    if (pw !== pw2)        { E('Passwords do not match'); return }
    setLoading(true); clear()

    const { error: e1 } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          full_name:  `${firstName.trim()} ${lastName.trim()}`,
        },
      },
    })
    if (e1) {
      setLoading(false)
      E(e1.message.includes('already') ? 'Already registered — try signing in' : e1.message)
      return
    }
    const { error: e2 } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
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
    else redirectAfterAuth()
  }

  async function forgotPw() {
    if (!email) { E('Enter your email first'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/callback` })
    setLoading(false)
    if (error) E(error.message)
    else O('Reset link sent — check your inbox')
  }

  const c = {
    page:  { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' } as React.CSSProperties,
    card:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } as React.CSSProperties,
    inp:   { width: '100%', padding: '12px 13px', border: '1.5px solid #e2e8f0', borderRadius: 11, fontSize: 14, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const },
    btn:   { width: '100%', padding: 14, background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em' } as React.CSSProperties,
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase' as const },
    ghost: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: '8px 0', width: '100%' } as React.CSSProperties,
  }

  return (
    <div style={c.page}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {!isConfigured && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
            ⚠️ Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables
          </div>
        )}

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CoParent Pay" style={{ width: 88, height: 88, objectFit: 'contain', margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#1a3a6b' }}>CoParent</span>
            <span style={{ color: '#2ec4a0' }}> Pay</span>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 5, fontWeight: 500 }}>
            Shared Expenses. Shared Responsibility.
          </div>
        </div>

        <div style={c.card}>

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <>
              <button onClick={() => { setStep('form'); clear() }} style={{ ...c.ghost, textAlign: 'left', marginBottom: 16, width: 'auto' }}>← Back</button>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Check your email</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
                Enter the 6-digit code sent to <strong style={{ color: '#0f172a' }}>{email}</strong>
              </div>
              <label style={c.label}>6-digit code</label>
              <input
                value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear() }}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                placeholder="000000" maxLength={6} autoFocus
                style={{ ...c.inp, fontSize: 28, letterSpacing: 14, textAlign: 'center', marginBottom: 12, fontFamily: 'monospace' }}
              />
              {error && <Alert type="error">{error}</Alert>}
              {ok    && <Alert type="ok">{ok}</Alert>}
              <button onClick={verifyOtp} disabled={loading} style={{ ...c.btn, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button onClick={() => { setStep('form'); signUp() }} style={{ ...c.ghost, marginTop: 8, fontSize: 12 }}>
                Resend code
              </button>
            </>
          )}

          {/* ── Forgot password ── */}
          {step === 'forgot' && (
            <>
              <button onClick={() => { setStep('form'); clear() }} style={{ ...c.ghost, textAlign: 'left', marginBottom: 16, width: 'auto' }}>← Back</button>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Reset password</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>We&apos;ll send a reset link to your email</div>
              <label style={c.label}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && forgotPw()}
                placeholder="you@example.com" style={{ ...c.inp, marginBottom: 12 }} autoFocus />
              {error && <Alert type="error">{error}</Alert>}
              {ok    && <Alert type="ok">{ok}</Alert>}
              <button onClick={forgotPw} disabled={loading} style={{ ...c.btn, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </>
          )}

          {/* ── Main form ── */}
          {step === 'form' && (
            <>
              {/* Google */}
              <button onClick={googleLogin} disabled={gLoading}
                style={{ width: '100%', padding: '12px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: gLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18, opacity: gLoading ? 0.6 : 1, color: '#0f172a' }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {gLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>or use email</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* Tab toggle */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 11, padding: 3, marginBottom: 20, gap: 2 }}>
                {(['signin', 'signup'] as Tab[]).map(t => (
                  <button key={t} onClick={() => { setTab(t); clear() }}
                    style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 400, background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#0f172a' : '#64748b', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {t === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              {/* Sign up: first + last name */}
              {tab === 'signup' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={c.label}>First name</label>
                    <input
                      value={firstName}
                      onChange={e => { setFirstName(e.target.value); clear() }}
                      placeholder="Sarah"
                      style={c.inp}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={c.label}>Last name</label>
                    <input
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); clear() }}
                      placeholder="Smith"
                      style={c.inp}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={c.label}>Email</label>
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); clear() }}
                  onKeyDown={e => { if (e.key === 'Enter' && tab === 'signin') signIn() }}
                  placeholder="you@example.com"
                  autoFocus={tab === 'signin'}
                  style={c.inp}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={c.label}>Password</label>
                <input type="password" value={pw}
                  onChange={e => { setPw(e.target.value); clear() }}
                  onKeyDown={e => { if (e.key === 'Enter' && tab === 'signin') signIn() }}
                  placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                  style={c.inp}
                />
              </div>

              {tab === 'signup' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={c.label}>Confirm password</label>
                  <input type="password" value={pw2}
                    onChange={e => { setPw2(e.target.value); clear() }}
                    onKeyDown={e => e.key === 'Enter' && signUp()}
                    placeholder="Re-enter password"
                    style={c.inp}
                  />
                </div>
              )}

              {error && <Alert type="error">{error}</Alert>}
              {ok    && <Alert type="ok">{ok}</Alert>}

              <button onClick={tab === 'signin' ? signIn : signUp} disabled={loading}
                style={{ ...c.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account →'}
              </button>

              {tab === 'signin' && (
                <button onClick={() => { setStep('forgot'); clear() }} style={c.ghost}>
                  Forgot password?
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          CoParent Pay · Secure sign-in
        </div>
      </div>
    </div>
  )
}

function Alert({ type, children }: { type: 'error' | 'ok'; children: React.ReactNode }) {
  const isErr = type === 'error'
  return (
    <div style={{ padding: '10px 13px', background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`, borderRadius: 9, fontSize: 13, color: isErr ? '#dc2626' : '#059669', marginBottom: 12, lineHeight: 1.5 }}>
      {children}
    </div>
  )
}
