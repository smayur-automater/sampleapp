'use client'
import {
  BellAlertIcon,
  ArrowLeftStartOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuditPanel from '@/components/AuditPanel'

const TABS = [
  { path: '/dashboard',  label: 'Home'       },
  { path: '/kids',       label: 'Kids'       },
  { path: '/parents',    label: 'Parents'    },
  { path: '/categories', label: 'Categories' },
  { path: '/rules',      label: 'Rules'      },
  { path: '/statements', label: 'Statements' },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const [auditOpen, setAuditOpen] = useState(false)
  // Store router in a ref so the effect doesn't re-run when router changes
  const routerRef   = useRef(router)
  routerRef.current = router

  useEffect(() => {
    // Run exactly once on mount — never re-run
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only redirect to login on genuine sign-out, not on token refresh
        if (event === 'SIGNED_OUT') {
          routerRef.current.replace('/')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, []) // empty deps — intentional, routerRef handles the stable reference

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── TOP BAR ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
      }}>
        {/* Row 1: brand + actions */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
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
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', border: `1px solid ${auditOpen ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: 8, background: auditOpen ? '#eff6ff' : '#fff',
                fontSize: 12, fontWeight: 600, color: auditOpen ? '#2563eb' : '#64748b', cursor: 'pointer',
              }}>
              <BellAlertIcon style={{ width: 14, height: 14 }} /> Activity
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
              <ArrowLeftStartOnRectangleIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Row 2: tabs */}
        <div style={{ borderTop: '1px solid #f1f5f9', overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          <style>{`.tab-scroll::-webkit-scrollbar{display:none}`}</style>
          <div className="tab-scroll" style={{ display: 'flex', width: '100%', scrollbarWidth: 'none' } as React.CSSProperties}>
            {TABS.map(({ path, label }) => {
              const active = pathname === path
              return (
                <button
                  key={path}
                  onClick={() => router.push(path)}
                  style={{
                    flexShrink: 0, padding: '9px 18px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#1a3a6b' : '#64748b', whiteSpace: 'nowrap',
                    borderBottom: active ? '2.5px solid #1a3a6b' : '2.5px solid transparent',
                    transition: 'color 0.15s',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <AuditPanel open={auditOpen} onClose={() => setAuditOpen(false)} />

      <main style={{ paddingTop: 90, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
