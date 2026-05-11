'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/AppShell'
import { CurrencySelect, CURRENCIES } from '@/components/CurrencySelect'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Expense {
  id: string; description: string; amount: number; currency: string
  date: string; split_percentage: number
  kids: { name: string; avatar_color: string }
  categories: { name: string }
}
interface Kid { id: string; name: string; avatar_color: string }
interface Category { id: string; name: string }

export default function HomePage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [kids, setKids] = useState<Kid[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currency, setCurrency] = useState('AUD')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ kid_id: '', category_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], split_percentage: 50, currency: 'AUD' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      loadData()
    })
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [e, k, c] = await Promise.all([
      supabase.from('expenses').select('*, kids(name,avatar_color), categories(name)').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('kids').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
    ])
    setExpenses((e.data as Expense[]) || [])
    setKids(k.data || [])
    setCategories(c.data || [])
    setLoading(false)
  }

  const addExpense = async () => {
    if (!form.kid_id || !form.category_id || !form.amount || !form.description) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    await supabase.from('expenses').insert({ user_id: user.id, kid_id: form.kid_id, category_id: form.category_id, amount: parseFloat(form.amount), currency: form.currency, description: form.description, date: form.date, split_percentage: form.split_percentage })
    setSaving(false); setShowModal(false)
    setForm({ kid_id: '', category_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], split_percentage: 50, currency: 'AUD' })
    loadData()
  }

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
  const filtered = expenses.filter(e => e.currency === currency)
  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const mine = filtered.reduce((s, e) => s + (e.amount * e.split_percentage / 100), 0)
  const theirs = total - mine

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' } as React.CSSProperties
  const lbl = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '6px', letterSpacing: '0.02em' } as React.CSSProperties

  return (
    <AppShell>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.4px' }}>Overview</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Track shared children expenses</p>
          </div>
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: `${sym}${total.toFixed(2)}`, color: '#1d4ed8' },
            { label: 'My share', value: `${sym}${mine.toFixed(2)}`, color: '#10b981' },
            { label: 'Owed', value: `${sym}${theirs.toFixed(2)}`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, marginBottom: '10px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{label}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setShowModal(true)} style={{ width: '100%', padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '28px', fontFamily: 'inherit' }}>
          <Plus size={16} /> Add expense
        </button>

        <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '12px', textTransform: 'uppercase' }}>Recent expenses</p>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>Loading...</p>
        ) : expenses.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '8px' }}>💰</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>No expenses yet. Add your first one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {expenses.map(exp => {
              const esym = CURRENCIES.find(c => c.code === exp.currency)?.symbol || '$'
              return (
                <div key={exp.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: exp.kids?.avatar_color || '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>
                    {exp.kids?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{exp.kids?.name} · {exp.categories?.name} · {new Date(exp.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', fontFamily: "'DM Mono', monospace" }}>{esym}{Number(exp.amount).toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.split_percentage}% you</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#0f172a' }}>Add expense</h3>
              <button onClick={() => setShowModal(false)} style={{ padding: '6px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><X size={16} color="#64748b" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={lbl}>DESCRIPTION</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. School excursion fee" style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
                <div><label style={lbl}>AMOUNT</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" step="0.01" style={{ ...inp, fontFamily: "'DM Mono', monospace" }} /></div>
                <div style={{ paddingBottom: '0' }}><CurrencySelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} /></div>
              </div>
              <div><label style={lbl}>CHILD</label>
                <select value={form.kid_id} onChange={e => setForm({ ...form, kid_id: e.target.value })} style={inp}>
                  <option value="">Select a child</option>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>CATEGORY</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={inp}>
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>DATE</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></div>
              <div>
                <label style={lbl}>MY SPLIT — {form.split_percentage}%</label>
                <input type="range" min="0" max="100" step="5" value={form.split_percentage} onChange={e => setForm({ ...form, split_percentage: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#1d4ed8' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  <span>0% (they pay)</span><span>50/50</span><span>100% (I pay)</span>
                </div>
              </div>
              <button onClick={addExpense} disabled={saving || !form.kid_id || !form.category_id || !form.amount || !form.description}
                style={{ padding: '13px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', opacity: (saving || !form.kid_id || !form.category_id || !form.amount || !form.description) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
