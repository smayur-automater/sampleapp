'use client'
import {
  BoltIcon, CheckIcon, LockClosedIcon, PlusIcon, StarIcon, TrashIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { logAudit } from '@/lib/audit'

interface Category { id: string; name: string; color: string; icon: string }
interface Kid      { id: string; name: string; color: string }
interface SplitRule {
  id: string
  category_id: string | null
  kid_id: string | null
  split_pct: number
  is_optional: boolean
  category?: Category
  kid?: Kid
}
interface Usage { plan: 'free' | 'premium' }

const PRESETS = [
  { label: '50 / 50', value: 50 },
  { label: '60 / 40', value: 60 },
  { label: '70 / 30', value: 70 },
  { label: '100 / 0', value: 100 },
  { label: '0 / 100', value: 0 },
]

const INP: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' as const }

export default function RulesPage() {
  const { ctx, loading: ctxLoading } = useHousehold()
  const [categories, setCategories] = useState<Category[]>([])
  const [kids,       setKids]       = useState<Kid[]>([])
  const [rules,      setRules]      = useState<SplitRule[]>([])
  const [usage,      setUsage]      = useState<Usage | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [modal,      setModal]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')
  const [toast,      setToast]      = useState('')
  const [ruleType,   setRuleType]   = useState<'category'|'kid'>('category')

  const [form, setForm] = useState({ category_id: '', kid_id: '', split_pct: 50, is_optional: false })
  const F = (k: Partial<typeof form>) => setForm(p => ({ ...p, ...k }))

  useEffect(() => { if (ctx) load() }, [ctx]) // eslint-disable-line

  async function load() {
    if (!ctx) return
    setLoading(true)
    const [cats, kidsRes, rulesRes, usageRes] = await Promise.all([
      supabase.from('categories').select('id,name,color,icon').eq('household_id', ctx.household_id).order('name'),
      supabase.from('kids').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
      supabase.from('split_rules').select('id,category_id,kid_id,split_pct,is_optional').eq('household_id', ctx.household_id),
      supabase.rpc('get_my_usage'),
    ])
    const catList  = cats.data ?? []
    const kidList  = kidsRes.data ?? []
    setCategories(catList)
    setKids(kidList)
    setUsage(usageRes.data as Usage | null)

    // Hydrate rules with category/kid names
    const hydrated: SplitRule[] = (rulesRes.data ?? []).map((r: any) => ({
      ...r,
      category: r.category_id ? catList.find((c: Category) => c.id === r.category_id) : undefined,
      kid:      r.kid_id      ? kidList.find((k: Kid) => k.id === r.kid_id)            : undefined,
    }))
    setRules(hydrated)
    setLoading(false)
  }

  function openModal(type: 'category' | 'kid') {
    setRuleType(type)
    setForm({ category_id: '', kid_id: '', split_pct: 50, is_optional: false })
    setErr('')
    setModal(true)
  }

  async function save() {
    if (ruleType === 'category' && !form.category_id) { setErr('Select a category'); return }
    if (ruleType === 'kid' && !form.kid_id)           { setErr('Select a child'); return }
    if (!ctx) return
    setSaving(true); setErr('')

    const payload: any = {
      household_id: ctx.household_id,
      split_pct:    form.split_pct,
      is_optional:  form.is_optional,
      category_id:  ruleType === 'category' ? form.category_id : null,
      kid_id:       ruleType === 'kid'      ? form.kid_id      : null,
    }

    const { error } = await supabase.from('split_rules').insert(payload)
    setSaving(false)
    if (error) {
      if (error.code === '23505') setErr('A rule for this ' + ruleType + ' already exists')
      else setErr(error.message)
      return
    }

    const entityName = ruleType === 'category'
      ? categories.find(c => c.id === form.category_id)?.name ?? ''
      : kids.find(k => k.id === form.kid_id)?.name ?? ''
    const me = ctx.members.find(m => m.user_id === ctx.myUserId)
    await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: me?.display_name ?? 'Unknown', action: 'rule.add', entity: entityName, detail: `${form.split_pct}/${100 - form.split_pct} split` })

    setModal(false); load(); showToast('Rule saved')
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?') || !ctx) return
    await supabase.from('split_rules').delete().eq('id', id)
    load(); showToast('Rule deleted')
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const isPremium = usage?.plan === 'premium'
  const categoryRules = rules.filter(r => r.category_id)
  const kidRules      = rules.filter(r => r.kid_id)

  const availableCategories = categories.filter(c => !categoryRules.some(r => r.category_id === c.id))
  const availableKids       = kids.filter(k => !kidRules.some(r => r.kid_id === k.id))

  if (ctxLoading) return <Shell><div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}><div style={{ width:28, height:28, border:'2px solid #e2e8f0', borderTopColor:'#0f172a', borderRadius:'50%', animation:'spin .7s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0 }}>Expense Rules</h1>
              {isPremium && <span style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 8px', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:99, fontSize:11, fontWeight:700, color:'#d97706' }}><StarIcon style={{ width:10, height:10 }}/> Premium</span>}
            </div>
            <p style={{ fontSize:13, color:'#64748b', margin:0 }}>Auto-apply split percentages by category or child</p>
          </div>
          {isPremium && (
            <div style={{ display:'flex', gap:8 }}>
              {availableCategories.length > 0 && (
                <button onClick={() => openModal('category')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#0f172a', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  <PlusIcon style={{ width:14, height:14 }} strokeWidth={2.5}/> Category rule
                </button>
              )}
              {availableKids.length > 0 && (
                <button onClick={() => openModal('kid')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#1a3a6b', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  <PlusIcon style={{ width:14, height:14 }} strokeWidth={2.5}/> Kid rule
                </button>
              )}
            </div>
          )}
        </div>

        {!isPremium && (
          <div style={{ background:'#1a3a6b', border:'1px solid #1a3a6b', borderRadius:16, padding:'24px', marginBottom:20, textAlign:'center' }}>
            <LockClosedIcon style={{ width:28, height:28, color:'rgba(255,255,255,0.5)', margin:'0 auto 10px', display:'block' }} />
            <div style={{ fontSize:17, fontWeight:800, color:'#fff', marginBottom:8 }}>Premium feature</div>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginBottom:16, lineHeight:1.6 }}>
              Expense Rules automatically apply your agreed split percentages whenever you add an expense for a specific category or child.
            </p>
            <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'14px 16px', marginBottom:16, textAlign:'left' }}>
              {['Set 70/30 split for Medical expenses', 'Apply 100% to one parent for School', 'Mark optional expenses per child', 'Rules auto-apply when adding expenses'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <CheckIcon style={{ width:14, height:14, color:'#2ec4a0', flexShrink:0 }} />
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.85)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isPremium && loading && <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>Loading…</div>}

        {isPremium && !loading && (<>

          {/* Category rules */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>
              Category rules ({categoryRules.length})
            </div>
            {categoryRules.length === 0
              ? <div style={{ background:'#fff', border:'2px dashed #e2e8f0', borderRadius:14, padding:'28px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No category rules yet — click &ldquo;Category rule&rdquo; to add one</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {categoryRules.map(rule => <RuleCard key={rule.id} rule={rule} onDelete={() => deleteRule(rule.id)} label={rule.category?.name ?? '—'} dotColor={rule.category?.color ?? '#94a3b8'} />)}
                </div>
            }
          </div>

          {/* Kid rules */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>
              Child rules ({kidRules.length})
            </div>
            {kidRules.length === 0
              ? <div style={{ background:'#fff', border:'2px dashed #e2e8f0', borderRadius:14, padding:'28px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No child rules yet — click &ldquo;Kid rule&rdquo; to add one</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {kidRules.map(rule => <RuleCard key={rule.id} rule={rule} onDelete={() => deleteRule(rule.id)} label={rule.kid?.name ?? '—'} dotColor={rule.kid?.color ?? '#94a3b8'} />)}
                </div>
            }
          </div>

          {/* How it works */}
          <div style={{ background:'#eff6ff', border:'1px solid #dbeafe', borderRadius:13, padding:'13px 15px', marginTop:20, fontSize:13, color:'#1e40af', lineHeight:1.65 }}>
            <strong>How rules work:</strong> When you add an expense, selecting a child or category with a rule automatically applies its split percentage. Category rules take precedence over child rules if both match.
          </div>
        </>)}
      </div>

      {/* Modal */}
      {modal && (
        <div onClick={e => e.target===e.currentTarget && setModal(false)} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'0 0 32px', width:'100%', maxWidth:480 }}>
            <div style={{ width:36, height:4, background:'#e2e8f0', borderRadius:2, margin:'14px auto 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 22px 0' }}>
              <h3 style={{ fontSize:18, fontWeight:800, color:'#0f172a', margin:0 }}>
                New {ruleType === 'category' ? 'category' : 'child'} rule
              </h3>
              <button onClick={() => setModal(false)} style={{ width:32, height:32, background:'#f1f5f9', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <XMarkIcon style={{ width:16, height:16, color:'#64748b' }} />
              </button>
            </div>
            <div style={{ padding:'16px 22px 0', display:'flex', flexDirection:'column', gap:16 }}>

              {ruleType === 'category' ? (
                <div>
                  <label style={LBL}>Category</label>
                  <select value={form.category_id} onChange={e => F({ category_id: e.target.value })} style={{ ...INP, cursor:'pointer' }} autoFocus>
                    <option value="">Select category…</option>
                    {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={LBL}>Child</label>
                  <select value={form.kid_id} onChange={e => F({ kid_id: e.target.value })} style={{ ...INP, cursor:'pointer' }} autoFocus>
                    <option value="">Select child…</option>
                    {availableKids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
              )}

              {/* Optional toggle */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f8fafc', borderRadius:10, cursor:'pointer' }} onClick={() => F({ is_optional: !form.is_optional })}>
                <div style={{ width:38, height:22, borderRadius:11, background:form.is_optional ? '#0f172a' : '#e2e8f0', position:'relative', transition:'background .2s', flexShrink:0 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:form.is_optional ? 19 : 3, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>Mark as optional expense</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>Flagged as discretionary — still tracked but highlighted</div>
                </div>
              </div>

              {/* Split */}
              {!form.is_optional && (<>
                <div>
                  <label style={LBL}>Quick presets</label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {PRESETS.map(p => (
                      <button key={p.value} type="button" onClick={() => F({ split_pct: p.value })}
                        style={{ padding:'6px 12px', border:form.split_pct===p.value ? '2px solid #0f172a' : '1px solid #e2e8f0', borderRadius:8, background:form.split_pct===p.value ? '#0f172a' : '#f8fafc', color:form.split_pct===p.value ? '#fff' : '#64748b', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={LBL}>Custom split: <strong>{form.split_pct}%</strong> / <strong>{100 - form.split_pct}%</strong></label>
                  <input type="range" min={0} max={100} step={1} value={form.split_pct} onChange={e => F({ split_pct: parseInt(e.target.value) })} style={{ width:'100%', accentColor:'#0f172a' }} />
                </div>
              </>)}

              {err && <div style={{ padding:'9px 12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, fontSize:13, color:'#dc2626' }}>{err}</div>}

              <button onClick={save} disabled={saving}
                style={{ padding:14, background:saving ? '#94a3b8' : '#0f172a', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <BoltIcon style={{ width:16, height:16 }} /> {saving ? 'Saving…' : 'Save rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:500, background:'#0f172a', color:'#fff', padding:'10px 18px', borderRadius:99, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7, boxShadow:'0 4px 12px rgba(0,0,0,0.2)' }}>
          <CheckIcon style={{ width:14, height:14, color:'#4ade80' }} /> {toast}
        </div>
      )}
    </Shell>
  )
}

function RuleCard({ rule, onDelete, label, dotColor }: { rule: SplitRule; onDelete: () => void; label: string; dotColor: string }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:10, height:10, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>{label}</div>
        <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
          {rule.is_optional
            ? <span style={{ color:'#d97706', fontWeight:600 }}>Optional expense</span>
            : <span><strong style={{ color:'#0f172a' }}>{rule.split_pct}%</strong> / <strong style={{ color:'#64748b' }}>{100 - rule.split_pct}%</strong> split</span>
          }
        </div>
      </div>
      <div style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
        <span style={{ padding:'2px 8px', background: rule.is_optional ? '#fffbeb' : '#f0fdf4', border:`1px solid ${rule.is_optional ? '#fde68a' : '#bbf7d0'}`, borderRadius:99, fontSize:11, fontWeight:600, color:rule.is_optional ? '#d97706' : '#059669' }}>
          {rule.is_optional ? 'Optional' : `${rule.split_pct}/${100 - rule.split_pct}`}
        </span>
        <button onClick={onDelete} style={{ width:28, height:28, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <TrashIcon style={{ width:12, height:12, color:'#dc2626' }} />
        </button>
      </div>
    </div>
  )
}
