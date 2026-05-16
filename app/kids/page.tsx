'use client'
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { logAudit } from '@/lib/audit'

interface Kid { id: string; name: string; dob: string | null; color: string; gender: string; created_by: string | null }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#374151','#db2777']
const GENDERS = ['Boy','Girl','Non-binary','Unknown']

const GENDER_ICON: Record<string, string> = { Boy: '👦', Girl: '👧', 'Non-binary': '🧒', Unknown: '👶' }
const GENDER_COLOR: Record<string, string> = { Boy: '#2563eb', Girl: '#db2777', 'Non-binary': '#7c3aed', Unknown: '#94a3b8' }

const INP: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', appearance: 'auto' }
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
  const [form,    setForm]    = useState({ name: '', dob: '', color: COLORS[0], gender: 'Unknown' })
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
    setKids((data ?? []).map((k: Record<string,any>) => ({ id:k.id, name:k.name, dob:k.dob??null, color:k.color??'#475569', gender:k.gender??'Unknown', created_by:k.created_by??null })))
    setLoading(false)
  }, [ctx])

  useEffect(() => { if (ctx) load() }, [ctx, load])

  function openAdd() { setEditing(null); setForm({ name: '', dob: '', color: COLORS[0], gender: 'Unknown' }); setErr(''); setModal(true) }
  function openEdit(k: Kid) { setEditing(k); setForm({ name: k.name, dob: k.dob ?? '', color: k.color, gender: k.gender ?? 'Unknown' }); setErr(''); setModal(true) }

  async function save() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    if (!ctx) { setErr('Not connected'); return }
    setSaving(true); setErr('')

    if (editing) {
      const { error } = await supabase.from('kids')
        .update({ name: form.name.trim(), dob: form.dob || null, color: form.color, gender: form.gender })
        .eq('id', editing.id)
      if (error) { setErr(error.message); setSaving(false); return }
      await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: ctx.members.find(m => m.user_id === ctx.myUserId)?.display_name ?? 'Unknown', action: 'kid.edit', entity: form.name.trim() })
    } else {
      const { error } = await supabase.from('kids')
        .insert({ name: form.name.trim(), dob: form.dob || null, color: form.color, gender: form.gender, household_id: ctx.household_id, created_by: ctx.myUserId })
      if (error) { setErr(error.message); setSaving(false); return }
      await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: ctx.members.find(m => m.user_id === ctx.myUserId)?.display_name ?? 'Unknown', action: 'kid.add', entity: form.name.trim() })
    }

    setSaving(false); setModal(false); load()
  }

  async function del(k: Kid) {
    if (!confirm(`Delete ${k.name}? Their expenses will remain but won't be linked to them.`)) return
    const { error } = await supabase.from('kids').delete().eq('id', k.id)
    if (error) { alert(error.message); return }
    load()
  }

  if (ctxLoading) return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}><div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>
  if (ctxError) return <Shell><div style={{ padding: 24, textAlign: 'center' }}><p style={{ color: '#dc2626', marginBottom: 12 }}>{ctxError}</p><button onClick={reloadCtx} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button></div></Shell>

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Children</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{kids.length} {kids.length === 1 ? 'child' : 'children'} · shared with both parents</p>
          </div>
          <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <PlusIcon strokeWidth={2.5} style={{ width: 15, height: 15 }} /> Add child
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</div>
        ) : kids.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👶</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#334155', marginBottom: 6 }}>No children yet</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Add a profile for each child to track their expenses</div>
            <button onClick={openAdd} style={{ padding: '9px 18px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Add first child</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kids.map(kid => {
              const kidAge = age(kid.dob)
              const isOwner = kid.created_by === ctx?.myUserId
              const gender = kid.gender ?? 'Unknown'
              return (
                <div key={kid.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Avatar */}
                  <div style={{ width: 54, height: 54, borderRadius: 15, background: kid.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0, position: 'relative' }}>
                    {kid.name[0].toUpperCase()}
                    {/* Gender badge */}
                    <div style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      {GENDER_ICON[gender]}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{kid.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      {/* Gender pill */}
                      <span style={{ fontSize: 11, fontWeight: 700, color: GENDER_COLOR[gender], background: GENDER_COLOR[gender] + '15', padding: '2px 8px', borderRadius: 99, border: `1px solid ${GENDER_COLOR[gender]}30` }}>
                        {GENDER_ICON[gender]} {gender}
                      </span>
                      {/* Age / DOB */}
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {kidAge !== null ? `${kidAge} yrs old` : kid.dob ? new Date(kid.dob).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No birthday set'}
                      </span>
                    </div>
                  </div>

                  {(isOwner || true) ? ( // any household member can edit kids
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(kid)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 600 }}>
                        <PencilIcon style={{ width: 12, height: 12 }} /> Edit
                      </button>
                      <button onClick={() => del(kid)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                        <TrashIcon style={{ width: 12, height: 12 }} /> Delete
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', flexShrink: 0 }}>Co-parent&apos;s</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 480 }}>

            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{editing ? 'Edit child' : 'Add child'}</h3>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: '#64748b' }} />
              </button>
            </div>

            <div style={{ padding: '16px 22px 0' }}>
              {/* Avatar preview */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <div style={{ width: 68, height: 68, borderRadius: 20, background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28, position: 'relative' }}>
                  {form.name?.[0]?.toUpperCase() || '?'}
                  <div style={{ position: 'absolute', bottom: -5, right: -5, width: 24, height: 24, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: '1px solid #e2e8f0' }}>
                    {GENDER_ICON[form.gender]}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name */}
                <div>
                  <label style={LBL}>Name *</label>
                  <input value={form.name} onChange={e => F({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Child's name" style={INP} autoFocus />
                </div>

                {/* Gender */}
                <div>
                  <label style={LBL}>Gender</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {GENDERS.map(g => (
                      <button key={g} type="button" onClick={() => F({ gender: g })}
                        style={{ padding: '10px 4px', border: form.gender === g ? `2px solid ${GENDER_COLOR[g]}` : '1.5px solid #e2e8f0', borderRadius: 11, background: form.gender === g ? GENDER_COLOR[g] + '12' : '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 20 }}>{GENDER_ICON[g]}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: form.gender === g ? GENDER_COLOR[g] : '#64748b' }}>{g}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DOB */}
                <div>
                  <label style={LBL}>Date of birth (optional)</label>
                  <input type="date" value={form.dob} onChange={e => F({ dob: e.target.value })} style={INP} />
                </div>

                {/* Colour */}
                <div>
                  <label style={LBL}>Colour</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => F({ color: c })}
                        style={{ width: 36, height: 36, borderRadius: 10, background: c, border: form.color === c ? '3px solid #0f172a' : '2.5px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>

                {err && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{err}</div>}

                <button onClick={save} disabled={saving || !form.name.trim()}
                  style={{ padding: 13, background: saving || !form.name.trim() ? '#93c5fd' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add child'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
