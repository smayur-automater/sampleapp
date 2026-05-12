'use client'
import { useEffect, useState, useMemo } from 'react'
import Shell from '@/components/Shell'
import { CurrencySelect, CURRENCIES } from '@/components/CurrencySelect'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import {
  Plus, X, TrendingUp, Scale, ArrowUpRight, ArrowDownRight, Paperclip, Eye, Trash2,
  Heart, BookOpen, Activity, MapPin, Plane, Smile,
  ShoppingBag, Utensils, Music, Palette, Monitor, Tag,
  GraduationCap, Stethoscope
} from 'lucide-react'

interface Kid      { id: string; name: string; color: string }
interface Category { id: string; name: string; icon: string; color: string }
interface Expense  {
  id: string; description: string; amount: number; currency: string
  date: string; split_pct: number; paid_by_user_id: string | null; created_by: string | null
  receipt_url: string | null
  kid: { id: string; name: string; color: string }
  category: { id: string; name: string; icon: string; color: string }
}

const ICON_MAP: Record<string, React.ElementType> = {
  heart: Heart, stethoscope: Stethoscope, book: BookOpen, graduation: GraduationCap,
  activity: Activity, 'map-pin': MapPin, plane: Plane, smile: Smile,
  'shopping-bag': ShoppingBag, utensils: Utensils, music: Music,
  palette: Palette, monitor: Monitor, tag: Tag,
}

