'use client'
import {
  ArrowPathIcon,
  BellAlertIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { AuditEntry, actionLabel, actionColor, actionIcon, timeAgo } from '@/lib/audit'


interface AuditPanelProps {
  open: boolean
  onClose: () => void
}

export default function AuditPanel({ open, onClose }: AuditPanelProps) {
  const { ctx } = useHousehold()
  const [entries, setEntries]   = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(false)
  const [filter,  setFilter]    = useState<'all'|'expense'|'kid'|'parent'|'category'>('all')

  const load = useCallback(async () => {
    if (!ctx) return
    setLoading(true)
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .eq('household_id', ctx.household_id)
      .order('created_at', { ascending: false })
      .limit(100)
    setEntries((data ?? []) as AuditEntry[])
    setLoading(false)
  }, [ctx])

  // Load on open, and subscribe to realtime changes
  useEffect(() => {
    if (!open || !ctx) return
    load()

    const channel = supabase
      .channel('audit-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_log',
        filter: `household_id=eq.${ctx.household_id}`,
      }, (payload) => {
        setEntries(prev => [payload.new as AuditEntry, ...prev].slice(0, 100))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [open, ctx, load])

  const filtered = entries.filter(e =>
    filter === 'all' ? true : e.action.startsWith(filter)
  )

  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'expense',  label: 'Expenses' },
    { key: 'kid',      label: 'Kids' },
    { key: 'parent',   label: 'Parents' },
    { key: 'category', label: 'Categories' },
  ] as const

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.2)' }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 90, right: 0, bottom: 0, zIndex: 201,
        width: 340, background: '#fff', borderLeft: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: open ? '-4px 0 24px rgba(0,0,0,0.08)' : 'none',
        fontFamily: 'system-ui, sans-serif',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <BellAlertIcon style={{ width: 16, height: 16, color: "#2563eb" }}/>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Activity</span>
              {entries.length > 0 && (
                <span style={{ padding: '1px 7px', background: '#eff6ff', color: '#2563eb', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{entries.length}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={load} style={{ width: 28, height: 28, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowPathIcon style={{ width: 12, height: 12, color: "#64748b" }}/>
              </button>
              <button onClick={onClose} style={{ width: 28, height: 28, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 14, height: 14, color: "#64748b" }}/>
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: '3px 9px', border: filter === f.key ? '1.5px solid #2563eb' : '1px solid #e2e8f0', borderRadius: 99, background: filter === f.key ? '#eff6ff' : '#f8fafc', color: filter === f.key ? '#2563eb' : '#64748b', fontSize: 11, fontWeight: filter === f.key ? 700 : 400, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 22, height: 22, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13 }}>
              No activity yet
            </div>
          ) : (
            filtered.map((e, i) => {
              const color = actionColor(e.action as any)
              const isMe = e.user_id === ctx?.myUserId
              return (
                <div key={e.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {/* Timeline dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: color + '14', border: `1.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      {actionIcon(e.action as any)}
                    </div>
                    {i < filtered.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 12, background: '#f1f5f9', marginTop: 4 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.3 }}>
                        {actionLabel(e.action as any)}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {timeAgo(e.created_at)}
                      </span>
                    </div>

                    {e.entity && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.entity}
                      </div>
                    )}

                    {e.detail && (
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{e.detail}</div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, background: e.action.startsWith('parent') ? '#94a3b8' : (ctx?.members.find(m => m.user_id === e.user_id)?.color ?? '#94a3b8'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 8, flexShrink: 0 }}>
                        {(e.actor_name ?? '?')[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: isMe ? 600 : 400 }}>
                        {isMe ? 'You' : (e.actor_name ?? 'Unknown')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', textAlign: 'center', flexShrink: 0 }}>
          Showing last {entries.length} events · Updates in real time
        </div>
      </div>
    </>
  )
}
