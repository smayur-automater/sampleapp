'use client'
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'

import { logAudit } from '@/lib/audit'

interface Kid { id: string; name: string; dob: string | null; color: string; created_by: string | null }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#374151','#db2777']
const INP: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' as const }

function age(dob: string | null) {
  if (!dob) return null
  const b = new Date(dob), now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--
  return a
}

export default function KidsPage() {
  const { ctx, loading: ctxLoading, error: ctxError, reload: reloadCtx } = useHousehold()
  const [kids,    setKids]    = useState<Kid[]>([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<Kid | null>(null)
  const [form,    setForm]    = useState({ name: '', dob: '', color: COLORS[0] })
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const F = (k: Partial<typeof form>) => setForm(p => ({ ...p, ...k }))

  const load = useCallback(async () => {
    if (!ctx) return
    setLoading(true)
    const { data, error } = await supabase
      .from('kids')
      .select('id, name, dob, color, created_by')
      .eq('household_id', ctx.household_id)
      .order('name')
    if (error) console.error('kids load error:', error.message)
    setKids(data ?? [])
    setLoading(false)
  }, [ctx])

  useEffect(() => { if (ctx) load() }, [ctx, load])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', dob: '', color: COLORS[0] })
    setErr('')
    setModal(true)
  }

  function openEdit(k: Kid) {
    setEditing(k)
    setForm({ name: k.name, dob: k.dob ?? '', color: k.color })
    setErr('')
    setModal(true)
  }

  async function save() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    if (!ctx) { setErr('Not connected'); return }
    setSaving(true); setErr('')

    if (editing) {
      const { error } = await supabase
        .from('kids')
        .update({ name: form.name.trim(), dob: form.dob || null, color: form.color })
        .eq('id', editing.id)
      if (error) { setErr(error.message); setSaving(false); return }
      await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: ctx.members.find(m=>m.user_id===ctx.myUserId)?.display_name ?? 'Unknown', action: 'kid.edit', entity: form.name.trim() })
    } else {
      const { error } = await supabase
        .from('kids')
        .insert({ name: form.name.trim(), dob: form.dob || null, color: form.color, household_id: ctx.household_id, created_by: ctx.myUserId })
      if (error) { setErr(error.message); setSaving(false); return }
      await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: ctx.members.find(m=>m.user_id===ctx.myUserId)?.display_name ?? 'Unknown', action: 'kid.add', entity: form.name.trim() })
    }

    setSaving(false)
    setModal(false)
    load()
  }

  async function del(k: Kid) {
    if (!confirm(`Delete ${k.name}? Their expenses will also be removed.`)) return
    const { error } = await supabase.from('kids').delete().eq('id', k.id)
    if (error) { alert(error.message); return }
    if (ctx) await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: ctx.members.find(m=>m.user_id===ctx.myUserId)?.display_name ?? 'Unknown', action: 'kid.delete', entity: k.name })
    else load()
    load()
  }

  if (ctxLoading) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </Shell>
  )

  if (ctxError) return (
    <Shell>
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: 12 }}>{ctxError}</p>
        <button onClick={reloadCtx} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Kids</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{kids.length} {kids.length === 1 ? 'child' : 'children'} · shared with both parents</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <PlusIcon strokeWidth={2.5} style={{ width: 15, height: 15 }}/> Add child
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</div>
        ) : kids.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👶</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#334155', marginBottom: 6 }}>No children yet</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Add a profile for each child to start tracking their expenses</div>
            <button onClick={openAdd} style={{ padding: '9px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Add first child</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kids.map(kid => {
              const kidAge = age(kid.dob)
              const isOwner = kid.created_by === ctx?.myUserId
              return (
                <div key={kid.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 15, background: kid.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                    {kid.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{kid.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {kidAge !== null ? `${kidAge} years old` : kid.dob ? new Date(kid.dob).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No birthday set'}
                    </div>
                  </div>
                  {isOwner ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(kid)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500 }}>
                        <PencilIcon style={{ width: 12, height: 12 }}/> Edit
                      </button>
                      <button onClick={() => del(kid)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                        <TrashIcon style={{ width: 12, height: 12 }}/> Delete
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', flexShrink: 0 }}>Added by co-parent</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{editing ? 'Edit child' : 'Add child'}</h3>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: "#64748b" }}/>
              </button>
            </div>

            {/* Avatar preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 68, height: 68, borderRadius: 20, background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 28 }}>
                {form.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LBL}>Name *</label>
                <input value={form.name} onChange={e => F({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Child's name" style={INP} autoFocus />
              </div>

              <div>
                <label style={LBL}>Date of birth (optional)</label>
                <input type="date" value={form.dob} onChange={e => F({ dob: e.target.value })} style={INP} />
              </div>

              <div>
                <label style={LBL}>Avatar colour</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => F({ color: c })}
                      style={{ width: 36, height: 36, borderRadius: 10, background: c, border: form.color === c ? '3px solid #0f172a' : '2.5px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>

              {err && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{err}</div>}

              <button onClick={save} disabled={saving || !form.name.trim()}
                style={{ padding: 13, background: saving || !form.name.trim() ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
