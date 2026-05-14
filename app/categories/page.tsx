'use client'
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { CategoryIcon, ICON_OPTIONS } from '@/components/CategoryIcon'

interface Category { id: string; name: string; icon: string; color: string; created_by: string | null }

const COLORS = [
  { hex: '#1a3a6b', label: 'Navy'    },
  { hex: '#0d9488', label: 'Teal'    },
  { hex: '#4f46e5', label: 'Indigo'  },
  { hex: '#7c3aed', label: 'Purple'  },
  { hex: '#dc2626', label: 'Red'     },
  { hex: '#d97706', label: 'Amber'   },
  { hex: '#059669', label: 'Green'   },
  { hex: '#374151', label: 'Slate'   },
  { hex: '#db2777', label: 'Pink'    },
  { hex: '#0891b2', label: 'Cyan'    },
]

const DEFAULT_CATEGORIES = [
  { name: 'Medical',     icon: 'heart',        color: '#dc2626' },
  { name: 'School',      icon: 'academic-cap', color: '#1a3a6b' },
  { name: 'Sports',      icon: 'trophy',       color: '#059669' },
  { name: 'Excursions',  icon: 'map-pin',      color: '#4f46e5' },
  { name: 'Travel',      icon: 'plane',        color: '#0891b2' },
  { name: 'Dental',      icon: 'sparkles',     color: '#7c3aed' },
  { name: 'Clothing',    icon: 'shopping-bag', color: '#374151' },
  { name: 'Food',        icon: 'cake',         color: '#d97706' },
  { name: 'Activities',  icon: 'puzzle',       color: '#db2777' },
  { name: 'Other',       icon: 'tag',          color: '#374151' },
]

const EMPTY = { name: '', icon: 'tag', color: '#374151' }

const INP: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 15, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block', letterSpacing: '0.07em', textTransform: 'uppercase' as const }

export default function CategoriesPage() {
  const { ctx } = useHousehold()
  const [cats,    setCats]    = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { if (ctx) load() }, [ctx])

  async function load() {
    if (!ctx) return
    const { data } = await supabase.from('categories').select('*')
      .eq('household_id', ctx.household_id).order('name')
    const list = data ?? []
    if (list.length === 0) {
      const { data: seeded } = await supabase.from('categories')
        .insert(DEFAULT_CATEGORIES.map(d => ({ ...d, household_id: ctx.household_id, created_by: ctx.myUserId })))
        .select()
      setCats(seeded ?? [])
    } else {
      setCats(list)
    }
    setLoading(false)
  }

  function openAdd()              { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(c: Category)  { setEditing(c); setForm({ name: c.name, icon: c.icon, color: c.color }); setModal(true) }

  async function save() {
    if (!form.name.trim() || !ctx) return
    setSaving(true)
    if (editing) {
      await supabase.from('categories').update({ name: form.name, icon: form.icon, color: form.color }).eq('id', editing.id)
    } else {
      await supabase.from('categories').insert({ household_id: ctx.household_id, name: form.name, icon: form.icon, color: form.color, created_by: ctx.myUserId })
    }
    setSaving(false); setModal(false); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this category? Expenses using it will still exist.')) return
    await supabase.from('categories').delete().eq('id', id); load()
  }

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px', fontFamily: 'system-ui, sans-serif' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Categories</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{cats.length} categories</p>
          </div>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 15px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <PlusIcon style={{ width: 15, height: 15 }} strokeWidth={2.5}/> Add
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {cats.map(cat => {
              const isOwner = cat.created_by === ctx?.myUserId
              return (
                <div key={cat.id} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, padding: '15px 14px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CategoryIcon name={cat.icon} color={cat.color} size={20}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                      <div style={{ width: 18, height: 2.5, background: cat.color, borderRadius: 2, marginTop: 5 }} />
                    </div>
                  </div>
                  {isOwner ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(cat)}
                        style={{ flex: 1, padding: '7px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        <PencilIcon style={{ width: 11, height: 11 }}/> Edit
                      </button>
                      <button onClick={() => del(cat.id)}
                        style={{ flex: 1, padding: '7px 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                        <TrashIcon style={{ width: 11, height: 11 }}/> Delete
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingTop: 2 }}>Added by co-parent</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>

            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{editing ? 'Edit category' : 'New category'}</h3>
              <button onClick={() => setModal(false)}
                style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: '#64748b' }}/>
              </button>
            </div>

            <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Live preview */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: form.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CategoryIcon name={form.icon} color={form.color} size={28}/>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={LBL}>Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Medical, School, Sports…" style={INP} autoFocus />
              </div>

              {/* Icon picker */}
              <div>
                <label style={LBL}>Icon</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                  {ICON_OPTIONS.map(opt => (
                    <button key={opt.name} type="button" title={opt.label}
                      onClick={() => setForm({ ...form, icon: opt.name })}
                      style={{ padding: '10px 0', background: form.icon === opt.name ? '#eff6ff' : '#f8fafc', border: form.icon === opt.name ? '2px solid #1a3a6b' : '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CategoryIcon name={opt.name} color={form.icon === opt.name ? '#1a3a6b' : '#94a3b8'} size={18}/>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label style={LBL}>Colour</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c.hex} type="button" title={c.label}
                      onClick={() => setForm({ ...form, color: c.hex })}
                      style={{ width: 36, height: 36, borderRadius: 11, background: c.hex, border: form.color === c.hex ? '3px solid #0f172a' : '2.5px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>

              <button onClick={save} disabled={saving || !form.name.trim()}
                style={{ padding: 14, background: saving || !form.name.trim() ? '#93c5fd' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
