'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import {
  Heart, BookOpen, Activity, MapPin, Plane, Smile,
  ShoppingBag, Utensils, Music, Palette, Monitor,
  Plus, X, Pencil, Trash2, Tag, Stethoscope, GraduationCap
} from 'lucide-react'

interface Category { id: string; name: string; icon: string; color: string; created_by: string | null }

// Professional icon map using Lucide
const ICONS: Record<string, { Icon: React.ElementType; label: string }> = {
  heart:        { Icon: Heart,          label: 'Medical' },
  stethoscope:  { Icon: Stethoscope,    label: 'Health' },
  book:         { Icon: BookOpen,       label: 'School' },
  graduation:   { Icon: GraduationCap,  label: 'Education' },
  activity:     { Icon: Activity,       label: 'Sports' },
  'map-pin':    { Icon: MapPin,         label: 'Excursions' },
  plane:        { Icon: Plane,          label: 'Travel' },
  smile:        { Icon: Smile,          label: 'Dental' },
  'shopping-bag': { Icon: ShoppingBag,  label: 'Clothing' },
  utensils:     { Icon: Utensils,       label: 'Food' },
  music:        { Icon: Music,          label: 'Music' },
  palette:      { Icon: Palette,        label: 'Arts' },
  monitor:      { Icon: Monitor,        label: 'Tech' },
  tag:          { Icon: Tag,            label: 'Other' },
}

const COLORS = [
  { hex: '#1e3a5f', label: 'Navy' },
  { hex: '#0d5c4d', label: 'Teal' },
  { hex: '#3730a3', label: 'Indigo' },
  { hex: '#6b21a8', label: 'Purple' },
  { hex: '#7f1d1d', label: 'Crimson' },
  { hex: '#1e3a8a', label: 'Blue' },
  { hex: '#064e3b', label: 'Forest' },
  { hex: '#374151', label: 'Slate' },
]

const DEFAULT_CATEGORIES = [
  { name: 'Medical',    icon: 'heart',        color: '#7f1d1d' },
  { name: 'School',     icon: 'book',         color: '#1e3a5f' },
  { name: 'Sports',     icon: 'activity',     color: '#0d5c4d' },
  { name: 'Excursions', icon: 'map-pin',      color: '#3730a3' },
  { name: 'Travel',     icon: 'plane',        color: '#1e3a8a' },
  { name: 'Dental',     icon: 'smile',        color: '#6b21a8' },
  { name: 'Clothing',   icon: 'shopping-bag', color: '#374151' },
  { name: 'Food',       icon: 'utensils',     color: '#064e3b' },
  { name: 'Other',      icon: 'tag',          color: '#374151' },
]

const EMPTY = { name: '', icon: 'tag', color: '#374151' }

function CategoryIcon({ iconKey, color, size = 18 }: { iconKey: string; color: string; size?: number }) {
  const entry = ICONS[iconKey] ?? ICONS['tag']
  const { Icon } = entry
  return (
    <div style={{ width: size + 16, height: size + 16, borderRadius: size / 2 + 4, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={size} color={color} strokeWidth={1.8} />
    </div>
  )
}

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
    const cats = data ?? []
    // Seed defaults if empty
    if (cats.length === 0) {
      const { data: inserted } = await supabase.from('categories')
        .insert(DEFAULT_CATEGORIES.map(d => ({ ...d, household_id: ctx.household_id, created_by: ctx.myUserId })))
        .select()
      setCats(inserted ?? [])
    } else {
      setCats(cats)
    }
    setLoading(false)
  }

  function openAdd()         { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(c: Category) { setEditing(c); setForm({ name: c.name, icon: c.icon, color: c.color }); setModal(true) }

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
    if (!confirm('Delete this category?')) return
    await supabase.from('categories').delete().eq('id', id); load()
  }

  const inp: React.CSSProperties = { width:'100%', padding:'10px 14px', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:14, background:'var(--slate-50)', outline:'none', color:'var(--slate-900)' }
  const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:5, display:'block', letterSpacing:'0.06em', textTransform:'uppercase' as const }

  return (
    <Shell>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--slate-900)', letterSpacing:'-0.5px' }}>Categories</h1>
            <p style={{ fontSize:13, color:'var(--slate-500)', marginTop:2 }}>{cats.length} categories</p>
          </div>
          <button onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <Plus size={14} strokeWidth={2.5} /> Add
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:48, color:'var(--slate-400)' }}>Loading…</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {cats.map(cat => {
              const isOwner = cat.created_by === ctx?.myUserId
              return (
                <div key={cat.id} style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', padding:'14px 14px 12px', boxShadow:'var(--shadow-sm)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <CategoryIcon iconKey={cat.icon} color={cat.color} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--slate-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cat.name}</div>
                      <div style={{ width:20, height:2, background:cat.color, borderRadius:1, marginTop:4 }} />
                    </div>
                  </div>
                  {isOwner ? (
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={() => openEdit(cat)} style={{ flex:1, padding:'6px 0', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, color:'var(--slate-500)', fontWeight:500 }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => del(cat.id)} style={{ flex:1, padding:'6px 0', background:'var(--red-light)', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, color:'var(--red)', fontWeight:500 }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize:11, color:'var(--slate-400)', fontStyle:'italic', textAlign:'center', paddingTop:2 }}>Added by co-parent</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background:'var(--white)', borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:640, maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:17, fontWeight:700 }}>{editing ? 'Edit category' : 'New category'}</h3>
              <button onClick={() => setModal(false)} style={{ width:32, height:32, background:'var(--slate-100)', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15} color="var(--slate-500)" />
              </button>
            </div>

            {/* Preview */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <CategoryIcon iconKey={form.icon} color={form.color} size={24} />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label style={lbl}>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" style={inp} autoFocus /></div>

              <div>
                <label style={lbl}>Icon</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6 }}>
                  {Object.entries(ICONS).map(([key, { Icon, label }]) => (
                    <button key={key} type="button" title={label} onClick={() => setForm({ ...form, icon: key })}
                      style={{ padding:'10px 0', background: form.icon === key ? 'var(--blue-light)' : 'var(--slate-50)', border: form.icon === key ? '1.5px solid var(--blue)' : '1px solid var(--slate-200)', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={17} color={form.icon === key ? 'var(--blue)' : 'var(--slate-400)'} strokeWidth={1.8} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Color</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c.hex} type="button" title={c.label} onClick={() => setForm({ ...form, color: c.hex })}
                      style={{ width:32, height:32, borderRadius:9, background:c.hex, border: form.color === c.hex ? '3px solid var(--slate-900)' : '2px solid transparent', cursor:'pointer' }} />
                  ))}
                </div>
              </div>

              <button onClick={save} disabled={saving || !form.name.trim()}
                style={{ padding:13, background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:'pointer', opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
