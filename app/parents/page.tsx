'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

interface Parent { id: string; name: string; color: string; role: 'me' | 'coparent' }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#475569']

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ role: 'me' | 'coparent' } | null>(null)
  const [form, setForm] = useState({ name: '', color: '#2563eb' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('parents').select('*').eq('user_id', user.id)
    setParents(data ?? []); setLoading(false)
  }

  function openModal(role: 'me' | 'coparent') {
    const existing = parents.find(p => p.role === role)
    setForm({
      name: existing?.name ?? (role === 'me' ? '' : ''),
      color: existing?.color ?? (role === 'me' ? '#2563eb' : '#d97706'),
    })
    setModal({ role })
  }

  async function save() {
    if (!modal || !form.name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    const existing = parents.find(p => p.role === modal.role)
    if (existing) {
      await supabase.from('parents').update({ name: form.name, color: form.color }).eq('id', existing.id)
    } else {
      await supabase.from('parents').insert({ user_id: user.id, name: form.name, color: form.color, role: modal.role })
    }
    setSaving(false); setModal(null); load()
  }

  const me = parents.find(p => p.role === 'me')
  const co = parents.find(p => p.role === 'coparent')

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>Parents</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>The two people sharing expenses</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ParentCard label="YOU" parent={me} onClick={() => openModal('me')} placeholder="Add yourself" />
            <ParentCard label="CO-PARENT" parent={co} onClick={() => openModal('coparent')} placeholder="Add your co-parent" />
          </div>
        )}

        <div style={{ marginTop: '32px', padding: '16px', background: '#eff6ff', borderRadius: '12px', fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
          💡 Once both parents are set, every new expense lets you mark who paid. The dashboard then shows who owes whom.
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{modal.role === 'me' ? 'Your name' : 'Co-parent'}</h3>
              <button onClick={() => setModal(null)} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '28px' }}>
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div><label style={lbl}>NAME</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={modal.role === 'me' ? 'Your name' : "Co-parent's name"} style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: '36px', height: '36px', borderRadius: '10px', background: c, border: form.color === c ? '3px solid #0f172a' : '3px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

function ParentCard({ label, parent, onClick, placeholder }: { label: string; parent?: Parent; onClick: () => void; placeholder: string }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: parent?.color ?? '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: parent ? '#fff' : '#94a3b8', fontWeight: '700', fontSize: '20px', flexShrink: 0 }}>
        {parent ? parent.name[0].toUpperCase() : '+'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontWeight: parent ? '700' : '500', fontSize: '16px', color: parent ? '#0f172a' : '#94a3b8', marginTop: '3px' }}>
          {parent?.name ?? placeholder}
        </div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  )
}
