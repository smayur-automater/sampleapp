'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, Tag, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const tabs = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/kids', label: 'Kids', icon: Users },
  { href: '/categories', label: 'Categories', icon: Tag },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e2e8f0', height: '56px', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: '#1d4ed8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2.5"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.3px' }}>CoParent</span>
        </div>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#64748b', fontFamily: 'inherit' }}>
          <LogOut size={13} /> Sign out
        </button>
      </header>
      <main style={{ paddingTop: '56px', paddingBottom: '72px', minHeight: '100vh' }}>{children}</main>
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', height: '64px' }}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <button key={href} onClick={() => router.push(href)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: active ? '#1d4ed8' : '#94a3b8', fontFamily: 'inherit' }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '10px', fontWeight: active ? '600' : '400', letterSpacing: '0.02em' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
