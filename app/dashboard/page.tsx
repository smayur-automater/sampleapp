'use client'
import { useEffect, useState, useMemo } from 'react'
import Shell from '@/components/Shell'
import { CurrencySelect, CURRENCIES } from '@/components/CurrencySelect'
import { supabase } from '@/lib/supabase'

interface Kid { id: string; name: string; color: string }
interface Category { id: string; name: string; emoji: string; color: string }
interface Parent { id: string; name: string; color: string; role: 'me' | 'coparent' }
interface Expense {
  id: string; description: string; amount: number; currency: string
  date: string; split_pct: number; paid_by_id: string | null
  kid: { id: string; name: string; color: string }
  category: { id: string; name: string; emoji: string; color: string }
}

const EMPTY = { description: '', amount: '', currency: 'AUD', kid_id: '', category_id: '', paid_by_id: '', date: new Date().toISOString().split('T')[0], split_pct: 50 }
const PERIODS = [
  { key: 'all',   label: 'All' },
  { key: 'month', label: 'Month' },
  { key: '90',    label: '90d' },
  { key: 'year',  label: 'Year' },
] as const
type Period = typeof PERIODS[number]['key']

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [kids, setKids] = useState<Kid[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [parents, setParents] = useState<Parent[]>([])
  const [currency, setCurrency] = useState('AUD')
  const [period, setPeriod] = useState<Period>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [e, k, c, p] = await Promise.all([
      supabase.from('expenses').select('*, kid:kids(id,name,color), category:categories(id,name,emoji,color)').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('kids').select('*').eq('user_id', user.id).order('name'),
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
      supabase.from('parents').select('*').eq('user_id', user.id),
    ])

    let categories = c.data ?? []
    if (categories.length === 0) {
      const defaults = [
        { name: 'Medical', emoji: '❤️', color: '#dc2626' }, { name: 'School', emoji: '📚', color: '#2563eb' },
        { name: 'Sports', emoji: '⚽', color: '#059669' }, { name: 'Excursions', emoji: '📍', color: '#d97706' },
        { name: 'Travel', emoji: '✈️', color: '#7c3aed' }, { name: 'Dental', emoji: '😁', color: '#db2777' },
        { name: 'Clothing', emoji: '🛍️', color: '#0891b2' }, { name: 'Food', emoji: '🍽️', color: '#d97706' },
        { name: 'Other', emoji: '🏷️', color: '#475569' },
      ]
      const { data: ins } = await supabase.from('categories').insert(defaults.map(d => ({ ...d, user_id: user.id }))).select()
      categories = ins ?? []
    }

    setExpenses((e.data ?? []) as Expense[])
    setKids(k.data ?? [])
    setCats(categories)
    setParents(p.data ?? [])
    setLoading(false)
  }

  async function addExpense() {
    if (!form.description || !form.amount || !form.kid_id || !form.category_id) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('expenses').insert({
      user_id: user.id, description: form.description, amount: parseFloat(form.amount),
      currency: form.currency, kid_id: form.kid_id, category_id: form.category_id,
      paid_by_id: form.paid_by_id || null, date: form.date, split_pct: form.split_pct,
    })
    setSaving(false); setShowModal(false); setForm(EMPTY); load()
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id); load()
  }

  const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
  const cs = sym(currency)

  const filtered = useMemo(() => {
    const now = new Date()
    return expenses
      .filter(e => e.currency === currency)
      .filter(e => {
        if (period === 'all') return true
        const d = new Date(e.date)
        const diff = (now.getTime() - d.getTime()) / 86400000
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (period === '90')    return diff <= 90
        if (period === 'year')  return d.getFullYear() === now.getFullYear()
        return true
      })
  }, [expenses, currency, period])

  const me = parents.find(p => p.role === 'me')
  const co = parents.find(p => p.role === 'coparent')

  const stats = useMemo(() => {
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0)
    const mine = filtered.reduce((s, e) => s + Number(e.amount) * e.split_pct / 100, 0)
    const theirs = total - mine

    const mePaid = me ? filtered.filter(e => e.paid_by_id === me.id).reduce((s, e) => s + Number(e.amount), 0) : 0
    const coPaid = co ? filtered.filter(e => e.paid_by_id === co.id).reduce((s, e) => s + Number(e.amount), 0) : 0
    const balance = mePaid - mine  // positive = co-parent owes me

    const catTotals: Record<string, { name: string; emoji: string; color: string; amount: number }> = {}
    filtered.forEach(e => {
      const id = e.category?.id
      if (!id) return
      if (!catTotals[id]) catTotals[id] = { name: e.category.name, emoji: e.category.emoji, color: e.category.color, amount: 0 }
      catTotals[id].amount += Number(e.amount)
    })
    const catList = Object.values(catTotals).sort((a, b) => b.amount - a.amount)

    const kidTotals: Record<string, { name: string; color: string; amount: number; count: number }> = {}
    filtered.forEach(e => {
      const id = e.kid?.id
      if (!id) return
      if (!kidTotals[id]) kidTotals[id] = { name: e.kid.name, color: e.kid.color, amount: 0, count: 0 }
      kidTotals[id].amount += Number(e.amount)
      kidTotals[id].count += 1
    })
    const kidList = Object.values(kidTotals).sort((a, b) => b.amount - a.amount)

    return { total, mine, theirs, mePaid, coPaid, balance, catList, kidList }
  }, [filtered, me, co])

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }

  return (
    <Shell>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>Overview</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Shared children expenses</p>
          </div>
          <CurrencySelect value={currency} onChange={setCurrency} compact />
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3px', marginBottom: '18px' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '9px', background: period === p.key ? '#2563eb' : 'transparent', color: period === p.key ? '#fff' : '#64748b', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <Stat label="Total" value={`${cs}${stats.total.toFixed(2)}`} dot="#2563eb" />
          <Stat label={me ? `${me.name}'s share` : 'My share'} value={`${cs}${stats.mine.toFixed(2)}`} dot={me?.color ?? '#059669'} />
          <Stat label={co ? `${co.name}'s share` : 'Their share'} value={`${cs}${stats.theirs.toFixed(2)}`} dot={co?.color ?? '#d97706'} />
        </div>

        {/* Settlement card */}
        {me && co && filtered.length > 0 && Math.abs(stats.balance) > 0.01 && (
          <div style={{ background: stats.balance >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${stats.balance >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: stats.balance >= 0 ? '#059669' : '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {stats.balance >= 0 ? `${co.name} owes ${me.name}` : `${me.name} owes ${co.name}`}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: stats.balance >= 0 ? '#059669' : '#dc2626', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                  {cs}{Math.abs(stats.balance).toFixed(2)}
                </div>
              </div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={stats.balance >= 0 ? '#10b981' : '#ef4444'} strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', borderTop: `1px solid ${stats.balance >= 0 ? '#bbf7d0' : '#fecaca'}`, paddingTop: '8px', marginTop: '4px' }}>
              {me.name} paid {cs}{stats.mePaid.toFixed(2)} · share {cs}{stats.mine.toFixed(2)}
            </div>
          </div>
        )}

        {/* Add button */}
        <button onClick={() => { setForm(EMPTY); setShowModal(true) }} style={{ width: '100%', padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add expense
        </button>

        {/* Who paid */}
        {me && co && filtered.length > 0 && stats.total > 0 && (
          <Section title="WHO PAID">
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '14px', background: '#f1f5f9' }}>
                {stats.mePaid > 0 && <div style={{ width: `${(stats.mePaid / stats.total) * 100}%`, background: me.color, transition: 'width 0.3s' }} />}
                {stats.coPaid > 0 && <div style={{ width: `${(stats.coPaid / stats.total) * 100}%`, background: co.color, transition: 'width 0.3s' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <PayerRow parent={me} paid={stats.mePaid} total={stats.total} cs={cs} />
                <PayerRow parent={co} paid={stats.coPaid} total={stats.total} cs={cs} />
                {filtered.some(e => !e.paid_by_id) && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    {cs}{filtered.filter(e => !e.paid_by_id).reduce((s, e) => s + Number(e.amount), 0).toFixed(2)} unassigned
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* By kid */}
        {stats.kidList.length > 0 && (
          <Section title="SPENDING BY CHILD">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.kidList.map(k => {
                const pct = (k.amount / stats.total) * 100
                return (
                  <div key={k.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px' }}>{k.name[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{k.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{k.count} {k.count === 1 ? 'expense' : 'expenses'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{cs}{k.amount.toFixed(2)}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: k.color, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* By category */}
        {stats.catList.length > 0 && (
          <Section title="SPENDING BY CATEGORY">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {stats.catList.slice(0, 8).map(c => {
                const pct = (c.amount / stats.total) * 100
                return (
                  <div key={c.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '11px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: c.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{c.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{c.name}</div>
                      <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: c.color }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{cs}{c.amount.toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{pct.toFixed(0)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Recent */}
        <Section title="RECENT EXPENSES">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💸</div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>No expenses in this period</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.slice(0, 12).map(exp => {
                const payer = parents.find(p => p.id === exp.paid_by_id)
                return (
                  <div key={exp.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: exp.kid?.color ?? '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                      {exp.kid?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.description}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{exp.category?.emoji} {exp.category?.name}</span>
                        <span>·</span>
                        <span>{new Date(exp.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                        {payer && <>
                          <span>·</span>
                          <span style={{ color: payer.color, fontWeight: '600' }}>{payer.name} paid</span>
                        </>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{sym(exp.currency)}{Number(exp.amount).toFixed(2)}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{exp.split_pct}/{100 - exp.split_pct}</div>
                    </div>
                    <button onClick={() => deleteExpense(exp.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Add expense</h3>
              <button onClick={() => setShowModal(false)} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={lbl}>DESCRIPTION</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. School excursion" style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
                <div><label style={lbl}>AMOUNT</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" step="0.01" style={{ ...inp, fontVariantNumeric: 'tabular-nums' }} /></div>
                <CurrencySelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} compact />
              </div>
              <div><label style={lbl}>CHILD</label>
                <select value={form.kid_id} onChange={e => setForm({ ...form, kid_id: e.target.value })} style={inp}>
                  <option value="">Select child…</option>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>CATEGORY</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inp}>
                  <option value="">Select category…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>PAID BY{parents.length < 2 && <span style={{ color: '#94a3b8', fontWeight: '500' }}> — add parents in Parents tab</span>}</label>
                <select value={form.paid_by_id} onChange={e => setForm({ ...form, paid_by_id: e.target.value })} style={inp} disabled={parents.length === 0}>
                  <option value="">Not specified</option>
                  {me && <option value={me.id}>{me.name} (you)</option>}
                  {co && <option value={co.id}>{co.name}</option>}
                </select>
              </div>
              <div><label style={lbl}>DATE</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></div>
              <div>
                <label style={lbl}>SPLIT — {me?.name ?? 'You'} {form.split_pct}% / {co?.name ?? 'Co-parent'} {100 - form.split_pct}%</label>
                <input type="range" min="0" max="100" step="5" value={form.split_pct} onChange={e => setForm({ ...form, split_pct: +e.target.value })} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}><span>0%</span><span>50/50</span><span>100%</span></div>
              </div>
              <button onClick={addExpense} disabled={saving || !form.description || !form.amount || !form.kid_id || !form.category_id}
                style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: (saving || !form.description || !form.amount || !form.kid_id || !form.category_id) ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Stat({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot }} />
        <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      </div>
      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '4px' }}>{title}</div>
      {children}
    </div>
  )
}

function PayerRow({ parent, paid, total, cs }: { parent: Parent; paid: number; total: number; cs: string }) {
  const pct = total > 0 ? (paid / total) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: parent.color, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
        {parent.name}
        {parent.role === 'me' && <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', marginLeft: '6px' }}>(YOU)</span>}
      </div>
      <div style={{ fontSize: '13px', fontWeight: '700', fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>{cs}{paid.toFixed(2)}</div>
      <div style={{ fontSize: '11px', color: '#94a3b8', width: '38px', textAlign: 'right' }}>{pct.toFixed(0)}%</div>
    </div>
  )
}
