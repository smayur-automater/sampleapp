'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Status = 'checking' | 'login_needed' | 'joining' | 'success' | 'error'

export default function InvitePage() {
  const params   = useParams()
  const router   = useRouter()
  const code     = ((params?.code as string) ?? '').toUpperCase()
  const [status, setStatus] = useState<Status>('checking')
  const [error,  setError]  = useState('')
  const [email,  setEmail]  = useState('')

  useEffect(() => {
    if (!code) {
      setError('No invite code found in this link.')
      setStatus('error')
      return
    }
    run()
  }, [code]) // eslint-disable-line

  async function run() {
    setStatus('checking')

    // 1. Is user signed in?
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Not signed in — save code and redirect to login
      localStorage.setItem('pendingInvite', code)
      setStatus('login_needed')
      return
    }

    // 2. Signed in — try to join
    await joinHousehold()
  }

  async function joinHousehold() {
    setStatus('joining')

    const { data, error: rpcErr } = await supabase.rpc('accept_invite', {
      invite_code: code,
    })

    if (rpcErr) {
      console.error('accept_invite RPC error:', rpcErr)
      setError(`Failed to join: ${rpcErr.message}`)
      setStatus('error')
      return
    }

    if (!data?.ok) {
      const msg: string = data?.error ?? 'Unknown error'
      console.error('accept_invite returned error:', msg)

      // If already in this exact household — treat as success
      if (msg.toLowerCase().includes('already joined') ||
          msg.toLowerCase().includes('already in a household')) {
        if (typeof window !== 'undefined') localStorage.removeItem('pendingInvite')
        setStatus('success')
        setTimeout(() => router.replace('/dashboard'), 1500)
        return
      }

      setError(msg)
      setStatus('error')
      return
    }

    // Success! Clear the pending invite
    if (typeof window !== 'undefined') localStorage.removeItem('pendingInvite')
    setStatus('success')
    setTimeout(() => router.replace('/dashboard'), 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1a3a6b' }}>
            CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
          </span>
        </div>

        {/* CHECKING */}
        {status === 'checking' && (
          <><Spinner /><p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Checking invite…</p></>
        )}

        {/* NOT SIGNED IN */}
        {status === 'login_needed' && (
          <>
            <div style={{ fontSize: 44, marginBottom: 14 }}>👋</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
              You&apos;ve been invited!
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.65 }}>
              Sign in or create an account to join the shared household.
              Your invite will be applied automatically after you sign in.
            </p>
            <button onClick={() => router.push('/')}
              style={{ width: '100%', padding: 14, background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Sign in / Create account →
            </button>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
              Invite code: <strong>{code}</strong>
            </p>
          </>
        )}

        {/* JOINING */}
        {status === 'joining' && (
          <><Spinner /><p style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Joining household…</p></>
        )}

        {/* SUCCESS */}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginBottom: 8 }}>
              You&apos;re in!
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
              Taking you to the shared dashboard…
            </p>
            <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#059669', borderRadius: 2, animation: 'grow 1.5s linear forwards' }} />
            </div>
            <style>{`@keyframes grow{from{width:0}to{width:100%}}`}</style>
          </>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>
              Couldn&apos;t join
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8, lineHeight: 1.6 }}>
              {error}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>
              Code: {code}
            </p>
            <button onClick={run}
              style={{ width: '100%', padding: 13, background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              Try again
            </button>
            <button onClick={() => router.push('/dashboard')}
              style={{ width: '100%', padding: 13, background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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
      <div style={{ width: 34, height: 34, border: '3px solid #e2e8f0', borderTopColor: '#1a3a6b', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
