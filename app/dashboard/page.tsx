'use client'
import { useEffect, useState, useMemo } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { CURRENCIES } from '@/components/CurrencySelect'
import { Plus, X, Paperclip, Eye, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

interface Kid      { id: string; name: string; color: string }
interface Category { id: string; name: string; color: string }
interface Expense  {
  id: string; description: string; amount: number; currency: string
  date: string; split_pct: number
  paid_by_user_id: string | null; created_by: string | null
  receipt_url: string | null
  kid:      { id: string; name: string; color: string } | null
  category: { id: string; name: string } | null
}

const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
const PERIODS = [
  { key: 'month', label: 'Month' }, { key: '90', label: '90d' },
  { key: 'year',  label: 'Year' },  { key: 'all', label: 'All' },
] as const
type Period = typeof PERIODS[number]['key']
const INP: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' as const }

export default function DashboardPage() {
  const { ctx, loading: ctxLoading, error: ctxError, reload: reloadCtx } = useHousehold()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [kids,     setKids]     = useState<Kid[]>([])
  const [cats,     setCats]     = useState<Category[]>([])
  const [currency, setCurrency] = useState('AUD')
  const [period,   setPeriod]   = useState<Period>('month')
  const [tab,      setTab]      = useState<'overview'|'analytics'>('overview')
  const [pageLoad, setPageLoad] = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErr,  setSaveErr]  = useState('')
  const [viewReceipt, setViewReceipt] = useState<string|null>(null)
  const [receiptFile, setReceiptFile] = useState<File|null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string|null>(null)

  const EMPTY = { description: '', amount: '', currency: 'AUD', kid_id: '', category_id: '', paid_by_user_id: '', date: new Date().toISOString().split('T')[0], split_pct: 50 }
  const [form, setForm] = useState(EMPTY)
  const F = (k: Partial<typeof EMPTY>) => setForm(p => ({ ...p, ...k }))

  useEffect(() => { if (ctx) loadData() }, [ctx])

  async function loadData() {
    if (!ctx) return
    setPageLoad(true)
    const [e, k, c] = await Promise.all([
      supabase.from('expenses').select('id,description,amount,currency,date,split_pct,paid_by_user_id,created_by,receipt_url,kid:kids(id,name,color),category:categories(id,name)').eq('household_id', ctx.household_id).order('date', { ascending: false }),
      supabase.from('kids').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
      supabase.from('categories').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
    ])
    setExpenses((e.data ?? []) as unknown as Expense[])
    setKids(k.data ?? [])
    setCats(c.data ?? [])
    setPageLoad(false)
  }

  function openModal() { setForm(EMPTY); setReceiptFile(null); setReceiptPreview(null); setSaveErr(''); setModal(true) }

  function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { setSaveErr('File must be under 10 MB'); return }
    setReceiptFile(file)
    const r = new FileReader(); r.onload = ev => setReceiptPreview(ev.target?.result as string); r.readAsDataURL(file)
  }

  async function submit() {
    if (!form.description.trim()) { setSaveErr('Enter a description'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setSaveErr('Enter a valid amount'); return }
    if (!form.kid_id) { setSaveErr('Select a child'); return }
    if (!form.category_id) { setSaveErr('Select a category'); return }
    if (!ctx) { setSaveErr('Not connected to household'); return }
    setSaving(true); setSaveErr('')

    let receipt_url: string | null = null
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop() ?? 'jpg'
      const path = `${ctx.household_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, receiptFile, { upsert: true })
      if (upErr) { setSaveErr('Receipt upload failed: ' + upErr.message); setSaving(false); return }
      const { data: ud } = supabase.storage.from('receipts').getPublicUrl(path)
      receipt_url = ud?.publicUrl ?? null
    }

    const { error } = await supabase.from('expenses').insert({
      household_id: ctx.household_id, created_by: ctx.myUserId,
      description: form.description.trim(), amount: parseFloat(form.amount),
      currency: form.currency, kid_id: form.kid_id, category_id: form.category_id,
      paid_by_user_id: form.paid_by_user_id || null, date: form.date,
      split_pct: form.split_pct, receipt_url,
    })
    setSaving(false)
    if (error) { setSaveErr(error.message); return }
    setModal(false); loadData()
  }

  async function remove(id: string, receiptUrl: string | null) {
    if (!confirm('Delete this expense?')) return
    if (receiptUrl) { const path = receiptUrl.split('/receipts/')[1]; if (path) await supabase.storage.from('receipts').remove([decodeURIComponent(path)]) }
    await supabase.from('expenses').delete().eq('id', id); loadData()
  }

  const cs = sym(currency)
  const filtered = useMemo(() => {
    const now = new Date()
    return expenses.filter(e => e.currency === currency).filter(e => {
      if (period === 'all') return true
      const d = new Date(e.date), diff = (now.getTime() - d.getTime()) / 86400000
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (period === '90') return diff <= 90
      if (period === 'year') return d.getFullYear() === now.getFullYear()
      return true
    })
  }, [expenses, currency, period])

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  const stats = useMemo(() => {
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0)
    let mine = 0
    filtered.forEach(e => { mine += Number(e.amount) * (e.created_by === ctx?.myUserId ? e.split_pct : 100 - e.split_pct) / 100 })
    const theirs = total - mine
    const mePaid = me ? filtered.filter(e => e.paid_by_user_id === me.user_id).reduce((s, e) => s + Number(e.amount), 0) : 0
    const coPaid = co ? filtered.filter(e => e.paid_by_user_id === co.user_id).reduce((s, e) => s + Number(e.amount), 0) : 0
    const byCat: Record<string, { name: string; amount: number }> = {}
    filtered.forEach(e => { if (!e.category?.id) return; if (!byCat[e.category.id]) byCat[e.category.id] = { name: e.category.name, amount: 0 }; byCat[e.category.id].amount += Number(e.amount) })
    const byKid: Record<string, { name: string; color: string; amount: number; count: number }> = {}
    filtered.forEach(e => { if (!e.kid?.id) return; if (!byKid[e.kid.id]) byKid[e.kid.id] = { name: e.kid.name, color: e.kid.color, amount: 0, count: 0 }; byKid[e.kid.id].amount += Number(e.amount); byKid[e.kid.id].count++ })
    return { total, mine, theirs, mePaid, coPaid, balance: mePaid - mine, count: filtered.length, catList: Object.values(byCat).sort((a, b) => b.amount - a.amount), kidList: Object.values(byKid).sort((a, b) => b.amount - a.amount) }
  }, [filtered, me, co, ctx])

  if (ctxLoading) return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}><div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>
  if (ctxError) return <Shell><div style={{ padding: 24, textAlign: 'center' }}><p style={{ color: '#dc2626' }}>{ctxError}</p><button onClick={reloadCtx} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button></div></Shell>

  return (
    <Shell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Overview</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{co ? `Shared with ${co.display_name}` : 'Your household'}</p>
          </div>
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#fff', color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 3, marginBottom: 14, gap: 2 }}>
          {(['overview', 'analytics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, background: tab === t ? '#2563eb' : 'transparent', color: tab === t ? '#fff' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{ padding: '5px 12px', border: period === p.key ? '1.5px solid #2563eb' : '1px solid #e2e8f0', borderRadius: 99, background: period === p.key ? '#eff6ff' : '#fff', color: period === p.key ? '#2563eb' : '#64748b', fontSize: 12, fontWeight: period === p.key ? 600 : 400, cursor: 'pointer' }}>{p.label}</button>
          ))}
        </div>

        {tab === 'overview' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[{ label: 'Total', value: `${cs}${stats.total.toFixed(2)}`, sub: `${stats.count} expenses`, color: '#2563eb' }, { label: me?.display_name ?? 'Mine', value: `${cs}${stats.mine.toFixed(2)}`, sub: `${stats.total > 0 ? (stats.mine / stats.total * 100).toFixed(0) : 0}%`, color: me?.color ?? '#059669' }, { label: co?.display_name ?? 'Theirs', value: `${cs}${stats.theirs.toFixed(2)}`, sub: `${stats.total > 0 ? (stats.theirs / stats.total * 100).toFixed(0) : 0}%`, color: co?.color ?? '#94a3b8' }].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '13px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} /><span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {me && co && Math.abs(stats.balance) > 0.01 && (
            <div style={{ background: stats.balance >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${stats.balance >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: stats.balance >= 0 ? '#059669' : '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{stats.balance >= 0 ? `${co.display_name} owes ${me.display_name}` : `${me.display_name} owes ${co.display_name}`}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: stats.balance >= 0 ? '#059669' : '#dc2626' }}>{cs}{Math.abs(stats.balance).toFixed(2)}</div>
              </div>
              {stats.balance >= 0 ? <ArrowUpRight size={28} color="#059669" /> : <ArrowDownRight size={28} color="#dc2626" />}
            </div>
          )}

          <button onClick={openModal} style={{ width: '100%', padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={18} strokeWidth={2.5} /> Add expense
          </button>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Recent</div>
          {pageLoad ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div> :
           filtered.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
              <TrendingUp size={32} color="#cbd5e1" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>No expenses this period</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {filtered.map(exp => {
                const payer = ctx?.members.find(m => m.user_id === exp.paid_by_user_id)
                const isOwner = exp.created_by === ctx?.myUserId
                return (
                  <div key={exp.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: exp.kid?.color ?? '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{exp.kid?.name?.[0]?.toUpperCase() ?? '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{exp.category?.name} · {new Date(exp.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}{payer ? ` · ${payer.display_name} paid` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{sym(exp.currency)}{Number(exp.amount).toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{exp.split_pct}/{100 - exp.split_pct}</div>
                    </div>
                    {exp.receipt_url && <button onClick={() => setViewReceipt(exp.receipt_url)} style={{ padding: 5, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', display: 'flex', flexShrink: 0 }}><Paperclip size={12} color="#2563eb" /></button>}
                    {isOwner && <button onClick={() => remove(exp.id, exp.receipt_url)} style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', flexShrink: 0, display: 'flex' }}><X size={14} /></button>}
                  </div>
                )
              })}
            </div>
          )}
        </>)}

        {tab === 'analytics' && (<>
          {me && co && stats.total > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Who paid</div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
                <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: '#f1f5f9', marginBottom: 14, display: 'flex' }}>
                  {stats.mePaid > 0 && <div style={{ flex: stats.mePaid / stats.total, background: me.color }} />}
                  {stats.coPaid > 0 && <div style={{ flex: stats.coPaid / stats.total, background: co.color }} />}
                </div>
                {[{ m: me, paid: stats.mePaid, you: true }, { m: co, paid: stats.coPaid, you: false }].map(({ m, paid, you }) => (
                  <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: 500 }}>{m.display_name}{you ? ' (you)' : ''}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{cs}{paid.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', width: 36, textAlign: 'right' }}>{stats.total > 0 ? (paid / stats.total * 100).toFixed(0) : 0}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.kidList.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>By child</div>
              {stats.kidList.map(k => { const pct = stats.total > 0 ? k.amount / stats.total * 100 : 0; return (
                <div key={k.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{k.name[0]}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{k.name}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{k.count} expenses</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 700 }}>{cs}{k.amount.toFixed(2)}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{pct.toFixed(0)}%</div></div>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: k.color }} /></div>
                </div>
              )})}
            </div>
          )}
          {stats.catList.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>By category</div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                {stats.catList.slice(0, 8).map((c, i) => { const pct = stats.total > 0 ? c.amount / stats.total * 100 : 0; return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{c.name}</div><div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: '#2563eb' }} /></div></div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{cs}{c.amount.toFixed(2)}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{pct.toFixed(0)}%</div></div>
                  </div>
                )})}
              </div>
            </div>
          )}
        </>)}
      </div>

      {/* ADD EXPENSE MODAL */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Add expense</h3>
              <button onClick={() => setModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color="#64748b" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={LBL}>Description *</label><input value={form.description} onChange={e => F({ description: e.target.value })} placeholder="e.g. School excursion" style={INP} autoFocus /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
                <div><label style={LBL}>Amount *</label><input type="number" value={form.amount} onChange={e => F({ amount: e.target.value })} placeholder="0.00" step="0.01" min="0" style={{ ...INP, fontVariantNumeric: 'tabular-nums' }} /></div>
                <div><label style={LBL}>Currency</label><select value={form.currency} onChange={e => F({ currency: e.target.value })} style={{ ...INP, cursor: 'pointer' }}>{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}</select></div>
              </div>
              <div>
                <label style={LBL}>Child *</label>
                <select value={form.kid_id} onChange={e => F({ kid_id: e.target.value })} style={{ ...INP, cursor: 'pointer', color: form.kid_id ? '#0f172a' : '#94a3b8' }}>
                  <option value="">Select child…</option>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
                {kids.length === 0 && <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0' }}>⚠ No children yet — go to Kids tab to add one first</p>}
              </div>
              <div>
                <label style={LBL}>Category *</label>
                <select value={form.category_id} onChange={e => F({ category_id: e.target.value })} style={{ ...INP, cursor: 'pointer', color: form.category_id ? '#0f172a' : '#94a3b8' }}>
                  <option value="">Select category…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Paid by</label>
                <select value={form.paid_by_user_id} onChange={e => F({ paid_by_user_id: e.target.value })} style={{ ...INP, cursor: 'pointer' }}>
                  <option value="">Not specified</option>
                  {ctx?.members.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}{m.user_id === ctx.myUserId ? ' (you)' : ''}</option>)}
                </select>
              </div>
              <div><label style={LBL}>Date</label><input type="date" value={form.date} onChange={e => F({ date: e.target.value })} style={INP} /></div>
              <div>
                <label style={LBL}>Split — you {form.split_pct}% / co-parent {100 - form.split_pct}%</label>
                <input type="range" min="0" max="100" step="5" value={form.split_pct} onChange={e => F({ split_pct: +e.target.value })} style={{ width: '100%', accentColor: '#2563eb' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 2 }}><span>0%</span><span>50/50</span><span>100%</span></div>
              </div>
              <div>
                <label style={LBL}>Receipt (optional)</label>
                {!receiptPreview ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', border: '1.5px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', color: '#64748b', fontSize: 13 }}>
                    <Paperclip size={15} color="#94a3b8" /> Attach photo or PDF (max 10 MB)
                    <input type="file" accept="image/*,.pdf" onChange={handleReceipt} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    {receiptFile?.type === 'application/pdf' ? <div style={{ padding: '12px 14px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Paperclip size={16} color="#2563eb" /><span style={{ fontSize: 13, color: '#0f172a' }}>{receiptFile.name}</span></div> : <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />}
                    <button onClick={() => { setReceiptFile(null); setReceiptPreview(null) }} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="#fff" /></button>
                  </div>
                )}
              </div>
              {saveErr && <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{saveErr}</div>}
              <button onClick={submit} disabled={saving} style={{ padding: 13, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? (receiptFile ? 'Uploading…' : 'Saving…') : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT VIEWER */}
      {viewReceipt && (
        <div onClick={() => setViewReceipt(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 760, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Receipt</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={viewReceipt} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}><Eye size={13} /> Open</a>
                <button onClick={() => setViewReceipt(null)} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} color="#fff" /></button>
              </div>
            </div>
            <img src={viewReceipt} alt="Receipt" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, display: 'block' }} />
          </div>
        </div>
      )}
    </Shell>
  )
}
