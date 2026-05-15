'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type View = 'signin' | 'reset' | 'reset_sent' | 'new_password'

const INP: React.CSSProperties = {
  width: '100%', padding: '11px 13px',
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 10, fontSize: 14, color: '#f1f5f9',
  outline: 'none', boxSizing: 'border-box',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#64748b', marginBottom: 6,
  letterSpacing: '0.07em', textTransform: 'uppercase',
}
const BTN = (disabled = false): React.CSSProperties => ({
  width: '100%', padding: 13,
  background: disabled ? '#1d4ed8' : '#2563eb',
  color: '#fff', border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.7 : 1,
})

export default function AdminLoginPage() {
  const router = useRouter()
  const [view,    setView]    = useState<View>('signin')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [newPw,   setNewPw]   = useState('')
  const [newPw2,  setNewPw2]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [ok,      setOk]      = useState('')

  const E = (t: string) => { setError(t); setOk('') }
  const O = (t: string) => { setOk(t);   setError('') }

  useEffect(() => {
    // Detect if arriving back from a password-reset email link
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setView('new_password')
      setLoading(false)
      return
    }
    // Already signed in as admin?
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.rpc('is_admin')
        if (data) { router.replace('/admin'); return }
      }
      setLoading(false)
    })
  }, [router])

  // ── Sign in ────────────────────────────────────────────────────
  async function login() {
    if (!email.trim() || !pw) { E('Enter email and password'); return }
    setLoading(true); setError('')
    const { error: e1 } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    if (e1) { setLoading(false); E('Invalid email or password'); return }
    const { data: isAdm } = await supabase.rpc('is_admin')
    if (!isAdm) {
      await supabase.auth.signOut()
      setLoading(false)
      E('Access denied — this account does not have admin privileges')
      return
    }
    router.replace('/admin')
  }

  // ── Send reset link ────────────────────────────────────────────
  async function sendReset() {
    if (!email.trim()) { E('Enter your admin email address'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/admin-login`,
    })
    setLoading(false)
    if (error) { E(error.message); return }
    setView('reset_sent')
  }

  // ── Save new password ─────────────────────────────────────────
  async function saveNewPassword() {
    if (!newPw)           { E('Enter a new password'); return }
    if (newPw.length < 8) { E('Password must be at least 8 characters'); return }
    if (newPw !== newPw2) { E('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setLoading(false)
    if (error) { E(error.message); return }
    O('Password updated! Redirecting…')
    setTimeout(() => { setView('signin'); setNewPw(''); setNewPw2(''); setOk('') }, 1800)
  }

  // ── Password strength ─────────────────────────────────────────
  function strength(p: string) {
    if (p.length < 8) return 1
    const has = (r: RegExp) => r.test(p)
    const score = [p.length >= 10, has(/[A-Z]/), has(/[0-9]/), has(/[^A-Za-z0-9]/)].filter(Boolean).length
    return Math.max(1, score)
  }
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#60a5fa', '#34d399']

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 54, height: 54, background: '#1e293b', border: '1px solid #334155', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>
            CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Admin Console</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '26px 26px 22px' }}>

          {/* ══ SIGN IN ══ */}
          {view === 'signin' && (<>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Administrator sign in</h1>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 22px' }}>Restricted to authorised admins only</p>

            <div style={{ marginBottom: 14 }}>
              <label style={LBL}>Email address</label>
              <input type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="xfinititech@gmail.com" style={INP} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={LBL}>Password</label>
              <input type="password" value={pw}
                onChange={e => { setPw(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="••••••••" style={INP} />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <button onClick={() => { setView('reset'); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 13, padding: 0 }}>
                Forgot password?
              </button>
            </div>

            {error && <Err>{error}</Err>}

            <button onClick={login} disabled={loading} style={BTN(loading)}>
              {loading ? 'Signing in…' : 'Sign in to Admin'}
            </button>

            <div style={{ marginTop: 18, padding: '10px 13px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9, display: 'flex', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.6 }}>
                All admin actions are logged. Unauthorised access attempts are recorded.
              </p>
            </div>
          </>)}

          {/* ══ FORGOT PASSWORD ══ */}
          {view === 'reset' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <button onClick={() => { setView('signin'); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 20, lineHeight: 1, padding: 0 }}>←</button>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Reset password</h1>
            </div>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 22px' }}>
              Enter your admin email and we&apos;ll send a password reset link.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={LBL}>Admin email address</label>
              <input type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && sendReset()}
                placeholder="xfinititech@gmail.com" style={INP} />
            </div>

            {error && <Err>{error}</Err>}

            <button onClick={sendReset} disabled={loading} style={BTN(loading)}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <button onClick={() => { setView('signin'); setError('') }}
              style={{ width: '100%', padding: '11px', marginTop: 8, background: 'transparent', border: '1px solid #334155', borderRadius: 10, fontSize: 14, color: '#64748b', cursor: 'pointer' }}>
              Back to sign in
            </button>
          </>)}

          {/* ══ RESET SENT ══ */}
          {view === 'reset_sent' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📧</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Check your inbox</div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
                A password reset link has been sent to<br />
                <strong style={{ color: '#f1f5f9' }}>{email}</strong>
              </p>

              <div style={{ padding: '12px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#475569', marginBottom: 20, lineHeight: 1.7, textAlign: 'left' as const }}>
                <strong style={{ color: '#64748b' }}>What happens next:</strong><br />
                1. Check your inbox (and spam folder)<br />
                2. Click the reset link in the email<br />
                3. You&apos;ll return here to set a new password
              </div>

              <button onClick={() => { setView('reset'); setError('') }}
                style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #334155', borderRadius: 10, fontSize: 13, color: '#64748b', cursor: 'pointer', marginBottom: 8 }}>
                Use a different email
              </button>
              <button onClick={() => setView('signin')}
                style={BTN()}>
                Back to sign in
              </button>
            </div>
          )}

          {/* ══ SET NEW PASSWORD ══ */}
          {view === 'new_password' && (<>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Set new password</h1>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Choose a strong password for your admin account</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={LBL}>New password</label>
              <input type="password" value={newPw} autoFocus
                onChange={e => { setNewPw(e.target.value); setError('') }}
                placeholder="At least 8 characters" style={INP} />
            </div>

            {/* Strength meter */}
            {newPw.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  {[1,2,3,4].map(i => {
                    const s = strength(newPw)
                    return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= s ? strengthColor[s] : '#334155', transition: 'background .2s' }} />
                  })}
                </div>
                <div style={{ fontSize: 11, color: strengthColor[strength(newPw)] }}>
                  {strengthLabel[strength(newPw)]}
                  {strength(newPw) < 3 && <span style={{ color: '#475569' }}> — add uppercase, numbers and symbols</span>}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={LBL}>Confirm new password</label>
              <input type="password" value={newPw2}
                onChange={e => { setNewPw2(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && saveNewPassword()}
                placeholder="Re-enter new password" style={INP} />
              {newPw2.length > 0 && newPw === newPw2 && (
                <div style={{ fontSize: 11, color: '#34d399', marginTop: 5 }}>✓ Passwords match</div>
              )}
            </div>

            {error && <Err>{error}</Err>}
            {ok    && <OkMsg>{ok}</OkMsg>}

            <button onClick={saveNewPassword} disabled={loading} style={BTN(loading)}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </>)}

        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#334155' }}>
          CoParent Pay Admin Console · v2.0
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return <>
    <div style={{ width: 32, height: 32, border: '2px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </>
}
function Err({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '10px 13px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 9, fontSize: 13, color: '#fca5a5', marginBottom: 16, lineHeight: 1.5 }}>{children}</div>
}
function OkMsg({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '10px 13px', background: '#052e16', border: '1px solid #166534', borderRadius: 9, fontSize: 13, color: '#4ade80', marginBottom: 16, lineHeight: 1.5 }}>{children}</div>
}
