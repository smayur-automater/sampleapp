'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'

interface Category { id: string; name: string; emoji: string; color: string; created_by: string | null }

const EMOJIS = ['❤️','📚','⚽','📍','✈️','😁','🛍️','🍽️','🎵','🎨','💻','🏥','🎭','🏋️','🎸','🏷️']
const COLORS = ['#dc2626','#2563eb','#059669','#d97706','#7c3aed','#db2777','#0891b2','#475569']
const EMPTY = { name: '', emoji: '🏷️', color: '#2563eb' }

export default function CategoriesPage() {
  const { ctx } = useHousehold()
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (ctx) load() }, [ctx])

  async function load() {
    if (!ctx) return
    const { data } = await supabase.from('categories').select('*').eq('household_id', ctx.household_id).order('name')
    setCats(data ?? []); setLoading(false)
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(c: Category) { setEditing(c); setForm({ name: c.name, emoji: c.emoji, color: c.color }); setModal(true) }

  async function save() {
    if (!form.name.trim() || !ctx) return
    setSaving(true)
    if (editing) await supabase.from('categories').update({ name: form.name, emoji: form.emoji, color: form.color }).eq('id', editing.id)
    else await supabase.from('categories').insert({ household_id: ctx.household_id, created_by: ctx.myUserId, name: form.name, emoji: form.emoji, color: form.color })
    setSaving(false); setModal(false); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this category?')) return
    await supabase.from('categories').delete().eq('id', id); load()
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>Categories</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{cats.length} categories</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {cats.map(cat => {
              const isMine = cat.created_by === ctx?.myUserId
              return (
                <div key={cat.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{cat.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                      <div style={{ width: '24px', height: '3px', background: cat.color, borderRadius: '2px', marginTop: '5px' }} />
                    </div>
                  </div>
                  {isMine ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(cat)} style={{ flex: 1, padding: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#374151', fontWeight: '500' }}>Edit</button>
                      <button onClick={() => del(cat.id)} style={{ flex: 1, padding: '7px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>Delete</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '7px' }}>Added by co-parent</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{editing ? 'Edit category' : 'Add category'}</h3>
              <button onClick={() => setModal(false)} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: form.color + '20', border: `3px solid ${form.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{form.emoji}</div>
              </div>
              <div><label style={lbl}>NAME</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Medical" style={inp} autoFocus /></div>
              <div>
                <label style={lbl}>EMOJI</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                  {EMOJIS.map(em => <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })} style={{ padding: '10px', fontSize: '20px', background: form.emoji === em ? '#eff6ff' : '#f8fafc', border: form.emoji === em ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>{em}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: '36px', height: '36px', borderRadius: '10px', background: c, border: form.color === c ? '3px solid #0f172a' : '3px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
