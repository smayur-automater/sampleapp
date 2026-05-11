'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'

interface Kid { id: string; name: string; dob: string | null; color: string }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#475569']
const EMPTY = { name: '', dob: '', color: '#2563eb' }

function getAge(dob: string | null) {
  if (!dob) return null
  const b = new Date(dob), t = new Date()
  let age = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--
  return age
}

export default function KidsPage() {
  const { ctx } = useHousehold()
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Kid | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (ctx) load() }, [ctx])

  async function load() {
    if (!ctx) return
    const { data } = await supabase.from('kids').select('*').eq('household_id', ctx.household_id).order('name')
    setKids(data ?? []); setLoading(false)
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(k: Kid) { setEditing(k); setForm({ name: k.name, dob: k.dob ?? '', color: k.color }); setModal(true) }

  async function save() {
    if (!form.name.trim() || !ctx) return
    setSaving(true)
    const payload = { name: form.name, dob: form.dob || null, color: form.color }
    if (editing) await supabase.from('kids').update(payload).eq('id', editing.id)
    else await supabase.from('kids').insert({ ...payload, household_id: ctx.household_id })
    setSaving(false); setModal(false); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this child? Their expenses will also be removed.')) return
    await supabase.from('kids').delete().eq('id', id); load()
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>Kids</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{kids.length} {kids.length === 1 ? 'child' : 'children'} · Shared with both parents</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add child
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading…</div>
        ) : kids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👶</div>
            <div style={{ fontWeight: '600', fontSize: '16px', color: '#374151', marginBottom: '6px' }}>No children added yet</div>
            <button onClick={openAdd} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '14px' }}>Add first child</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {kids.map(kid => {
              const age = getAge(kid.dob)
              return (
                <div key={kid.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: kid.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '20px', flexShrink: 0 }}>
                    {kid.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{kid.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      {age !== null ? `${age} years old` : kid.dob ? kid.dob : 'No birthday set'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEdit(kid)} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Edit</button>
                    <button onClick={() => del(kid.id)} style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{editing ? 'Edit child' : 'Add child'}</h3>
              <button onClick={() => setModal(false)} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '28px' }}>
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div><label style={lbl}>NAME</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Child's name" style={inp} autoFocus /></div>
              <div><label style={lbl}>DATE OF BIRTH (optional)</label><input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} style={inp} /></div>
              <div>
                <label style={lbl}>AVATAR COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: '36px', height: '36px', borderRadius: '10px', background: c, border: form.color === c ? '3px solid #0f172a' : '3px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
