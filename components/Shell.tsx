'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Users, Baby, Tag, LogOut } from 'lucide-react'

const TABS = [
  { path: '/dashboard',  label: 'Home',       Icon: LayoutDashboard },
  { path: '/kids',       label: 'Kids',        Icon: Baby },
  { path: '/parents',    label: 'Parents',     Icon: Users },
  { path: '/categories', label: 'Categories',  Icon: Tag },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check auth AFTER render — never block the page from showing
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) router.replace('/')
      } catch {
        router.replace('/')
      }
    }
    check()
  }, [router])

  // ALWAYS render immediately — no spinner, no blocking
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#2563eb', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', letterSpacing: '-0.3px' }}>CoParent</span>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 13, color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
        >
          <LogOut size={13} />
          Sign out
        </button>
      </header>

      <main style={{ paddingTop: 56, paddingBottom: 68, minHeight: '100vh' }}>{children}</main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, height: 68, background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex' }}>
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', color: active ? '#2563eb' : '#94a3b8', position: 'relative' }}
            >
              {active && <div style={{ position: 'absolute', top: 0, width: 28, height: 2, background: '#2563eb', borderRadius: '0 0 3px 3px' }} />}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.03em' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
