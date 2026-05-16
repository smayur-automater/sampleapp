'use client'
import { useEffect, useState } from 'react'
import { XMarkIcon, BellAlertIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'

interface Entry { id: string; actor_name: string; action: string; entity: string | null; created_at: string }

const ACTION_LABELS: Record<string, string> = {
  'expense.add': 'Added expense', 'expense.edit': 'Edited expense', 'expense.delete': 'Deleted expense',
  'expense.settle': 'Settled expense', 'kid.add': 'Added child', 'kid.edit': 'Edited child',
  'kid.delete': 'Deleted child', 'parent.invite': 'Invited co-parent', 'parent.remove': 'Removed member',
  'profile.edit': 'Updated profile', 'category.add': 'Added category', 'category.delete': 'Deleted category',
}
function dot(action: string) {
  if (action.includes('delete') || action.includes('remove')) return '#dc2626'
  if (action.includes('add') || action.includes('invite')) return '#059669'
  if (action.includes('settle')) return '#2563eb'
  return '#64748b'
}
function ago(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function AuditPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ctx } = useHousehold()
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    if (!open || !ctx) return
    supabase.from('audit_log').select('id,actor_name,action,entity,created_at')
      .eq('household_id', ctx.household_id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setEntries(data ?? []))
  }, [open, ctx])

  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.18)' }} />
      <div style={{ position: 'fixed', top: 90, right: 0, bottom: 0, width: 300, zIndex: 96, background: '#fff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BellAlertIcon style={{ width: 15, height: 15, color: '#0f172a' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Activity</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <XMarkIcon style={{ width: 16, height: 16, color: '#64748b' }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {entries.length === 0
            ? <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No activity yet</p>
            : entries.map(e => (
              <div key={e.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot(e.action), marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{ACTION_LABELS[e.action] ?? e.action}</div>
                  {e.entity && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{e.entity}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{e.actor_name} · {ago(e.created_at)}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}
