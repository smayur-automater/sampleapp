'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'signin' | 'signup'
type Step = 'form' | 'verify-otp' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signin')
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [otp, setOtp] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null)

  const err = (text: string) => setMsg({ type: 'error', text })
  const ok = (text: string) => setMsg({ type: 'ok', text })
  const clear = () => setMsg(null)
  const blue = '#2563eb'

  function switchTab(t: Tab) {
    setTab(t); setStep('form'); setPassword(''); setConfirmPw(''); setOtp(''); clear()
  }

  async function googleLogin() {
    setGoogleLoading(true); clear()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { err(error.message); setGoogleLoading(false) }
  }

  // SIGN IN with email + password
  async function signIn() {
    if (!email || !password) { err('Enter your email and password'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) err('Wrong email or password')
    else router.push('/dashboard')
  }

  // SIGN UP — create account & immediately send a 6-digit OTP for email verification
  async function signUp() {
    if (!email || !password) { err('Enter your email and password'); return }
    if (password.length < 6) { err('Password must be at least 6 characters'); return }
    if (password !== confirmPw) { err('Passwords don\'t match'); return }
    setLoading(true); clear()

    // Step 1: Create account with email + password
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (signUpError) {
      setLoading(false)
      if (signUpError.message?.toLowerCase().includes('already')) {
        err('This email is already registered. Try signing in instead.')
      } else {
        err(signUpError.message)
      }
      return
    }

    // Step 2: Send OTP for email verification
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setLoading(false)

    if (otpError) {
      err('Account created but verification email failed: ' + otpError.message)
      return
    }

    setStep('verify-otp')
    ok(`6-digit code sent to ${email}`)
  }

  async function verifyOtp() {
    if (otp.length < 6) { err('Enter the 6-digit code'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) err('Code is invalid or expired')
    else router.push('/dashboard')
  }

  async function resendOtp() {
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setLoading(false)
    if (error) err(error.message)
    else ok('New code sent')
  }

  async function forgotPassword() {
    if (!email) { err('Enter your email'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) err(error.message)
    else ok('Reset link sent — check your email')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '52px', height: '52px', background: blue, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>CoParent</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Shared expense tracker for your kids</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

          {/* OTP VERIFICATION STEP */}
          {step === 'verify-otp' && (
            <>
              <BackButton onClick={() => { setStep('form'); clear() }} />
              <Title text="Verify your email" />
              <Subtitle text={`Enter the 6-digit code sent to ${email}`} />

              <div style={{ marginBottom: '14px' }}>
                <Label text="6-DIGIT CODE" />
                <input
                  type="text" inputMode="numeric" value={otp} maxLength={6}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear() }}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  placeholder="000000" autoFocus
                  style={{ width: '100%', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '28px', letterSpacing: '12px', textAlign: 'center', background: '#f8fafc', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              <Tip text="Check your spam folder. The code is 6 digits — ignore any 'click here' links in the email." />
              {msg && <Alert msg={msg} />}

              <Btn onClick={verifyOtp} loading={loading} color={blue}>
                {tab === 'signup' ? 'Verify & create account' : 'Verify & sign in'}
              </Btn>

              <button onClick={resendOtp} disabled={loading} style={{ width: '100%', marginTop: '12px', padding: '8px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                Resend code
              </button>
            </>
          )}

          {/* FORGOT PASSWORD STEP */}
          {step === 'forgot' && (
            <>
              <BackButton onClick={() => { setStep('form'); clear() }} />
              <Title text="Reset password" />
              <Subtitle text="We'll email you a reset link" />
              <Field label="EMAIL ADDRESS">
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }}
                  onKeyDown={e => e.key === 'Enter' && forgotPassword()}
                  placeholder="you@example.com" autoFocus
                  style={fieldInputStyle} />
              </Field>
              {msg && <Alert msg={msg} />}
              <Btn onClick={forgotPassword} loading={loading} color={blue}>Send reset link</Btn>
            </>
          )}

          {/* MAIN FORM (signin / signup) */}
          {step === 'form' && (
            <>
              {/* Google */}
              <button onClick={googleLogin} disabled={googleLoading}
                style={{ width: '100%', padding: '12px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: googleLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '18px', color: '#0f172a', opacity: googleLoading ? 0.6 : 1 }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <Divider />

              {/* Tab toggle: Sign in / Sign up */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', marginBottom: '20px' }}>
                {(['signin', 'signup'] as Tab[]).map(t => (
                  <button key={t} onClick={() => switchTab(t)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#0f172a' : '#64748b', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                    {t === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              {/* Email */}
              <Field label="EMAIL ADDRESS">
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }}
                  placeholder="you@example.com" autoFocus
                  style={fieldInputStyle} />
              </Field>

              {/* Password */}
              <Field label="PASSWORD">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); clear() }}
                    onKeyDown={e => { if (e.key === 'Enter' && tab === 'signin') signIn() }}
                    placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                    style={{ ...fieldInputStyle, paddingRight: '40px' }}
                  />
                  <button onClick={() => setShowPw(!showPw)} type="button" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                    {showPw
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </Field>

              {/* Confirm password — sign up only */}
              {tab === 'signup' && (
                <Field label="CONFIRM PASSWORD">
                  <input type={showPw ? 'text' : 'password'} value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); clear() }}
                    onKeyDown={e => e.key === 'Enter' && signUp()}
                    placeholder="Re-enter password"
                    style={fieldInputStyle} />
                </Field>
              )}

              {msg && <Alert msg={msg} />}

              <Btn onClick={tab === 'signin' ? signIn : signUp} loading={loading} color={blue}>
                {tab === 'signin' ? 'Sign in' : 'Create account'}
              </Btn>

              {tab === 'signin' && (
                <button onClick={() => { setStep('forgot'); clear() }} style={{ width: '100%', marginTop: '12px', padding: '8px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              )}

              {tab === 'signup' && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#eff6ff', borderRadius: '8px', fontSize: '12px', color: '#1e40af', lineHeight: 1.5 }}>
                  After creating your account, we&apos;ll send a 6-digit code to your email to verify it.
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#94a3b8' }}>
          CoParent · Secure sign-in
        </div>
      </div>
    </div>
  )
}

// ── Helper components ──
const fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1px solid #e2e8f0', borderRadius: '12px',
  fontSize: '14px', background: '#f8fafc', outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <Label text={label} />
      {children}
    </div>
  )
}
function Label({ text }: { text: string }) {
  return <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '6px', letterSpacing: '0.05em' }}>{text}</div>
}
function Title({ text }: { text: string }) {
  return <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{text}</div>
}
function Subtitle({ text }: { text: string }) {
  return <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>{text}</div>
}
function Tip({ text }: { text: string }) {
  return <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: '8px', fontSize: '12px', color: '#1e40af', marginBottom: '14px', lineHeight: 1.5 }}>{text}</div>
}
function Btn({ onClick, loading, color, children }: { onClick: () => void; loading: boolean; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#93c5fd' : color, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}
function Alert({ msg }: { msg: { type: 'error' | 'ok'; text: string } }) {
  const isErr = msg.type === 'error'
  return (
    <div style={{ padding: '10px 12px', background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', fontSize: '13px', color: isErr ? '#dc2626' : '#059669', marginBottom: '14px', lineHeight: 1.4 }}>
      {msg.text}
    </div>
  )
}
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '18px', padding: 0 }}>
      ← Back
    </button>
  )
}
function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      <span style={{ fontSize: '12px', color: '#94a3b8' }}>or use email</span>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
  )
}
