'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code   = (params?.code as string)?.toUpperCase()

  const [status, setStatus] = useState<'checking'|'login_needed'|'joining'|'success'|'error'>('checking')
  const [error,  setError]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    if (!code) { setStatus('error'); setError('Invalid invite link'); return }

    ;(async () => {
      // First peek at the invite to show who it's for
      const { data: inv } = await supabase
        .from('invites')
        .select('invited_email, expires_at, accepted')
        .eq('code', code)
        .maybeSingle()

      if (!inv) { setStatus('error'); setError('This invite link is invalid or has expired.'); return }
      if (inv.accepted) { setStatus('error'); setError('This invite has already been used.'); return }
      if (new Date(inv.expires_at) < new Date()) { setStatus('error'); setError('This invite link has expired. Ask your co-parent to send a new one.'); return }

      setInviteEmail(inv.invited_email)

      // Check if already signed in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Save code so login page can pick it up after auth
        localStorage.setItem('pendingInvite', code)
        setStatus('login_needed')
        return
      }

      // Already signed in — accept immediately
      setStatus('joining')
      const { data, error: rpcErr } = await supabase.rpc('accept_invite', { invite_code: code })
      if (rpcErr || !data?.ok) {
        setError(data?.error ?? rpcErr?.message ?? 'Could not join household')
        setStatus('error')
      } else {
        setStatus('success')
        setTimeout(() => router.replace('/dashboard'), 2000)
      }
    })()
  }, [code, router])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="#1a3a6b" strokeWidth="2"/><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#1a3a6b" strokeWidth="2" strokeLinecap="round"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#2ec4a0" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1a3a6b' }}>CoParent<span style={{ color: '#2ec4a0' }}> Pay</span></span>
        </div>

        {status === 'checking' && (
          <>
            <Spinner />
            <p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Checking invite…</p>
          </>
        )}

        {status === 'login_needed' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>👋</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>You&apos;ve been invited!</h2>
            {inviteEmail && (
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                This invite was sent to <strong style={{ color: '#0f172a' }}>{inviteEmail}</strong>
              </p>
            )}
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              Sign in or create an account to join the shared household. Your invite will be waiting.
            </p>
            <button
              onClick={() => router.push('/')}
              style={{ width: '100%', padding: '14px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Sign in / Create account →
            </button>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
              Use the same email address the invite was sent to.
            </p>
          </>
        )}

        {status === 'joining' && (
          <>
            <Spinner />
            <p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Joining household…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginBottom: 8 }}>You&apos;re in!</h2>
            <p style={{ fontSize: 13, color: '#64748b' }}>Taking you to your shared dashboard…</p>
            <div style={{ marginTop: 20, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#059669', borderRadius: 2, animation: 'grow 2s linear forwards' }} />
            </div>
            <style>{`@keyframes grow { from { width: 0% } to { width: 100% } }`}</style>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>Couldn&apos;t join</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ width: '100%', padding: 13, background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a3a6b', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
