'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const router  = useRouter()
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // If already signed in and is admin, redirect
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.rpc('is_admin')
        if (data) { router.replace('/admin'); return }
      }
      setLoading(false)
    })
  }, [router])

  async function login() {
    if (!email.trim() || !pw) { setError('Enter email and password'); return }
    setLoading(true); setError('')

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    })

    if (signInErr) {
      setLoading(false)
      setError('Invalid credentials')
      return
    }

    // Check admin status
    const { data: isAdminData } = await supabase.rpc('is_admin')
    if (!isAdminData) {
      await supabase.auth.signOut()
      setLoading(false)
      setError('Access denied — this account does not have admin privileges')
      return
    }

    router.replace('/admin')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: '#1e293b', border: '1px solid #334155', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>
            CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
          </div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Admin Console</div>
        </div>

        {/* Card */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '28px 28px 24px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>Administrator sign in</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>Access restricted to authorised admins only</p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>
              Email address
            </label>
            <input
              type="email" value={email} autoFocus
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="admin@example.com"
              style={{ width: '100%', padding: '11px 13px', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 14, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>
              Password
            </label>
            <input
              type="password" value={pw}
              onChange={e => { setPw(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 13px', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, fontSize: 14, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 13px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 9, fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            onClick={login} disabled={loading}
            style={{ width: '100%', padding: 13, background: loading ? '#1d4ed8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in to Admin'}
          </button>

          <div style={{ marginTop: 20, padding: '12px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>
              This panel is for authorised administrators only. All actions are logged.
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#334155' }}>
          CoParent Pay Admin Console · v2.0
        </p>
      </div>
    </div>
  )
}
