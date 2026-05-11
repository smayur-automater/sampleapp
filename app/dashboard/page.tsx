'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { CurrencySelect, CURRENCIES } from '@/components/CurrencySelect'
import { supabase } from '@/lib/supabase'

interface Kid { id: string; name: string; color: string }
interface Category { id: string; name: string; emoji: string; color: string }
interface Expense {
  id: string; description: string; amount: number; currency: string
  date: string; split_pct: number
  kid: { name: string; color: string }
  category: { name: string; emoji: string }
}

const EMPTY = { description: '', amount: '', currency: 'AUD', kid_id: '', category_id: '', date: new Date().toISOString().split('T')[0], split_pct: 50 }

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [kids, setKids] = useState<Kid[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [currency, setCurrency] = useState('AUD')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [e, k, c] = await Promise.all([
      supabase.from('expenses').select('*, kid:kids(name,color), category:categories(name,emoji)').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
      supabase.from('kids').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    ])
    setExpenses((e.data ?? []) as Expense[])
    setKids(k.data ?? [])
    setCats(c.data ?? [])
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
      date: form.date, split_pct: form.split_pct,
    })
    setSaving(false); setShowModal(false); setForm(EMPTY); load()
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
  const filtered = expenses.filter(e => e.currency === currency)
  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const mine = filtered.reduce((s, e) => s + e.amount * e.split_pct / 100, 0)
  const owed = filtered.reduce((s, e) => s + e.amount * (1 - e.split_pct / 100), 0)
  const cs = sym(currency)

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>Overview</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Shared children expenses</p>
          </div>
          <CurrencySelect value={currency} onChange={setCurrency} compact />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total spent', value: `${cs}${total.toFixed(2)}`, color: '#2563eb', bg: '#eff6ff' },
            { label: 'My share', value: `${cs}${mine.toFixed(2)}`, color: '#059669', bg: '#f0fdf4' },
            { label: 'Their share', value: `${cs}${owed.toFixed(2)}`, color: '#d97706', bg: '#fffbeb' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Add button */}
        <button onClick={() => setShowModal(true)} style={{ width: '100%', padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add expense
        </button>

        {/* Expenses list */}
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Recent expenses</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading…</div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>💸</div>
            <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>No expenses yet</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Tap &ldquo;Add expense&rdquo; to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {expenses.map(exp => (
              <div key={exp.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: exp.kid?.color ?? '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '15px', flexShrink: 0 }}>
                  {exp.kid?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.description}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{exp.kid?.name} · {exp.category?.emoji} {exp.category?.name} · {new Date(exp.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{sym(exp.currency)}{Number(exp.amount).toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.split_pct}% mine</div>
                </div>
                <button onClick={() => deleteExpense(exp.id)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Add expense</h3>
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
              <div><label style={lbl}>DATE</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></div>
              <div>
                <label style={lbl}>MY SPLIT: {form.split_pct}% / Their {100 - form.split_pct}%</label>
                <input type="range" min="0" max="100" step="5" value={form.split_pct} onChange={e => setForm({ ...form, split_pct: +e.target.value })} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}><span>0% (they pay all)</span><span>50/50</span><span>100% (I pay all)</span></div>
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
