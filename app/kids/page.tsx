'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { Plus, Pencil, Trash2, X, Baby } from 'lucide-react'

interface Kid { id: string; name: string; dob: string | null; color: string; created_by: string | null }

const COLORS = ['#1e40af','#0d9488','#7c3aed','#a16207','#b91c1c','#475569']
const EMPTY = { name: '', dob: '', color: '#1e40af' }

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
    else await supabase.from('kids').insert({ ...payload, household_id: ctx.household_id, created_by: ctx.myUserId })
    setSaving(false); setModal(false); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this child? Their expenses will also be removed.')) return
    await supabase.from('kids').delete().eq('id', id); load()
  }

  const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block', letterSpacing: '0.04em' }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.4px' }}>Kids</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{kids.length} {kids.length === 1 ? 'child' : 'children'}</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={2.2} /> Add child
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', fontSize: '14px' }}>Loading…</div>
        ) : kids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <Baby size={32} color="#cbd5e1" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>No children added yet</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Add a profile for each child</div>
            <button onClick={openAdd} style={{ padding: '10px 18px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>Add first child</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {kids.map(kid => {
              const age = getAge(kid.dob)
              const mine = kid.created_by === ctx?.myUserId
              return (
                <div key={kid.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: kid.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '17px', flexShrink: 0 }}>
                    {kid.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>{kid.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {age !== null ? `${age} years old` : kid.dob ? kid.dob : 'No birthday set'}
                    </div>
                  </div>
                  {mine ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(kid)} style={{ padding: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                        <Pencil size={13} color="#64748b" strokeWidth={2} />
                      </button>
                      <button onClick={() => del(kid.id)} style={{ padding: '7px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                        <Trash2 size={13} color="#94a3b8" strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Co-parent</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '600' }}>{editing ? 'Edit child' : 'New child'}</h3>
              <button onClick={() => setModal(false)} style={{ width: '32px', height: '32px', background: '#f8fafc', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" strokeWidth={2} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600', fontSize: '26px' }}>
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div><label style={lbl}>NAME</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Child's name" style={inp} autoFocus /></div>
              <div><label style={lbl}>DATE OF BIRTH (OPTIONAL)</label><input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} style={inp} /></div>
              <div>
                <label style={lbl}>ACCENT COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: '34px', height: '34px', borderRadius: '9px', background: c, border: form.color === c ? '3px solid #0f172a' : '3px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '13px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '11px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
