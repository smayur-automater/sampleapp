'use client'
import { useState } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type View = 'signin' | 'signup' | 'otp' | 'forgot' | 'forgot_sent'

const S: Record<string, React.CSSProperties> = {
  page:  { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  wrap:  { width: '100%', maxWidth: 420 },
  card:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  inp:   { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 11, fontSize: 15, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const },
  lbl:   { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' as const },
  btn:   { width: '100%', padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  ghost: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: '6px 0', display: 'block' } as React.CSSProperties,
  row:   { marginBottom: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
}

export default function LoginPage() {
  const router = useRouter()
  const [view,      setView]      = useState<View>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [pw,        setPw]        = useState('')
  const [pw2,       setPw2]       = useState('')
  const [otp,       setOtp]       = useState('')
  const [loading,   setLoading]   = useState(false)
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

  // ── Sign in ───────────────────────────────────────────────────
  async function signIn() {
    if (!email.trim()) { E('Enter your email address'); return }
    if (!pw)           { E('Enter your password'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        // Account exists but email not verified — send OTP to verify
        await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
        setView('otp')
        O('Please verify your email — a code has been sent to ' + email.trim())
      } else {
        E('Incorrect email or password. Please try again.')
      }
    } else {
      redirectAfterAuth()
    }
  }

  // ── Sign up: create account with password, then send OTP to verify ─
  async function signUp() {
    if (!firstName.trim())    { E('Enter your first name'); return }
    if (!lastName.trim())     { E('Enter your last name'); return }
    if (!phone.trim())        { E('Enter your phone number'); return }
    if (!email.trim())        { E('Enter your email address'); return }
    if (!email.includes('@')) { E('Enter a valid email address'); return }
    if (!pw)                  { E('Choose a password'); return }
    if (pw.length < 6)        { E('Password must be at least 6 characters'); return }
    if (pw !== pw2)           { E('Passwords do not match'); return }
    setLoading(true); clear()

    // Step 1: Create the account
    const { data, error: e1 } = await supabase.auth.signUp({
      email:    email.trim(),
      password: pw,
      options:  {
        data: {
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          full_name:  `${firstName.trim()} ${lastName.trim()}`,
          phone:      phone.trim(),
        },
      },
    })

    if (e1) {
      setLoading(false)
      E(e1.message.toLowerCase().includes('already registered')
        ? 'An account with this email already exists. Try signing in.'
        : e1.message)
      return
    }

    // Step 2: If Supabase email confirmations are ON, send OTP for verification
    // If confirmations are OFF, the user is already signed in
    if (data.session) {
      // Email confirmation disabled — signed in immediately
      setLoading(false)
      redirectAfterAuth()
      return
    }

    // Email confirmation required — send OTP code instead of magic link
    const { error: e2 } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setLoading(false)

    if (e2) {
      if (e2.message.toLowerCase().includes('security purposes')) {
        // Supabase already sent a confirmation email during signUp — go to OTP screen
        setView('otp')
        O('A verification code was sent to ' + email.trim() + '. Enter it below.')
      } else {
        E('Account created. ' + e2.message + '. Please try signing in.')
      }
    } else {
      setView('otp')
      O('Verification code sent to ' + email.trim())
    }
  }

  // ── Verify OTP ────────────────────────────────────────────────
  async function verifyOtp() {
    if (otp.length < 6) { E('Enter the 6-digit code from your email'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: 'email' })
    setLoading(false)
    if (error) E('Invalid or expired code. Please request a new one.')
    else redirectAfterAuth()
  }

  async function resendOtp() {
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) E('Could not resend: ' + error.message)
    else O('New code sent to ' + email.trim())
  }

  // ── Forgot password ───────────────────────────────────────────
  async function forgotPw() {
    if (!email.trim()) { E('Enter your email address'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) E(error.message)
    else setView('forgot_sent')
  }

  const off = { opacity: 0.55, cursor: 'not-allowed' as const }

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {!isConfigured && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
            ⚠️ Missing Supabase environment variables
          </div>
        )}

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CoParent Pay" style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#1a3a6b' }}>CoParent</span>
            <span style={{ color: '#2ec4a0' }}> Pay</span>
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Shared Expenses. Shared Responsibility.</div>
        </div>

        <div style={S.card}>

          {/* ══ SIGN IN ══ */}
          {view === 'signin' && (<>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Sign in</div>
            <div style={S.row}>
              <label style={S.lbl}>Email address</label>
              <input type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                placeholder="you@example.com" style={S.inp} />
            </div>
            <div style={{ marginBottom: 4 }}>
              <label style={S.lbl}>Password</label>
              <input type="password" value={pw}
                onChange={e => { setPw(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                placeholder="••••••••" style={S.inp} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <button onClick={() => { setView('forgot'); clear() }}
                style={{ ...S.ghost, display: 'inline', padding: 0, fontSize: 13, color: '#1a3a6b' }}>
                Forgot password?
              </button>
            </div>
            {error && <Alert type="error">{error}</Alert>}
            {ok    && <Alert type="ok">{ok}</Alert>}
            <button onClick={signIn} disabled={loading} style={{ ...S.btn, ...(loading ? off : {}) }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
              Don&apos;t have an account?{' '}
              <button onClick={() => { setView('signup'); clear() }}
                style={{ ...S.ghost, display: 'inline', padding: 0, color: '#1a3a6b', fontWeight: 700 }}>
                Create one
              </button>
            </div>
          </>)}

          {/* ══ CREATE ACCOUNT ══ */}
          {view === 'signup' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => { setView('signin'); clear() }}
                style={{ ...S.ghost, padding: 0, color: '#1a3a6b', fontSize: 22, width: 'auto', lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Create account</div>
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.lbl}>First name</label>
                <input value={firstName} autoFocus onChange={e => { setFirstName(e.target.value); clear() }} placeholder="Sarah" style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>Last name</label>
                <input value={lastName} onChange={e => { setLastName(e.target.value); clear() }} placeholder="Smith" style={S.inp} />
              </div>
            </div>
            <div style={S.row}>
              <label style={S.lbl}>Phone number</label>
              <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); clear() }} placeholder="+61 400 000 000" style={S.inp} />
            </div>
            <div style={S.row}>
              <label style={S.lbl}>Email address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }} placeholder="you@example.com" style={S.inp} />
            </div>
            <div style={S.row}>
              <label style={S.lbl}>Password</label>
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); clear() }} placeholder="At least 6 characters" style={S.inp} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>Confirm password</label>
              <input type="password" value={pw2}
                onChange={e => { setPw2(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signUp()}
                placeholder="Re-enter password" style={S.inp} />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            {ok    && <Alert type="ok">{ok}</Alert>}
            <button onClick={signUp} disabled={loading} style={{ ...S.btn, ...(loading ? off : {}) }}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              A 6-digit verification code will be emailed to confirm your account.
            </p>
          </>)}

          {/* ══ OTP VERIFICATION ══ */}
          {view === 'otp' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { setView('signup'); clear() }}
                style={{ ...S.ghost, padding: 0, color: '#1a3a6b', fontSize: 22, width: 'auto', lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Check your email</div>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.65 }}>
              We sent a 6-digit code to <strong style={{ color: '#0f172a' }}>{email}</strong>. Enter it below to verify your account.
            </p>
            {ok    && <Alert type="ok">{ok}</Alert>}
            {error && <Alert type="error">{error}</Alert>}
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>Verification code</label>
              <input value={otp} autoFocus maxLength={6}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear() }}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                placeholder="000000"
                style={{ ...S.inp, fontSize: 32, letterSpacing: 16, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
            <button onClick={verifyOtp} disabled={loading || otp.length < 6}
              style={{ ...S.btn, ...(loading || otp.length < 6 ? off : {}) }}>
              {loading ? 'Verifying…' : 'Verify & sign in →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={resendOtp} disabled={loading}
                style={{ ...S.ghost, display: 'inline', color: '#1a3a6b', padding: 0, fontSize: 13 }}>
                Didn&apos;t get it? Resend code
              </button>
            </div>
          </>)}

          {/* ══ FORGOT PASSWORD ══ */}
          {view === 'forgot' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { setView('signin'); clear() }}
                style={{ ...S.ghost, padding: 0, color: '#1a3a6b', fontSize: 22, width: 'auto', lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Reset password</div>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.65 }}>
              Enter your email and we&apos;ll send a link to reset your password.
            </p>
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>Email address</label>
              <input type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && forgotPw()}
                placeholder="you@example.com" style={S.inp} />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <button onClick={forgotPw} disabled={loading} style={{ ...S.btn, ...(loading ? off : {}) }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>)}

          {/* ══ FORGOT SENT ══ */}
          {view === 'forgot_sent' && (<>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📧</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Check your inbox</div>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 24 }}>
                A password reset link has been sent to <strong style={{ color: '#0f172a' }}>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <button onClick={() => { setView('signin'); clear() }}
                style={{ ...S.btn, width: 'auto', padding: '11px 24px', margin: '0 auto', display: 'block', fontSize: 14 }}>
                Back to sign in
              </button>
            </div>
          </>)}

        </div>

        {/* Supabase OTP tip */}
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
    <div style={{
      padding: '10px 14px',
      background: isErr ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`,
      borderRadius: 10, fontSize: 13,
      color: isErr ? '#dc2626' : '#059669',
      marginBottom: 14, lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}
