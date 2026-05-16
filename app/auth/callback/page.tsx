'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      const code = localStorage.getItem('pendingInvite')
      if (code) { localStorage.removeItem('pendingInvite'); router.replace(`/invite/${code}`) }
      else router.replace('/dashboard')
    })
  }, [router])
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f8fafc', gap:12, fontFamily:'system-ui,sans-serif' }}>
      <div style={{ width:32, height:32, border:'2.5px solid #e2e8f0', borderTopColor:'#0f172a', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
      <p style={{ fontSize:14, color:'#64748b' }}>Completing sign in…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
