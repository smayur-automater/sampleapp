'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Users, Baby, Tag, LogOut, Activity, Zap, FileText } from 'lucide-react'
import AuditPanel from '@/components/AuditPanel'

const TABS = [
  { path: '/dashboard',  label: 'Home',       Icon: LayoutDashboard },
  { path: '/kids',       label: 'Kids',        Icon: Baby },
  { path: '/parents',    label: 'Parents',     Icon: Users },
  { path: '/categories', label: 'Categories',  Icon: Tag },
  { path: '/rules',      label: 'Rules',       Icon: Zap },
  { path: '/statements', label: 'Statements',  Icon: FileText },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [auditOpen, setAuditOpen] = useState(false)

  useEffect(() => {
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Top header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#2563eb', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={16} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', letterSpacing: '-0.3px' }}>CoParent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setAuditOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: `1px solid ${auditOpen ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, background: auditOpen ? '#eff6ff' : '#fff', fontSize: 12, color: auditOpen ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: 500 }}>
            <Activity size={13} /> Activity
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer', fontWeight: 500 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <AuditPanel open={auditOpen} onClose={() => setAuditOpen(false)} />

      <main style={{ paddingTop: 56, paddingBottom: 72, minHeight: '100vh' }}>{children}</main>

      {/* Bottom nav — scrollable so all 6 tabs are reachable */}
      <style>{`
        .cp-nav::-webkit-scrollbar { display: none; }
        .cp-nav { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <nav className="cp-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 64, background: '#fff', borderTop: '1px solid #e2e8f0',
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch' as any,
      }}>
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => router.push(path)} style={{
              minWidth: 74, flex: '0 0 auto',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, border: 'none', background: 'none', cursor: 'pointer',
              color: active ? '#2563eb' : '#94a3b8', position: 'relative', padding: '0 4px',
            }}>
              {active && <div style={{ position: 'absolute', top: 0, width: 30, height: 2, background: '#2563eb', borderRadius: '0 0 3px 3px' }} />}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 400, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
