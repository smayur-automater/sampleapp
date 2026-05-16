'use client'
import { BellAlertIcon, ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuditPanel from '@/components/AuditPanel'

const TABS = [
  { path: '/dashboard',  label: 'Home'          },
  { path: '/kids',       label: 'Kids'          },
  { path: '/parents',    label: 'Parents'       },
  { path: '/categories', label: 'Categories'    },
  { path: '/rules',      label: 'Expense Rules' },
  { path: '/statements', label: 'Statements'    },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const [audit, setAudit] = useState(false)
  const routerRef   = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') routerRef.current.replace('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`.tab-wrap::-webkit-scrollbar{display:none}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1a3a6b' }}>
              CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setAudit(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', border: `1px solid ${audit ? '#0f172a' : '#e2e8f0'}`, borderRadius: 8, background: audit ? '#0f172a' : '#fff', fontSize: 12, fontWeight: 600, color: audit ? '#fff' : '#64748b', cursor: 'pointer' }}>
              <BellAlertIcon style={{ width: 14, height: 14 }} /> Activity
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }} style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer' }}>
              <ArrowLeftStartOnRectangleIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
        <div className="tab-wrap" style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid #f1f5f9' } as React.CSSProperties}>
          {TABS.map(({ path, label }) => {
            const on = pathname === path
            return (
              <button key={path} onClick={() => router.push(path)} style={{ flexShrink: 0, padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#1a3a6b' : '#64748b', whiteSpace: 'nowrap', borderBottom: on ? '2.5px solid #1a3a6b' : '2.5px solid transparent' }}>
                {label}
              </button>
            )
          })}
        </div>
      </header>
      <AuditPanel open={audit} onClose={() => setAudit(false)} />
      <main style={{ paddingTop: 90 }}>{children}</main>
    </div>
  )
}
