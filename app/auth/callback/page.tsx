'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Handle the OAuth / magic-link callback
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Check for pending invite code
        const code = typeof window !== 'undefined' ? localStorage.getItem('pendingInvite') : null
        if (code) {
          localStorage.removeItem('pendingInvite')
          router.replace(`/invite/${code}`)
        } else {
          router.replace('/dashboard')
        }
      }
    })

    // Fallback: direct session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const code = localStorage.getItem('pendingInvite')
        if (code) { localStorage.removeItem('pendingInvite'); router.replace(`/invite/${code}`) }
        else router.replace('/dashboard')
      } else {
        // Give auth state a moment to settle, then redirect to login
        setTimeout(() => router.replace('/'), 3000)
      }
    })
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '2.5px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <p style={{ fontSize: 14, color: '#64748b' }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
