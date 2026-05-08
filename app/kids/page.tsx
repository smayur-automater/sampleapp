'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import { Plus, X, Pencil, Trash2, Baby } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Kid { id: string; name: string; date_of_birth: string | null; avatar_color: string }
const COLORS = ['#1d4ed8','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#64748b']

function getAge(dob: string | null) {
  if (!dob) return null
  const birth = new Date(dob), today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  return (m < 0 || (m === 0 && today.getDate() < birth.getDate())) ? age - 1 : age
}

export default function KidsPage() {
  const router = useRouter()
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Kid | null>(null)
  const [form, setForm] = useState({ name: '', date_of_birth: '', avatar_color: '#1d4ed8' })
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
    const { data } = await supabase.from('kids').select('*').eq('user_id', user.id).order('created_at')
    setKids(data || []); setLoading(false)
  }

  const openAdd = () => { setEditing(null); setForm({ name: '', date_of_birth: '', avatar_color: '#1d4ed8' }); setShowModal(true) }
  const openEdit = (k: Kid) => { setEditing(k); setForm({ name: k.name, date_of_birth: k.date_of_birth || '', avatar_color: k.avatar_color }); setShowModal(true) }

  const save = async () => {
    if (!form.name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    if (editing) await supabase.from('kids').update({ name: form.name, date_of_birth: form.date_of_birth || null, avatar_color: form.avatar_color }).eq('id', editing.id)
    else await supabase.from('kids').insert({ user_id: user.id, name: form.name, date_of_birth: form.date_of_birth || null, avatar_color: form.avatar_color })
    setSaving(false); setShowModal(false); load()
  }

  const del = async (id: string) => {
    if (!confirm('Remove this child profile?')) return
    await supabase.from('kids').delete().eq('id', id); load()
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties
  const lbl = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '6px', letterSpacing: '0.02em' } as React.CSSProperties

  return (
    <AppShell>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.4px' }}>Kids</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{kids.length} {kids.length === 1 ? 'child' : 'children'} added</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={15} /> Add child
          </button>
        </div>

        {loading ? <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</p>
        : kids.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <Baby size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>No children added yet</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>Create a profile for each child to start tracking expenses.</p>
            <button onClick={openAdd} style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Add first child</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {kids.map(kid => {
              const age = getAge(kid.date_of_birth)
              return (
                <div key={kid.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: kid.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: '600', flexShrink: 0 }}>
                    {kid.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{kid.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{age !== null ? `${age} years old` : 'No birthday set'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEdit(kid)} style={{ padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Pencil size={14} color="#64748b" /></button>
                    <button onClick={() => del(kid.id)} style={{ padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} color="#ef4444" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0f172a' }}>{editing ? 'Edit child' : 'Add child'}</h3>
              <button onClick={() => setShowModal(false)} style={{ padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><X size={16} color="#64748b" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: form.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: '600' }}>
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div><label style={lbl}>NAME</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Child's name" style={inp} autoFocus /></div>
              <div><label style={lbl}>DATE OF BIRTH (optional)</label><input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} style={inp} /></div>
              <div>
                <label style={lbl}>AVATAR COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, avatar_color: c })} style={{ width: '32px', height: '32px', borderRadius: '8px', background: c, border: form.avatar_color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
