'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import { Plus, X, Pencil, Trash2, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Category { id: string; name: string; icon: string; color: string }

const ICONS = [
  { value: 'heart', emoji: '❤️' }, { value: 'book-open', emoji: '📚' },
  { value: 'activity', emoji: '⚽' }, { value: 'map-pin', emoji: '📍' },
  { value: 'plane', emoji: '✈️' }, { value: 'smile', emoji: '😁' },
  { value: 'shopping-bag', emoji: '🛍️' }, { value: 'utensils', emoji: '🍽️' },
  { value: 'music', emoji: '🎵' }, { value: 'palette', emoji: '🎨' },
  { value: 'monitor', emoji: '💻' }, { value: 'tag', emoji: '🏷️' },
]
const COLORS = ['#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#1d4ed8','#8b5cf6','#ec4899','#64748b']
const getEmoji = (icon: string) => ICONS.find(i => i.value === icon)?.emoji || '🏷️'

export default function CategoriesPage() {
  const router = useRouter()
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', icon: 'tag', color: '#1d4ed8' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      load()
    })
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('created_at')
    setCats(data || []); setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm({ name: '', icon: 'tag', color: '#1d4ed8' }); setShowModal(true) }
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, icon: c.icon, color: c.color }); setShowModal(true) }

  const save = async () => {
    if (!form.name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    if (editing) await supabase.from('categories').update({ name: form.name, icon: form.icon, color: form.color }).eq('id', editing.id)
    else await supabase.from('categories').insert({ user_id: user.id, name: form.name, icon: form.icon, color: form.color })
    setSaving(false); setShowModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this category?')) return
    await supabase.from('categories').delete().eq('id', id); load()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties
  const lbl = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '6px', letterSpacing: '0.02em' } as React.CSSProperties

  return (
    <AppShell>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.4px' }}>Categories</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{cats.length} categories</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={15} /> Add
          </button>
        </div>

        {loading ? <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</p>
        : cats.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <Tag size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', color: '#64748b' }}>No categories yet. Sign in to auto-create defaults.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {cats.map(cat => (
              <div key={cat.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {getEmoji(cat.icon)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: cat.color, marginTop: '5px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEdit(cat)} style={{ flex: 1, padding: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Pencil size={13} color="#64748b" /></button>
                  <button onClick={() => del(cat.id)} style={{ flex: 1, padding: '7px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Trash2 size={13} color="#ef4444" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0f172a' }}>{editing ? 'Edit category' : 'Add category'}</h3>
              <button onClick={() => setShowModal(false)} style={{ padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><X size={16} color="#64748b" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: form.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: `2px solid ${form.color}40` }}>
                  {getEmoji(form.icon)}
                </div>
              </div>
              <div><label style={lbl}>NAME</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Medical" style={inp} autoFocus /></div>
              <div>
                <label style={lbl}>ICON</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {ICONS.map(ic => <button key={ic.value} type="button" onClick={() => setForm({ ...form, icon: ic.value })} style={{ padding: '10px', background: form.icon === ic.value ? '#eff6ff' : '#f8fafc', border: form.icon === ic.value ? '2px solid #1d4ed8' : '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '18px' }}>{ic.emoji}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: '28px', height: '28px', borderRadius: '7px', background: c, border: form.color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