function CatIcon({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  const Ic = ICON_MAP[icon] ?? Tag
  return <Ic size={size} color={color} strokeWidth={1.8} />
}

const EMPTY_FORM = {
  description: '', amount: '', currency: 'AUD',
  kid_id: '', category_id: '', paid_by_user_id: '',
  date: new Date().toISOString().split('T')[0], split_pct: 50,
}

const PERIODS = [
  { key: 'all',   label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: '90',    label: 'Last 90d' },
  { key: 'year',  label: 'This year' },
] as const
type Period = typeof PERIODS[number]['key']

export default function Dashboard() {
  const { ctx } = useHousehold()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [kids,     setKids]     = useState<Kid[]>([])
  const [cats,     setCats]     = useState<Category[]>([])
  const [currency, setCurrency] = useState('AUD')
  const [period,   setPeriod]   = useState<Period>('month')
  const [tab,      setTab]      = useState<'overview'|'analytics'>('overview')
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [receiptFile, setReceiptFile]   = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [viewReceipt, setViewReceipt]   = useState<string | null>(null)

  useEffect(() => { if (ctx) load() }, [ctx])

  async function load() {
    if (!ctx) return
    const [e, k, c] = await Promise.all([
      supabase.from('expenses').select('*, kid:kids(id,name,color), category:categories(id,name,icon,color)').eq('household_id', ctx.household_id).order('date', { ascending: false }),
      supabase.from('kids').select('*').eq('household_id', ctx.household_id).order('name'),
      supabase.from('categories').select('*').eq('household_id', ctx.household_id).order('name'),
    ])
    setExpenses((e.data ?? []) as Expense[])
    setKids(k.data ?? [])
    setCats(c.data ?? [])
    setLoading(false)
  }

  const [addError, setAddError] = useState('')

  function handleReceiptPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setAddError('Receipt must be under 10 MB'); return }
    setReceiptFile(file)
    const reader = new FileReader()
    reader.onload = ev => setReceiptPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function addExpense() {
    if (!form.description || !form.amount || !form.kid_id || !form.category_id || !ctx) return
    setSaving(true); setAddError('')

    // Upload receipt first if provided
    let receipt_url: string | null = null
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${ctx.household_id}/${Date.now()}_${ctx.myUserId}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(path, receiptFile, { upsert: true })
      if (upErr) {
        setAddError('Receipt upload failed: ' + upErr.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      receipt_url = urlData?.publicUrl ?? null
    }

    const { error } = await supabase.from('expenses').insert({
      household_id: ctx.household_id, description: form.description,
      amount: parseFloat(form.amount), currency: form.currency,
      kid_id: form.kid_id, category_id: form.category_id,
      paid_by_user_id: form.paid_by_user_id || null,
      created_by: ctx.myUserId, date: form.date, split_pct: form.split_pct,
      receipt_url,
    })
    setSaving(false)
    if (error) { setAddError(error.message); return }
    setModal(false)
    setForm(EMPTY_FORM)
    setReceiptFile(null)
    setReceiptPreview(null)
    setAddError('')
    load()
  }

  async function deleteReceipt(expenseId: string, receiptUrl: string) {
    if (!confirm('Remove this receipt?')) return
    // Extract path from URL
    const path = receiptUrl.split('/receipts/')[1]
    if (path) await supabase.storage.from('receipts').remove([path])
    await supabase.from('expenses').update({ receipt_url: null }).eq('id', expenseId)
    load()
  }

  async function delExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id); load()
  }

  const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
  const cs  = sym(currency)

  const filtered = useMemo(() => {
    const now = new Date()
    return expenses.filter(e => e.currency === currency).filter(e => {
      if (period === 'all') return true
      const d = new Date(e.date), diff = (now.getTime() - d.getTime()) / 86400000
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (period === '90')    return diff <= 90
      if (period === 'year')  return d.getFullYear() === now.getFullYear()
      return true
    })
  }, [expenses, currency, period])

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  const stats = useMemo(() => {
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0)
    let mine = 0
    filtered.forEach(e => {
      const pct = e.created_by === ctx?.myUserId ? e.split_pct : 100 - e.split_pct
      mine += Number(e.amount) * pct / 100
    })
    const theirs   = total - mine
    const mePaid   = me ? filtered.filter(e => e.paid_by_user_id === me.user_id).reduce((s,e) => s+Number(e.amount),0) : 0
    const coPaid   = co ? filtered.filter(e => e.paid_by_user_id === co.user_id).reduce((s,e) => s+Number(e.amount),0) : 0
    const balance  = mePaid - mine  // positive → co-parent owes me

    // By category
    const bycat: Record<string, { name:string; icon:string; color:string; amount:number; count:number }> = {}
    filtered.forEach(e => {
      const id = e.category?.id; if (!id) return
      if (!bycat[id]) bycat[id] = { name:e.category.name, icon:e.category.icon, color:e.category.color, amount:0, count:0 }
      bycat[id].amount += Number(e.amount); bycat[id].count++
    })

    // By kid
    const bykid: Record<string, { name:string; color:string; amount:number; count:number }> = {}
    filtered.forEach(e => {
      const id = e.kid?.id; if (!id) return
      if (!bykid[id]) bykid[id] = { name:e.kid.name, color:e.kid.color, amount:0, count:0 }
      bykid[id].amount += Number(e.amount); bykid[id].count++
    })

    // By month (last 6)
    const bymonth: Record<string, number> = {}
    const allByCurrency = expenses.filter(e => e.currency === currency)
    allByCurrency.forEach(e => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      bymonth[key] = (bymonth[key] ?? 0) + Number(e.amount)
    })
    const sortedMonths = Object.keys(bymonth).sort().slice(-6).map(k => ({
      label: new Date(k+'-01').toLocaleDateString('en-AU',{month:'short',year:'2-digit'}),
      amount: bymonth[k], key: k
    }))

    return {
      total, mine, theirs, mePaid, coPaid, balance,
      catList:  Object.values(bycat).sort((a,b)=>b.amount-a.amount),
      kidList:  Object.values(bykid).sort((a,b)=>b.amount-a.amount),
      months:   sortedMonths,
      count:    filtered.length,
    }
  }, [filtered, me, co, ctx, expenses, currency])

  // Styles
  const inp: React.CSSProperties = { width:'100%', padding:'10px 14px', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:14, background:'var(--slate-50)', outline:'none', color:'var(--slate-900)' }
  const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:5, display:'block', letterSpacing:'0.06em', textTransform:'uppercase' as const }

  const maxMonth = Math.max(...stats.months.map(m => m.amount), 1)

  return (
    <Shell>
      <div style={{ maxWidth:720, margin:'0 auto', padding:'20px 16px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--slate-900)', letterSpacing:'-0.5px' }}>Dashboard</h1>
            <p style={{ fontSize:13, color:'var(--slate-500)', marginTop:2 }}>
              {co ? `Shared with ${co.display_name}` : 'Shared household expenses'}
            </p>
          </div>
          <CurrencySelect value={currency} onChange={setCurrency} compact />
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', padding:3, marginBottom:16, gap:2 }}>
          {(['overview','analytics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'7px 0', border:'none', borderRadius:9, background: tab===t ? 'var(--blue)' : 'transparent', color: tab===t ? '#fff' : 'var(--slate-500)', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s', textTransform:'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Period filter */}
        <div style={{ display:'flex', gap:6, marginBottom:18, overflowX:'auto', paddingBottom:2 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{ padding:'5px 12px', border: period===p.key ? '1.5px solid var(--blue)' : '1px solid var(--slate-200)', borderRadius:99, background: period===p.key ? 'var(--blue-light)' : 'var(--white)', color: period===p.key ? 'var(--blue)' : 'var(--slate-500)', fontSize:12, fontWeight: period===p.key ? 600 : 400, cursor:'pointer', whiteSpace:'nowrap' as const }}>
              {p.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* KPI cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <KpiCard label="Total" value={`${cs}${stats.total.toFixed(2)}`} sub={`${stats.count} expenses`} color="var(--blue)" />
              <KpiCard label={me?.display_name ?? 'My share'} value={`${cs}${stats.mine.toFixed(2)}`} sub={`${stats.total>0?(stats.mine/stats.total*100).toFixed(0):0}%`} color={me?.color ?? 'var(--blue)'} />
              <KpiCard label={co?.display_name ?? 'Their share'} value={`${cs}${stats.theirs.toFixed(2)}`} sub={`${stats.total>0?(stats.theirs/stats.total*100).toFixed(0):0}%`} color={co?.color ?? 'var(--slate-400)'} />
            </div>

            {/* Settlement */}
            {me && co && Math.abs(stats.balance) > 0.01 && (
              <div style={{ background: stats.balance>=0 ? 'var(--green-light)' : 'var(--red-light)', border:`1px solid ${stats.balance>=0 ? '#bbf7d0' : '#fecaca'}`, borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color: stats.balance>=0 ? 'var(--green)' : 'var(--red)', letterSpacing:'0.06em', textTransform:'uppercase' as const, marginBottom:4 }}>
                    {stats.balance>=0 ? `${co.display_name} owes ${me.display_name}` : `${me.display_name} owes ${co.display_name}`}
                  </div>
                  <div style={{ fontSize:26, fontWeight:700, color: stats.balance>=0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.5px' }}>
                    {cs}{Math.abs(stats.balance).toFixed(2)}
                  </div>
                </div>
                {stats.balance>=0 ? <ArrowUpRight size={28} color="var(--green)" /> : <ArrowDownRight size={28} color="var(--red)" />}
              </div>
            )}

            {/* Add expense */}
            <button onClick={() => { setForm(EMPTY_FORM); setModal(true) }}
              style={{ width:'100%', padding:13, background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Plus size={16} strokeWidth={2.5} /> Add expense
            </button>

            {/* Who paid */}
            {me && co && stats.total > 0 && (
              <Section title="Who paid">
                <div style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', padding:16, boxShadow:'var(--shadow-sm)' }}>
                  <div style={{ height:8, borderRadius:4, overflow:'hidden', background:'var(--slate-100)', marginBottom:14, display:'flex' }}>
                    {stats.mePaid>0   && <div style={{ width:`${stats.mePaid/stats.total*100}%`,   background:me.color,  transition:'width 0.4s' }} />}
                    {stats.coPaid>0   && <div style={{ width:`${stats.coPaid/stats.total*100}%`,   background:co.color,  transition:'width 0.4s' }} />}
                    {(stats.mePaid+stats.coPaid)<stats.total && <div style={{ flex:1, background:'var(--slate-200)' }} />}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[{ m:me, paid:stats.mePaid, you:true }, { m:co, paid:stats.coPaid, you:false }].map(({ m, paid, you }) => (
                      <div key={m.user_id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:m.color, flexShrink:0 }} />
                        <div style={{ flex:1, fontSize:13, color:'var(--slate-700)', fontWeight:500 }}>
                          {m.display_name} {you && <span style={{ fontSize:10, color:'var(--slate-400)', fontWeight:600 }}>(YOU)</span>}
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--slate-900)', fontVariantNumeric:'tabular-nums' }}>{cs}{paid.toFixed(2)}</div>
                        <div style={{ fontSize:11, color:'var(--slate-400)', width:36, textAlign:'right' }}>{stats.total>0?(paid/stats.total*100).toFixed(0):0}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* Recent expenses */}
            <Section title="Recent expenses">
              {loading ? (
                <div style={{ textAlign:'center', padding:32, color:'var(--slate-400)' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)' }}>
                  <TrendingUp size={28} color="var(--slate-300)" style={{ margin:'0 auto 10px' }} />
                  <div style={{ fontSize:14, color:'var(--slate-500)' }}>No expenses in this period</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {filtered.slice(0,15).map(exp => {
                    const payer = ctx?.members.find(m => m.user_id === exp.paid_by_user_id)
                    const isOwner = exp.created_by === ctx?.myUserId
                    return (
                      <div key={exp.id} style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', padding:'12px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:'var(--shadow-sm)' }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:exp.kid?.color ?? 'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 }}>
                          {exp.kid?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:14, color:'var(--slate-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{exp.description}</div>
                          <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2, display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' as const }}>
                            <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                              <CatIcon icon={exp.category?.icon ?? 'tag'} color={exp.category?.color ?? 'var(--slate-400)'} size={11} />
                              {exp.category?.name}
                            </span>
                            <span>·</span>
                            <span>{new Date(exp.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</span>
                            {payer && <><span>·</span><span style={{ color:payer.color, fontWeight:600 }}>{payer.display_name} paid</span></>}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:'var(--slate-900)', fontVariantNumeric:'tabular-nums' }}>{sym(exp.currency)}{Number(exp.amount).toFixed(2)}</div>
                          <div style={{ fontSize:10, color:'var(--slate-400)' }}>{exp.split_pct}/{100-exp.split_pct}</div>
                        </div>
                        {isOwner && (
                          <button onClick={() => delExpense(exp.id)} style={{ padding:5, background:'none', border:'none', cursor:'pointer', color:'var(--slate-300)', flexShrink:0 }}>
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          </>
        )}

        {tab === 'analytics' && (
          <>
            {/* Monthly bar chart */}
            {stats.months.length > 0 && (
              <Section title="Monthly spend">
                <div style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', padding:'18px 16px', boxShadow:'var(--shadow-sm)' }}>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
                    {stats.months.map(m => {
                      const h = Math.max((m.amount / maxMonth) * 100, 4)
                      return (
                        <div key={m.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                          <div style={{ fontSize:9, fontWeight:600, color:'var(--slate-500)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' as const }}>
                            {m.amount >= 1000 ? `${cs}${(m.amount/1000).toFixed(1)}k` : `${cs}${m.amount.toFixed(0)}`}
                          </div>
                          <div style={{ width:'100%', height:`${h}px`, background:'var(--blue)', borderRadius:'4px 4px 0 0', opacity:0.85, transition:'height 0.3s', minHeight:4 }} />
                          <div style={{ fontSize:9, color:'var(--slate-400)', textAlign:'center' }}>{m.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Section>
            )}

            {/* By child */}
            {stats.kidList.length > 0 && (
              <Section title="Spending by child">
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {stats.kidList.map(k => {
                    const pct = stats.total>0 ? (k.amount/stats.total)*100 : 0
                    return (
                      <div key={k.name} style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', padding:'12px 14px', boxShadow:'var(--shadow-sm)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <div style={{ width:34, height:34, borderRadius:10, background:k.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>{k.name[0].toUpperCase()}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:14, fontWeight:600, color:'var(--slate-900)' }}>{k.name}</div>
                            <div style={{ fontSize:11, color:'var(--slate-400)' }}>{k.count} {k.count===1?'expense':'expenses'}</div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontSize:14, fontWeight:700, color:'var(--slate-900)', fontVariantNumeric:'tabular-nums' }}>{cs}{k.amount.toFixed(2)}</div>
                            <div style={{ fontSize:10, color:'var(--slate-400)' }}>{pct.toFixed(0)}%</div>
                          </div>
                        </div>
                        <div style={{ height:4, background:'var(--slate-100)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:k.color, transition:'width 0.4s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* By category */}
            {stats.catList.length > 0 && (
              <Section title="Spending by category">
                <div style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
                  {stats.catList.slice(0,8).map((c, i) => {
                    const pct = stats.total>0 ? (c.amount/stats.total)*100 : 0
                    return (
                      <div key={c.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderTop: i>0 ? '1px solid var(--slate-100)' : 'none' }}>
                        <div style={{ width:32, height:32, borderRadius:9, background:c.color+'12', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <CatIcon icon={c.icon} color={c.color} size={15} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--slate-900)', marginBottom:4 }}>{c.name}</div>
                          <div style={{ height:3, background:'var(--slate-100)', borderRadius:2, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:c.color, transition:'width 0.4s' }} />
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--slate-900)', fontVariantNumeric:'tabular-nums' }}>{cs}{c.amount.toFixed(2)}</div>
                          <div style={{ fontSize:10, color:'var(--slate-400)' }}>{pct.toFixed(0)}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* Parent paid breakdown */}
            {me && co && (
              <Section title="Expense count by parent">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { m: me, paid: stats.mePaid, count: filtered.filter(e=>e.paid_by_user_id===me.user_id).length },
                    { m: co, paid: stats.coPaid, count: filtered.filter(e=>e.paid_by_user_id===co.user_id).length },
                  ].map(({ m, paid, count }) => (
                    <div key={m.user_id} style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', padding:'14px 14px', boxShadow:'var(--shadow-sm)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                        <div style={{ width:32, height:32, borderRadius:9, background:m.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>{m.display_name[0].toUpperCase()}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--slate-900)' }}>{m.display_name}</div>
                      </div>
                      <div style={{ fontSize:20, fontWeight:700, color:'var(--slate-900)', fontVariantNumeric:'tabular-nums', marginBottom:2 }}>{cs}{paid.toFixed(2)}</div>
                      <div style={{ fontSize:11, color:'var(--slate-400)' }}>{count} transactions paid</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e => { if (e.target===e.currentTarget) { setModal(false); setReceiptFile(null); setReceiptPreview(null) } }}>
          <div style={{ background:'var(--white)', borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:640, maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:17, fontWeight:700, color:'var(--slate-900)' }}>Add expense</h3>
              <button onClick={() => { setModal(false); setReceiptFile(null); setReceiptPreview(null) }} style={{ width:32, height:32, background:'var(--slate-100)', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15} color="var(--slate-500)" />
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div><label style={lbl}>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. School excursion" style={inp} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, alignItems:'end' }}>
                <div><label style={lbl}>Amount</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" step="0.01" style={{ ...inp, fontVariantNumeric:'tabular-nums' }} /></div>
                <div style={{ paddingBottom:0 }}><CurrencySelect value={form.currency} onChange={v=>setForm({...form,currency:v})} compact /></div>
              </div>
              <div><label style={lbl}>Child</label>
                <select value={form.kid_id} onChange={e=>setForm({...form,kid_id:e.target.value})} style={inp}>
                  <option value="">Select child…</option>
                  {kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Category</label>
                <select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})} style={inp}>
                  <option value="">Select category…</option>
                  {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Paid by</label>
                <select value={form.paid_by_user_id} onChange={e=>setForm({...form,paid_by_user_id:e.target.value})} style={inp}>
                  <option value="">Not specified</option>
                  {ctx?.members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}{m.user_id===ctx.myUserId?' (you)':''}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp} /></div>
              <div>
                <label style={lbl}>Split — {me?.display_name ?? 'You'} {form.split_pct}% / {co?.display_name ?? 'Co-parent'} {100-form.split_pct}%</label>
                <input type="range" min="0" max="100" step="5" value={form.split_pct} onChange={e=>setForm({...form,split_pct:+e.target.value})} style={{ width:'100%' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--slate-400)', marginTop:2 }}><span>0%</span><span>50 / 50</span><span>100%</span></div>
              </div>
              {/* Receipt upload */}
              <div>
                <label style={lbl}>RECEIPT (optional)</label>
                {!receiptPreview ? (
                  <label style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', border:'1.5px dashed var(--slate-300)', borderRadius:'var(--radius)', cursor:'pointer', color:'var(--slate-500)', fontSize:13, fontWeight:500 }}>
                    <Paperclip size={15} color="var(--slate-400)" />
                    Attach photo or PDF (max 10 MB)
                    <input type="file" accept="image/*,.pdf" onChange={handleReceiptPick} style={{ display:'none' }} />
                  </label>
                ) : (
                  <div style={{ position:'relative', borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--slate-200)' }}>
                    {receiptFile?.type === 'application/pdf' ? (
                      <div style={{ padding:'14px 16px', background:'var(--slate-50)', display:'flex', alignItems:'center', gap:10 }}>
                        <Paperclip size={18} color="var(--blue)" />
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--slate-900)' }}>{receiptFile.name}</div>
                          <div style={{ fontSize:11, color:'var(--slate-400)' }}>{(receiptFile.size/1024).toFixed(0)} KB · PDF</div>
                        </div>
                      </div>
                    ) : (
                      <img src={receiptPreview} alt="Receipt preview" style={{ width:'100%', maxHeight:180, objectFit:'cover', display:'block' }} />
                    )}
                    <button onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                      style={{ position:'absolute', top:8, right:8, width:26, height:26, background:'rgba(0,0,0,0.55)', border:'none', borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <X size={13} color="#fff" />
                    </button>
                  </div>
                )}
              </div>

              {addError && (
                <div style={{ padding:'9px 12px', background:'var(--red-light)', border:'1px solid #fecaca', borderRadius:'var(--radius-sm)', fontSize:13, color:'var(--red)' }}>{addError}</div>
              )}
              <button onClick={addExpense} disabled={saving || !form.description || !form.amount || !form.kid_id || !form.category_id}
                style={{ padding:13, background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:'pointer', opacity:(saving || !form.description || !form.amount || !form.kid_id || !form.category_id)?0.5:1 }}>
                {saving ? (receiptFile ? 'Uploading receipt…' : 'Saving…') : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* RECEIPT VIEWER LIGHTBOX */}
      {viewReceipt && (
        <div
          onClick={() => setViewReceipt(null)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, cursor:'zoom-out' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position:'relative', maxWidth:760, width:'100%' }}>
            {/* Header bar */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Paperclip size={15} color="#fff" />
                <span style={{ color:'#fff', fontSize:14, fontWeight:600 }}>Receipt</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={viewReceipt} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                  <Eye size={13} /> Open full size
                </a>
                <button onClick={() => setViewReceipt(null)}
                  style={{ width:32, height:32, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <X size={15} color="#fff" />
                </button>
              </div>
            </div>
            {/* Image or PDF */}
            {viewReceipt.toLowerCase().endsWith('.pdf') ? (
              <iframe src={viewReceipt} style={{ width:'100%', height:'75vh', borderRadius:12, border:'none' }} title="Receipt PDF" />
            ) : (
              <img src={viewReceipt} alt="Receipt" style={{ width:'100%', maxHeight:'80vh', objectFit:'contain', borderRadius:12, display:'block' }} />
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}

function KpiCard({ label, value, sub, color }: { label:string; value:string; sub:string; color:string }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', padding:'13px 12px', boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:color }} />
        <div style={{ fontSize:10, fontWeight:600, color:'var(--slate-400)', letterSpacing:'0.05em', textTransform:'uppercase' as const, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{label}</div>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--slate-900)', fontVariantNumeric:'tabular-nums', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2 }}>{sub}</div>
    </div>
  )
}

function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-400)', letterSpacing:'0.07em', textTransform:'uppercase' as const, marginBottom:10, paddingLeft:2 }}>{title}</div>
      {children}
    </div>
  )
}
