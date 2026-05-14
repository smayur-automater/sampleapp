'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, LogOut } from 'lucide-react'
import AuditPanel from '@/components/AuditPanel'

const TABS = [
  { path: '/dashboard',  label: 'Home' },
  { path: '/kids',       label: 'Kids' },
  { path: '/parents',    label: 'Parents' },
  { path: '/categories', label: 'Categories' },
  { path: '/rules',      label: 'Rules' },
  { path: '/statements', label: 'Statements' },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const [auditOpen, setAuditOpen] = useState(false)
  const checked     = useRef(false)   // only run auth check once per mount

  useEffect(() => {
    if (checked.current) return
    checked.current = true

    // Use onAuthStateChange so we react to real session state
    // rather than racing against the session restore
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          router.replace('/')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── TOP BAR: logo + activity + sign out ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
      }}>
        {/* Row 1: brand + actions */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CoParent Pay" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1a3a6b', letterSpacing: '-0.3px' }}>
              CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
            </span>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setAuditOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px',
                border: `1px solid ${auditOpen ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: 8,
                background: auditOpen ? '#eff6ff' : '#fff',
                fontSize: 12, fontWeight: 600,
                color: auditOpen ? '#2563eb' : '#64748b',
                cursor: 'pointer',
              }}>
              <Activity size={13} /> Activity
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Row 2: tab navigation */}
        <div style={{ display: 'flex', overflowX: 'auto', borderTop: '1px solid #f1f5f9', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
          <style>{`.tab-scroll::-webkit-scrollbar{display:none}`}</style>
          <div className="tab-scroll" style={{ display: 'flex', overflowX: 'auto', width: '100%', scrollbarWidth: 'none' } as React.CSSProperties}>
            {TABS.map(({ path, label }) => {
              const active = pathname === path
              return (
                <button
                  key={path}
                  onClick={() => router.push(path)}
                  style={{
                    flexShrink: 0,
                    padding: '9px 16px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#1a3a6b' : '#64748b',
                    whiteSpace: 'nowrap',
                    borderBottom: active ? '2.5px solid #1a3a6b' : '2.5px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <AuditPanel open={auditOpen} onClose={() => setAuditOpen(false)} />

      {/* Main content — offset by header height (52 brand + ~38 tabs = 90px) */}
      <main style={{ paddingTop: 90, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
