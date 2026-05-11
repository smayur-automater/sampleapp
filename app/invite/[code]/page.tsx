'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params?.code as string
  const [status, setStatus] = useState<'checking' | 'login_needed' | 'joining' | 'success' | 'error'>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Stash code, send to login
        if (typeof window !== 'undefined') localStorage.setItem('pendingInvite', code.toUpperCase())
        setStatus('login_needed')
        setTimeout(() => router.replace('/'), 1500)
        return
      }
      setStatus('joining')
      const { data, error } = await supabase.rpc('accept_invite', { invite_code: code.toUpperCase() })
      if (error || !data?.ok) {
        setError(data?.error ?? error?.message ?? 'Could not join')
        setStatus('error')
      } else {
        setStatus('success')
        setTimeout(() => router.replace('/dashboard'), 1500)
      }
    })()
  }, [code, router])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        {status === 'checking' && (
          <>
            <Spinner />
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Checking invite…</p>
          </>
        )}
        {status === 'login_needed' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>You&apos;ve been invited!</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Sign in or create an account to accept this invite. Redirecting…</p>
          </>
        )}
        {status === 'joining' && (
          <>
            <Spinner />
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>Joining household…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>You&apos;re in!</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Taking you to the dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>Could not join</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>{error}</p>
            <button onClick={() => router.replace('/dashboard')} style={{ marginTop: '20px', padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Go to dashboard</button>
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
