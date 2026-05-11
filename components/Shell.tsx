'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TABS = [
  { path: '/dashboard', label: 'Home', icon: HomeIcon },
  { path: '/kids', label: 'Kids', icon: KidsIcon },
  { path: '/parents', label: 'Parents', icon: ParentsIcon },
  { path: '/categories', label: 'Tags', icon: TagIcon },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/')
      else setChecking(false)
    })
  }, [router])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '56px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', background: '#2563eb', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2.2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a', letterSpacing: '-0.3px' }}>CoParent</span>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}>
          Sign out
        </button>
      </header>

      <main style={{ flex: 1, paddingTop: '56px', paddingBottom: '68px' }}>{children}</main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, height: '68px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex' }}>
        {TABS.map(({ path, label, icon: Icon }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => router.push(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', border: 'none', background: 'none', cursor: 'pointer', color: active ? '#2563eb' : '#94a3b8', position: 'relative' }}>
              <Icon active={active} />
              <span style={{ fontSize: '10px', fontWeight: active ? '700' : '400', letterSpacing: '0.02em' }}>{label}</span>
              {active && <div style={{ position: 'absolute', bottom: 0, width: '24px', height: '2px', background: '#2563eb', borderRadius: '2px 2px 0 0' }} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function KidsIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
}
function ParentsIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function TagIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}
