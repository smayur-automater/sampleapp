'use client'
import {
  BoltIcon,
  CheckIcon,
  LockClosedIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'

import { logAudit } from '@/lib/audit'

interface Category { id: string; name: string; color: string; icon: string }
interface SplitRule {
  id: string; category_id: string; split_pct: number; is_optional: boolean
  category?: Category
}
interface Usage { plan: 'free' | 'premium' }

const PRESETS = [
  { label: '50 / 50', value: 50 },
  { label: '60 / 40', value: 60 },
  { label: '70 / 30', value: 70 },
  { label: '100 / 0', value: 100 },
  { label: '0 / 100', value: 0 },
]

const INP: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, background: '#f8fafc',
  outline: 'none', color: '#0f172a', boxSizing: 'border-box',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b',
  marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
}

export default function RulesPage() {
  const { ctx, loading: ctxLoading } = useHousehold()
  const [categories, setCategories] = useState<Category[]>([])
  const [rules,      setRules]      = useState<SplitRule[]>([])
  const [usage,      setUsage]      = useState<Usage | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [modal,      setModal]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')
  const [toast,      setToast]      = useState('')

  // New rule form
  const [form, setForm] = useState({
    category_id: '',
    split_pct: 50,
    is_optional: false,
  })
  const F = (k: Partial<typeof form>) => setForm(p => ({ ...p, ...k }))

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  useEffect(() => { if (ctx) load() }, [ctx]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!ctx) return
    setLoading(true)
    const [cats, rulesRes, usageRes] = await Promise.all([
      supabase.from('categories').select('id,name,color,icon').eq('household_id', ctx.household_id).order('name'),
      supabase.from('split_rules').select('id,category_id,split_pct,is_optional').eq('household_id', ctx.household_id),
      supabase.rpc('get_my_usage'),
    ])
    const catData = cats.data ?? []
    const ruleData = (rulesRes.data ?? []).map((r: any) => ({
      ...r,
      category: catData.find(c => c.id === r.category_id),
    }))
    setCategories(catData)
    setRules(ruleData)
    setUsage(usageRes.data as Usage | null)
    setLoading(false)
  }

  async function saveRule() {
    if (!form.category_id) { setErr('Select a category'); return }
    if (!ctx) return
    setSaving(true); setErr('')

    // Upsert — replace existing rule for this category
    const { error } = await supabase.from('split_rules').upsert({
      household_id: ctx.household_id,
      category_id:  form.category_id,
      split_pct:    form.split_pct,
      is_optional:  form.is_optional,
      created_by:   ctx.myUserId,
    }, { onConflict: 'household_id,category_id' })

    setSaving(false)
    if (error) { setErr(error.message); return }

    const catName = categories.find(c => c.id === form.category_id)?.name ?? ''
    await logAudit({
      household_id: ctx.household_id,
      user_id:      ctx.myUserId,
      actor_name:   me?.display_name ?? 'Unknown',
      action:       'category.edit',
      entity:       catName,
      detail:       form.is_optional ? 'Marked as optional' : `Auto-split rule: ${form.split_pct}/${100 - form.split_pct}`,
    })

    setModal(false)
    showToast('Rule saved')
    load()
  }

  async function deleteRule(rule: SplitRule) {
    if (!ctx) return
    await supabase.from('split_rules').delete().eq('id', rule.id)
    await logAudit({
      household_id: ctx.household_id,
      user_id:      ctx.myUserId,
      actor_name:   me?.display_name ?? 'Unknown',
      action:       'category.edit',
      entity:       rule.category?.name ?? '',
      detail:       'Split rule removed',
    })
    showToast('Rule removed')
    load()
  }

  function openAdd() {
    const usedIds = rules.map(r => r.category_id)
    const first = categories.find(c => !usedIds.includes(c.id))
    setForm({ category_id: first?.id ?? '', split_pct: 50, is_optional: false })
    setErr('')
    setModal(true)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const availableCategories = categories.filter(c => !rules.find(r => r.category_id === c.id))
  const isPremium = usage?.plan === 'premium'

  if (ctxLoading || loading) return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BoltIcon style={{ width: 20, height: 20, color: "#d97706" }}/>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Smart Rules</h1>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#d97706' }}>
                <StarIcon style={{ width: 10, height: 10 }}/> Premium
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Auto-apply split rules when adding expenses by category</p>
          </div>
          {isPremium && availableCategories.length > 0 && (
            <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <PlusIcon strokeWidth={2.5} style={{ width: 14, height: 14 }}/> Add rule
            </button>
          )}
        </div>

        {/* Premium gate */}
        {!isPremium && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '20px 18px', marginBottom: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <LockClosedIcon style={{  marginTop: 2, flexShrink: 0, width: 18, height: 18, color: "#d97706" }}/>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e', marginBottom: 6 }}>Premium feature</div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                  Smart Rules automatically set the split percentage when you pick a category — no manual adjustments needed.
                  <br /><br />
                  <strong>Examples:</strong><br />
                  • Medical → always 50/50<br />
                  • School → 70% you, 30% co-parent<br />
                  • Clothing → mark as optional (no obligation)
                  <br /><br />
                  Ask your admin to upgrade your account to Premium.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <CheckIcon style={{  marginTop: 1, flexShrink: 0, width: 15, height: 15, color: "#059669" }}/>
          <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.6 }}>
            When you add a new expense, the split slider will <strong>automatically jump</strong> to the rule for that category. Rules are shared with your co-parent.
          </div>
        </div>

        {/* Rules list */}
        {rules.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <BoltIcon style={{  margin: '0 auto 12px', display: 'block', width: 32, height: 32, color: "#e2e8f0" }}/>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#334155', marginBottom: 6 }}>No rules yet</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Add a rule for each category that has an agreed split</div>
            {isPremium && availableCategories.length > 0 && (
              <button onClick={openAdd} style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Add first rule
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              {rules.length} {rules.length === 1 ? 'rule' : 'rules'} active
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {rules.map(rule => (
                <div key={rule.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Category colour dot */}
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: (rule.category?.color ?? '#2563eb') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: rule.category?.color ?? '#2563eb' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{rule.category?.name ?? 'Unknown'}</div>
                    {rule.is_optional ? (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', background: '#f1f5f9', borderRadius: 99, fontWeight: 600, color: '#475569' }}>
                          Optional — no obligation
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                        <span style={{ fontWeight: 600, color: me?.color ?? '#2563eb' }}>{me?.display_name ?? 'You'}</span>
                        <span style={{ margin: '0 4px' }}>pays</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{rule.split_pct}%</span>
                        <span style={{ margin: '0 4px' }}>·</span>
                        <span style={{ fontWeight: 600, color: co?.color ?? '#d97706' }}>{co?.display_name ?? 'Co-parent'}</span>
                        <span style={{ margin: '0 4px' }}>pays</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{100 - rule.split_pct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Split bar visual */}
                  {!rule.is_optional && (
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: '#f1f5f9' }}>
                        <div style={{ width: `${rule.split_pct}%`, background: me?.color ?? '#2563eb' }} />
                        <div style={{ flex: 1, background: co?.color ?? '#d97706' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                        <span style={{ fontSize: 9, color: me?.color ?? '#2563eb', fontWeight: 700 }}>{rule.split_pct}%</span>
                        <span style={{ fontSize: 9, color: co?.color ?? '#d97706', fontWeight: 700 }}>{100 - rule.split_pct}%</span>
                      </div>
                    </div>
                  )}

                  {isPremium && (
                    <button onClick={() => deleteRule(rule)}
                      style={{ padding: 7, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                      <TrashIcon style={{ width: 13, height: 13, color: "#dc2626" }}/>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isPremium && availableCategories.length > 0 && (
              <button onClick={openAdd} style={{ width: '100%', marginTop: 12, padding: '10px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <PlusIcon style={{ width: 14, height: 14 }}/> Add another rule
              </button>
            )}
          </>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Add split rule</h3>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: "#64748b" }}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={LBL}>Category</label>
                <select value={form.category_id} onChange={e => F({ category_id: e.target.value })} style={{ ...INP, cursor: 'pointer' }}>
                  <option value="">Select category…</option>
                  {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Optional toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>Optional expense</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>No split obligation — mark for awareness only</div>
                </div>
                <button type="button" onClick={() => F({ is_optional: !form.is_optional })}
                  style={{ width: 44, height: 26, borderRadius: 13, background: form.is_optional ? '#2563eb' : '#e2e8f0', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.is_optional ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              {!form.is_optional && (
                <div>
                  <label style={LBL}>
                    Split — {me?.display_name ?? 'You'}: <strong>{form.split_pct}%</strong> · {co?.display_name ?? 'Co-parent'}: <strong>{100 - form.split_pct}%</strong>
                  </label>

                  {/* Quick presets */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {PRESETS.map(p => (
                      <button key={p.value} type="button" onClick={() => F({ split_pct: p.value })}
                        style={{ padding: '5px 11px', border: form.split_pct === p.value ? '1.5px solid #2563eb' : '1px solid #e2e8f0', borderRadius: 8, background: form.split_pct === p.value ? '#eff6ff' : '#f8fafc', color: form.split_pct === p.value ? '#2563eb' : '#64748b', fontSize: 12, fontWeight: form.split_pct === p.value ? 700 : 500, cursor: 'pointer' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Slider */}
                  <input type="range" min="0" max="100" step="1"
                    value={form.split_pct} onChange={e => F({ split_pct: parseInt(e.target.value) })}
                    style={{ width: '100%', accentColor: '#2563eb' }} />

                  {/* Split bar preview */}
                  <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', marginTop: 8, background: '#f1f5f9' }}>
                    <div style={{ width: `${form.split_pct}%`, background: me?.color ?? '#2563eb', transition: 'width 0.1s' }} />
                    <div style={{ flex: 1, background: co?.color ?? '#d97706', transition: 'flex 0.1s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, fontWeight: 600 }}>
                    <span style={{ color: me?.color ?? '#2563eb' }}>{me?.display_name ?? 'You'} {form.split_pct}%</span>
                    <span style={{ color: co?.color ?? '#d97706' }}>{co?.display_name ?? 'Co-parent'} {100 - form.split_pct}%</span>
                  </div>
                </div>
              )}

              {err && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{err}</div>}

              <button onClick={saveRule} disabled={saving || !form.category_id}
                style={{ padding: 13, background: saving || !form.category_id ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving || !form.category_id ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#0f172a', color: '#fff', padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckIcon style={{ width: 13, height: 13 }}/> {toast}
        </div>
      )}
    </Shell>
  )
}
