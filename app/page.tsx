'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowRight, Mail, Key, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react'

type Mode = 'login' | 'otp' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const clear = () => { setError(''); setSuccess('') }

  const sendOTP = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setLoading(false)
    if (error) setError(error.message)
    else { setMode('otp'); setSuccess(`Code sent to ${email}`) }
  }

  const verifyOTP = async () => {
    if (otp.length < 6) { setError('Enter the 6-digit code'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) setError('Invalid or expired code. Try again.')
    else router.push('/home')
  }

  const forgotPassword = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : '',
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess('Reset link sent. Check your inbox.')
  }

  const s = {
    page: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', -apple-system, sans-serif" } as React.CSSProperties,
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '6px', letterSpacing: '0.02em' } as React.CSSProperties,
    input: { width: '100%', padding: '11px 13px 11px 36px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
    btn: { width: '100%', padding: '12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: '#1d4ed8', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.5px' }}>CoParent</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Shared expense tracker for your kids</p>
        </div>

        <div style={s.card}>
          {(mode === 'otp' || mode === 'forgot') && (
            <button onClick={() => { setMode('login'); clear() }} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginBottom: '24px' }}>
              <ChevronLeft size={14} /> Back
            </button>
          )}

          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
            {mode === 'login' ? 'Sign in' : mode === 'otp' ? 'Check your email' : 'Reset password'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
            {mode === 'login' ? "We'll send a one-time code to your email" : mode === 'otp' ? `Enter the 6-digit code sent to ${email}` : "We'll email you a reset link"}
          </p>

          {(mode === 'login' || mode === 'forgot') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>EMAIL</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? sendOTP() : forgotPassword())}
                  placeholder="you@example.com" autoFocus style={s.input} />
              </div>
            </div>
          )}

          {mode === 'otp' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>VERIFICATION CODE</label>
              <div style={{ position: 'relative' }}>
                <Key size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" inputMode="numeric" value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear() }}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  placeholder="000000" maxLength={6} autoFocus
                  style={{ ...s.input, fontSize: '20px', letterSpacing: '0.2em', fontFamily: "'DM Mono', monospace" }} />
              </div>
              <button onClick={sendOTP} style={{ marginTop: '8px', fontSize: '12px', color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}>Resend code</button>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '16px' }}>
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '16px' }}>
              <CheckCircle size={14} color="#10b981" />
              <span style={{ fontSize: '13px', color: '#059669' }}>{success}</span>
            </div>
          )}

          <button onClick={mode === 'login' ? sendOTP : mode === 'otp' ? verifyOTP : forgotPassword}
            disabled={loading}
            style={{ ...s.btn, background: loading ? '#93c5fd' : '#1d4ed8', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Please wait...' : (
              <>{mode === 'login' ? 'Send code' : mode === 'otp' ? 'Verify & sign in' : 'Send reset link'}<ArrowRight size={15} /></>
            )}
          </button>

          {mode === 'login' && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button onClick={() => { setMode('forgot'); clear() }} style={{ fontSize: '13px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                Forgot password? Reset via email
              </button>
            </div>
          )}
        </div>
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>Secure sign-in · No password required</p>
      </div>
    </div>
  )
}
