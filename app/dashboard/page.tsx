'use client'
import React from 'react'
import {
  BanknotesIcon, CheckCircleIcon, ClockIcon, ExclamationCircleIcon,
  PlusIcon, XMarkIcon, HandThumbUpIcon, HandThumbDownIcon,
  MagnifyingGlassIcon, Cog6ToothIcon, ChartBarIcon,
  DocumentTextIcon, HomeIcon, PaperClipIcon, PencilIcon, EyeIcon,
  ArrowDownTrayIcon, StarIcon, LockClosedIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { CURRENCIES } from '@/components/CurrencySelect'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { logAudit } from '@/lib/audit'

// ── Types ────────────────────────────────────────────────────────
type SettlementStatus = 'outstanding' | 'partial' | 'pending_approval' | 'settled'
type NavTab = 'home' | 'expenses' | 'add' | 'analytics' | 'settings'
interface Kid      { id: string; name: string; color: string }
interface Category { id: string; name: string; color: string }
interface Expense {
  id: string; description: string; amount: number; currency: string
  date: string; split_pct: number; created_at: string
  paid_by_user_id: string | null; created_by: string | null
  receipt_url: string | null; archived: boolean | null
  settlement_status: SettlementStatus
  settled_amount: number; settled_at: string | null; settlement_note: string | null
  pending_approval_by: string | null; pending_approval_amount: number | null
  pending_approval_note: string | null; pending_approval_at: string | null
  kid:      { id: string; name: string; color: string } | null
  category: { id: string; name: string; color: string } | null
}
interface Usage { plan: 'free'|'premium'; count: number; can_add: boolean; limit: number|null }

// ── Helpers ──────────────────────────────────────────────────────
const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtShort = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

const STATUS: Record<SettlementStatus, { label: string; color: string; bg: string; border: string }> = {
  outstanding:      { label: 'Unpaid',            color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  partial:          { label: 'Partial',           color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  pending_approval: { label: 'Pending approval',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  settled:          { label: 'Settled',           color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
}

// ── Category icons mapping ────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  medical: '🏥', school: '🎓', sports: '⚽', food: '🍕', dental: '🦷',
  clothing: '👕', travel: '✈️', excursions: '🗺️', activities: '🎨', other: '📌',
}
function catEmoji(name: string) {
  const k = name.toLowerCase()
  for (const [key, emoji] of Object.entries(CAT_EMOJI)) { if (k.includes(key)) return emoji }
  return '📋'
}

const INP: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase' }

// ── Main Component ───────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { ctx, loading: ctxLoading, error: ctxError, reload: reloadCtx } = useHousehold()

  const [expenses,   setExpenses]   = useState<Expense[]>([])
  const [kids,       setKids]       = useState<Kid[]>([])
  const [cats,       setCats]       = useState<Category[]>([])
  const [usage,      setUsage]      = useState<Usage|null>(null)
  const [splitRules, setSplitRules] = useState<Record<string,{split_pct:number;is_optional:boolean}>>({})
  const [kidRules,   setKidRules]   = useState<Record<string,{split_pct:number;is_optional:boolean}>>({})
  const [currency,   setCurrency]   = useState('AUD')
  const [period,     setPeriod]     = useState<'month'|'3month'|'year'|'all'>('month')
  const [pageLoad,   setPageLoad]   = useState(false)
  const [navTab,     setNavTab]     = useState<NavTab>('home')

  // Expense filter on expenses tab
  const [expFilter,  setExpFilter]  = useState<'all'|SettlementStatus>('all')
  const [search,     setSearch]     = useState('')

  // Modals
  const [addModal,      setAddModal]      = useState(false)
  const [editingId,     setEditingId]     = useState<string|null>(null)
  const [detailExp,     setDetailExp]     = useState<Expense|null>(null)
  const [settleModal,   setSettleModal]   = useState<Expense|null>(null)
  const [saving,        setSaving]        = useState(false)
  const [settling,      setSettling]      = useState(false)
  const [saveErr,       setSaveErr]       = useState('')
  const [receiptFile,   setReceiptFile]   = useState<File|null>(null)
  const [receiptPreview,setReceiptPreview]= useState<string|null>(null)
  const [viewReceipt,   setViewReceipt]   = useState<string|null>(null)
  const [toast,         setToast]         = useState('')
  const [drillCat,      setDrillCat]      = useState<string|null>(null)
  const [drillKid,      setDrillKid]      = useState<string|null>(null)

  // Month selector for period header
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  const EMPTY = { description:'', amount:'', currency:'AUD', kid_id:'', category_id:'', paid_by_user_id:'', date:now.toISOString().split('T')[0], split_pct:50 }
  const [form, setForm] = useState(EMPTY)
  const F = (k: Partial<typeof form>) => setForm(p => ({ ...p, ...k }))

  const SETTLE_EMPTY = { amount:'', note:'', settlement_date:now.toISOString().split('T')[0] }
  const [settleForm, setSettleForm] = useState(SETTLE_EMPTY)

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  const loadData = useCallback(async () => {
    if (!ctx) return
    setPageLoad(true)
    try {
      const [e, k, c, u, r] = await Promise.all([
        supabase.from('expenses')
          .select('id,description,amount,currency,date,created_at,split_pct,paid_by_user_id,created_by,receipt_url,archived,settlement_status,settled_amount,settled_at,settlement_note,pending_approval_by,pending_approval_amount,pending_approval_note,pending_approval_at,kid:kids(id,name,color),category:categories(id,name,color)')
          .eq('household_id', ctx.household_id).eq('archived', false)
          .order('created_at', { ascending: false }),
        supabase.from('kids').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
        supabase.from('categories').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
        supabase.rpc('get_my_usage'),
        supabase.from('split_rules').select('category_id,kid_id,split_pct,is_optional').eq('household_id', ctx.household_id),
      ])
      setExpenses((e.data ?? []) as unknown as Expense[])
      setKids(k.data ?? [])
      setCats(c.data ?? [])
      if (!u.error && u.data) setUsage(u.data as Usage)
      const rm: Record<string,{split_pct:number;is_optional:boolean}> = {}
      const km: Record<string,{split_pct:number;is_optional:boolean}> = {}
      ;(r.data ?? []).forEach((rule: any) => {
        if (rule.category_id) rm[rule.category_id] = { split_pct: rule.split_pct, is_optional: rule.is_optional }
        if (rule.kid_id)      km[rule.kid_id]      = { split_pct: rule.split_pct, is_optional: rule.is_optional }
      })
      setSplitRules(rm); setKidRules(km)
    } catch(err) { console.error(err) }
    setPageLoad(false)
  }, [ctx])

  const ctxIdRef = useRef<string|null>(null)
  useEffect(() => {
    if (ctx && ctx.household_id !== ctxIdRef.current) { ctxIdRef.current = ctx.household_id; loadData() }
  }, [ctx, loadData])

  // ── Period filtered expenses ──────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(e => e.currency === currency).filter(e => {
      if (period === 'all') return true
      const d = new Date(e.date)
      if (period === 'month')  return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
      if (period === '3month') return (now.getTime()-d.getTime())/86400000 <= 90
      if (period === 'year')   return d.getFullYear()===now.getFullYear()
      return true
    })
  }, [expenses, currency, period]) // eslint-disable-line

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = filtered.reduce((s,e) => s+Number(e.amount), 0)
    const mePaid  = me ? filtered.filter(e=>e.paid_by_user_id===me.user_id).reduce((s,e)=>s+Number(e.amount),0) : 0
    const coPaid  = co ? filtered.filter(e=>e.paid_by_user_id===co.user_id).reduce((s,e)=>s+Number(e.amount),0) : 0
    let myShare = 0
    filtered.forEach(e => { myShare += Number(e.amount) * (e.created_by===ctx?.myUserId ? e.split_pct : 100-e.split_pct) / 100 })
    const balance = mePaid - myShare // positive → co owes me; negative → I owe co

    const settled     = filtered.filter(e=>e.settlement_status==='settled')
    const outstanding = filtered.filter(e=>e.settlement_status==='outstanding')
    const pending     = filtered.filter(e=>e.settlement_status==='pending_approval')
    const settledAmt  = settled.reduce((s,e)=>s+Number(e.amount),0)

    // By category
    const byCat: Record<string,{id:string;name:string;color:string;amount:number;count:number}> = {}
    filtered.forEach(e => {
      if (!e.category?.id) return
      if (!byCat[e.category.id]) byCat[e.category.id] = { id:e.category.id, name:e.category.name, color:cats.find(c=>c.id===e.category?.id)?.color??'#374151', amount:0, count:0 }
      byCat[e.category.id].amount += Number(e.amount)
      byCat[e.category.id].count++
    })

    // By kid
    const byKid: Record<string,{id:string;name:string;color:string;amount:number;count:number}> = {}
    filtered.forEach(e => {
      if (!e.kid?.id) return
      if (!byKid[e.kid.id]) byKid[e.kid.id] = { id:e.kid.id, name:e.kid.name, color:e.kid.color, amount:0, count:0 }
      byKid[e.kid.id].amount += Number(e.amount)
      byKid[e.kid.id].count++
    })

    // Monthly bar data
    const monthlyMap: Record<string,{month:string;settled:number;outstanding:number}> = {}
    expenses.filter(e=>e.currency===currency).forEach(e => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const lbl = d.toLocaleDateString('en-AU',{month:'short',year:'2-digit'})
      if (!monthlyMap[key]) monthlyMap[key] = {month:lbl,settled:0,outstanding:0}
      if (e.settlement_status==='settled') monthlyMap[key].settled += Number(e.amount)
      else monthlyMap[key].outstanding += Number(e.amount)
    })
    const monthly = Object.entries(monthlyMap).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([,v])=>v)

    return {
      total, mePaid, coPaid, myShare, balance,
      count: filtered.length,
      settledCount: settled.length, settledAmt,
      outstandingCount: outstanding.length,
      pendingCount: pending.length,
      byCat: Object.values(byCat).sort((a,b)=>b.amount-a.amount),
      byKid: Object.values(byKid).sort((a,b)=>b.amount-a.amount),
      monthly,
      splitData: me&&co ? [
        {name:me.display_name, value:parseFloat(myShare.toFixed(2)),           color:me.color||'#1a3a6b'},
        {name:co.display_name, value:parseFloat((total-myShare).toFixed(2)), color:co.color||'#2ec4a0'},
      ] : [],
    }
  }, [filtered, expenses, me, co, ctx, cats, currency])

  const pendingMyApproval    = useMemo(() => expenses.filter(e=>e.settlement_status==='pending_approval'&&e.pending_approval_by!==ctx?.myUserId&&e.currency===currency), [expenses,ctx,currency])
  const awaitingTheirApproval = useMemo(() => expenses.filter(e=>e.settlement_status==='pending_approval'&&e.pending_approval_by===ctx?.myUserId&&e.currency===currency), [expenses,ctx,currency])
  const isPremium = usage?.plan === 'premium'
  const atLimit   = usage ? !usage.can_add : false
  const cs        = sym(currency)
  const currentMY = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  // ── Actions ──────────────────────────────────────────────────
  function openAdd(exp?: Expense) {
    if (!exp && usage && usage.plan==='free' && !usage.can_add) { showToast('Free plan limit reached — upgrade to Premium'); return }
    if (exp) {
      setEditingId(exp.id)
      setForm({ description:exp.description, amount:String(exp.amount), currency:exp.currency, kid_id:exp.kid?.id??'', category_id:exp.category?.id??'', paid_by_user_id:exp.paid_by_user_id??'', date:exp.date, split_pct:exp.split_pct })
    } else {
      setEditingId(null)
      const autoKid = kids.length===1 ? kids[0].id : ''
      const autoCat = cats.length===1 ? cats[0].id : ''
      const autoSplit = (autoKid&&kidRules[autoKid]&&!kidRules[autoKid].is_optional) ? kidRules[autoKid].split_pct
                      : (autoCat&&splitRules[autoCat]&&!splitRules[autoCat].is_optional) ? splitRules[autoCat].split_pct : 50
      setForm({ ...EMPTY, kid_id:autoKid, category_id:autoCat, paid_by_user_id:ctx?.myUserId??'', split_pct:autoSplit })
    }
    setReceiptFile(null); setReceiptPreview(null); setSaveErr('')
    setAddModal(true); setNavTab('home')
  }

  function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10*1024*1024) { setSaveErr('Max 10 MB'); return }
    setReceiptFile(file)
    const r = new FileReader(); r.onload = ev => setReceiptPreview(ev.target?.result as string); r.readAsDataURL(file)
  }

  async function submitExpense() {
    if (!form.description.trim()) { setSaveErr('Enter a description'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setSaveErr('Enter a valid amount'); return }
    if (!form.kid_id) { setSaveErr('Select a child'); return }
    if (!form.category_id) { setSaveErr('Select a category'); return }
    if (!ctx) return
    setSaving(true); setSaveErr('')
    let receipt_url: string|null|undefined = undefined
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()??'jpg'
      const path = `${ctx.household_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, receiptFile, {upsert:true})
      if (upErr) { setSaveErr('Upload failed: '+upErr.message); setSaving(false); return }
      const { data: ud } = supabase.storage.from('receipts').getPublicUrl(path)
      receipt_url = ud?.publicUrl??null
    }
    const payload: any = { description:form.description.trim(), amount:parseFloat(form.amount), currency:form.currency, kid_id:form.kid_id, category_id:form.category_id, paid_by_user_id:form.paid_by_user_id||null, date:form.date, split_pct:form.split_pct }
    if (receipt_url !== undefined) payload.receipt_url = receipt_url
    let error: any
    if (editingId) { ;({error} = await supabase.from('expenses').update(payload).eq('id', editingId)) }
    else { payload.household_id=ctx.household_id; payload.created_by=ctx.myUserId; ;({error} = await supabase.from('expenses').insert(payload)) }
    setSaving(false)
    if (error) { setSaveErr(error.message); return }
    await logAudit({household_id:ctx.household_id,user_id:ctx.myUserId,actor_name:me?.display_name??'',action:editingId?'expense.edit':'expense.add',entity:form.description.trim()})
    setAddModal(false); setDetailExp(null); loadData()
  }

  async function deleteExpense(id: string, receiptUrl: string|null) {
    if (!confirm('Delete this expense?')) return
    if (receiptUrl) { const path=receiptUrl.split('/receipts/')[1]; if(path) await supabase.storage.from('receipts').remove([decodeURIComponent(path)]) }
    await supabase.from('expenses').delete().eq('id', id)
    await logAudit({household_id:ctx!.household_id,user_id:ctx!.myUserId,actor_name:me?.display_name??'',action:'expense.delete',entity:''})
    setDetailExp(null); loadData()
  }

  function expenseOwed(exp: Expense) {
    const isMine = exp.created_by===ctx?.myUserId
    return Number(exp.amount)*(isMine?(100-exp.split_pct):exp.split_pct)/100
  }

  function openSettle(exp: Expense) {
    const rem = expenseOwed(exp) - Number(exp.settled_amount??0)
    setSettleForm({amount:rem.toFixed(2),note:'',settlement_date:now.toISOString().split('T')[0]})
    setSettleModal(exp)
  }

  async function submitSettlement() {
    if (!settleModal||!ctx) return
    const amt = parseFloat(settleForm.amount)
    if (isNaN(amt)||amt<=0) return
    setSettling(true)
    const payer    = settleModal.created_by===ctx.myUserId ? co?.user_id : ctx.myUserId
    const receiver = settleModal.created_by===ctx.myUserId ? ctx.myUserId : co?.user_id
    if (!payer||!receiver) { setSettling(false); return }
    const {error} = await supabase.rpc('record_settlement',{hh_id:ctx.household_id,paid_by_uid:payer,recv_by_uid:receiver,amt,curr:settleModal.currency,note_text:settleForm.note||null,settle_date:settleForm.settlement_date,exp_id:settleModal.id,month_yr:null})
    setSettling(false)
    if (error) { alert(error.message); return }
    setSettleModal(null); setDetailExp(null); loadData()
    showToast(`Settlement sent to ${co?.display_name??'co-parent'} for approval`)
  }

  async function requestMonthSettlement() {
    if (!ctx||!me||!co) return
    if (!confirm(`Send settlement request for ${monthLabel} to ${co.display_name}?`)) return
    await supabase.rpc('record_settlement',{hh_id:ctx.household_id,paid_by_uid:co.user_id,recv_by_uid:me.user_id,amt:Math.abs(stats.balance),curr:currency,note_text:`Monthly settlement`,settle_date:now.toISOString().split('T')[0],exp_id:null,month_yr:currentMY})
    loadData(); showToast(`Settlement request sent to ${co.display_name}`)
  }

  async function approveSettlement(expId: string) {
    const {error} = await supabase.rpc('approve_settlement',{exp_id:expId})
    if (error) { alert(error.message); return }
    loadData(); showToast('Settlement approved ✓')
  }

  async function rejectSettlement(expId: string) {
    const {error} = await supabase.rpc('reject_settlement',{exp_id:expId})
    if (error) { alert(error.message); return }
    loadData(); showToast('Settlement rejected')
  }

  function exportCSV() {
    if (!isPremium) return
    const rows = [['Date','Description','Child','Category','Amount','Currency','Split%','Paid By','Status'],
      ...filtered.map(e=>[e.date,e.description,e.kid?.name??'',e.category?.name??'',e.amount,e.currency,e.split_pct,ctx?.members.find(m=>m.user_id===e.paid_by_user_id)?.display_name??'',e.settlement_status])]
    const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`coparent-${now.toISOString().split('T')[0]}.csv`; a.click()
  }

  // ── Loading / Error states ────────────────────────────────────
  if (!ctxLoading&&!ctx&&!ctxError) return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif',padding:24}}>
      <div style={{width:40,height:40,border:'3px solid #e2e8f0',borderTopColor:'#1a3a6b',borderRadius:'50%',animation:'spin .7s linear infinite',marginBottom:16}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{fontSize:16,fontWeight:700,color:'#0f172a',marginBottom:6}}>Setting up your account…</div>
      <div style={{fontSize:13,color:'#64748b',textAlign:'center'}}>Creating your household and categories. Just a moment.</div>
    </div>
  )
  if (ctxLoading) return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'2px solid #e2e8f0',borderTopColor:'#1a3a6b',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (ctxError) return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,fontFamily:'system-ui,sans-serif'}}>
      <p style={{color:'#dc2626',fontSize:14}}>{ctxError}</p>
      <button onClick={reloadCtx} style={{padding:'8px 18px',background:'#0f172a',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:14}}>Retry</button>
    </div>
  )

  // ── Filtered for expenses tab ─────────────────────────────────
  const expTabList = filtered
    .filter(e => expFilter==='all' ? true : e.settlement_status===expFilter)
    .filter(e => search ? e.description.toLowerCase().includes(search.toLowerCase()) || (e.kid?.name??'').toLowerCase().includes(search.toLowerCase()) || (e.category?.name??'').toLowerCase().includes(search.toLowerCase()) : true)

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',paddingBottom:80}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * {box-sizing:border-box;}`}</style>

      {/* ── HOME TAB ──────────────────────────────────────────── */}
      {navTab==='home' && (
        <div style={{maxWidth:520,margin:'0 auto',padding:'0 0 16px'}}>

          {/* Header */}
          <div style={{padding:'20px 20px 16px',background:'#fff',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>Hello, {me?.display_name?.split(' ')[0] ?? 'there'} 👋</div>
                <div style={{fontSize:13,color:'#94a3b8',marginTop:2}}>{co ? `Shared with ${co.display_name}` : 'Your household'}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {/* Period selector */}
                <select value={period} onChange={e=>setPeriod(e.target.value as any)}
                  style={{padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontWeight:600,background:'#fff',color:'#374151',cursor:'pointer',outline:'none'}}>
                  <option value="month">{monthLabel}</option>
                  <option value="3month">Last 3 months</option>
                  <option value="year">This year</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{padding:'16px 16px 0'}}>

            {/* Free plan bar */}
            {usage && !isPremium && (
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'10px 14px',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>
                  <span>Free plan · {usage.count} / 10 expenses used</span>
                  {atLimit && <span style={{color:'#dc2626',fontWeight:700}}>Limit reached</span>}
                </div>
                <div style={{height:5,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min((usage.count/10)*100,100)}%`,background:atLimit?'#dc2626':'#1a3a6b',borderRadius:3}}/>
                </div>
              </div>
            )}

            {/* ── BALANCE HERO CARD ── */}
            {me && co && (
              <div style={{background:stats.balance>=0?'#fff4f4':'#fff',border:`2px solid ${stats.balance>=0?'#fecaca':'#e2e8f0'}`,borderRadius:16,padding:'20px',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:'#64748b',marginBottom:4}}>
                  {stats.balance>=0 ? 'You are owed' : 'You owe'}
                </div>
                <div style={{fontSize:38,fontWeight:800,color:stats.balance>=0?'#dc2626':'#0f172a',letterSpacing:'-1px',marginBottom:4}}>
                  {cs}{Math.abs(stats.balance).toFixed(2)}
                </div>
                <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>
                  {stats.balance>=0 ? `${co.display_name} owes you this amount` : `You owe ${co.display_name} this amount`} · {period==='month'?monthLabel:period==='3month'?'Last 3 months':period==='year'?'This year':'All time'}
                </div>
                {/* Progress bar */}
                {stats.total > 0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min((stats.settledAmt/stats.total)*100,100)}%`,background:'#059669',borderRadius:4,transition:'width .4s'}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8',marginTop:4}}>
                      <span>{cs}{stats.settledAmt.toFixed(2)} Settled</span>
                      <span>{cs}{(stats.total-stats.settledAmt).toFixed(2)} Remaining</span>
                    </div>
                  </div>
                )}
                {/* Action buttons */}
                {Math.abs(stats.balance) > 0.01 && (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button onClick={requestMonthSettlement}
                      style={{width:'100%',padding:'13px',background:'#059669',color:'#fff',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                      Request Settlement
                    </button>
                  </div>
                )}
                {Math.abs(stats.balance) <= 0.01 && stats.count > 0 && (
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#f0fdf4',borderRadius:10}}>
                    <CheckCircleIcon style={{width:18,height:18,color:'#059669'}}/>
                    <span style={{fontSize:13,fontWeight:600,color:'#059669'}}>All settled for this period 🎉</span>
                  </div>
                )}
              </div>
            )}

            {/* ── PENDING APPROVALS ── */}
            {pendingMyApproval.length > 0 && (
              <div style={{background:'#f5f3ff',border:'2px solid #7c3aed',borderRadius:14,padding:'14px',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:800,color:'#7c3aed',marginBottom:10}}>
                  🔔 Needs Your Action · {pendingMyApproval.length}
                </div>
                {pendingMyApproval.map(exp => (
                  <div key={exp.id} style={{background:'#fff',borderRadius:10,padding:'12px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{exp.description}</div>
                        <div style={{fontSize:11,color:'#94a3b8'}}>{exp.kid?.name&&`${exp.kid.name} · `}{exp.category?.name} · {fmtShort(exp.date)}</div>
                        {exp.pending_approval_note && <div style={{fontSize:11,color:'#7c3aed',marginTop:2,fontStyle:'italic'}}>"{exp.pending_approval_note}"</div>}
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <span style={{padding:'2px 8px',background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:99,fontSize:10,fontWeight:700,color:'#7c3aed'}}>Pending approval</span>
                        <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginTop:4}}>{cs}{Number(exp.pending_approval_amount??exp.amount).toFixed(2)}</div>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>{cs}{Number(exp.pending_approval_amount??0).toFixed(2)} · {co?.display_name??'Co-parent'} paid</div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>approveSettlement(exp.id)}
                        style={{flex:1,padding:'8px',background:'#059669',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                        <HandThumbUpIcon style={{width:14,height:14}}/> Approve
                      </button>
                      <button onClick={()=>rejectSettlement(exp.id)}
                        style={{flex:1,padding:'8px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                        <HandThumbDownIcon style={{width:14,height:14}}/> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {awaitingTheirApproval.length > 0 && (
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:12,padding:'11px 14px',marginBottom:14,fontSize:13,color:'#92400e'}}>
                ⏳ {awaitingTheirApproval.length} settlement{awaitingTheirApproval.length>1?'s':''} waiting for {co?.display_name??'co-parent'}&apos;s approval
              </div>
            )}

            {/* ── OVERVIEW CARDS ── */}
            <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:10}}>Overview for {period==='month'?monthLabel:period==='3month'?'Last 3 months':period==='year'?'This year':'All time'}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[
                {label:'Total Expenses',     value:`${cs}${stats.total.toFixed(2)}`,   sub:`${stats.count} expense${stats.count!==1?'s':''}`, icon:'💰', filter:'all'},
                {label:`${me?.display_name?.split(' ')[0]??'You'} Paid`, value:`${cs}${stats.mePaid.toFixed(2)}`, sub:`${stats.total>0?(stats.mePaid/stats.total*100).toFixed(0):0}%`, icon:'👤', filter:'all'},
                {label:`${co?.display_name?.split(' ')[0]??'Co-parent'} Paid`, value:`${cs}${stats.coPaid.toFixed(2)}`, sub:`${stats.total>0?(stats.coPaid/stats.total*100).toFixed(0):0}%`, icon:'👤', filter:'all'},
                {label:'Settled',           value:`${cs}${stats.settledAmt.toFixed(2)}`, sub:`${stats.settledCount} expense${stats.settledCount!==1?'s':''}`, icon:'✅', filter:'settled'},
              ].map(card => (
                <div key={card.label} onClick={()=>{setNavTab('expenses');setExpFilter(card.filter as any)}}
                  style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'14px',cursor:'pointer',transition:'box-shadow .15s'}}
                  onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)')}
                  onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}>
                  <div style={{fontSize:20,marginBottom:6}}>{card.icon}</div>
                  <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginBottom:4}}>{card.label}</div>
                  <div style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>{card.value}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>{card.sub}</div>
                  <div style={{fontSize:11,color:'#1a3a6b',fontWeight:600,marginTop:6}}>View details →</div>
                </div>
              ))}
            </div>

            {/* ── NEEDS ACTION / RECENT split ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {/* Needs action */}
              <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Needs Your Action</span>
                  {(stats.outstandingCount+pendingMyApproval.length) > 0 && <span style={{width:20,height:20,borderRadius:'50%',background:'#dc2626',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{stats.outstandingCount+pendingMyApproval.length}</span>}
                </div>
                {filtered.filter(e=>e.settlement_status==='outstanding').slice(0,2).map(exp=>(
                  <div key={exp.id} onClick={()=>setDetailExp(exp)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #f8fafc',cursor:'pointer'}}>
                    <div style={{width:32,height:32,borderRadius:9,background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                      {catEmoji(exp.category?.name??'')}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.description}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{fmtShort(exp.date)}</div>
                    </div>
                  </div>
                ))}
                {stats.outstandingCount === 0 && pendingMyApproval.length === 0 && (
                  <div style={{fontSize:12,color:'#94a3b8',textAlign:'center',padding:'12px 0'}}>All clear! 🎉</div>
                )}
                <button onClick={()=>{setNavTab('expenses');setExpFilter('outstanding')}}
                  style={{marginTop:8,fontSize:12,color:'#1a3a6b',fontWeight:600,background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                  View all →
                </button>
              </div>

              {/* Recent Activity */}
              <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>Recent Activity</span>
                </div>
                {filtered.slice(0,3).map(exp=>{
                  const st = STATUS[exp.settlement_status]
                  return (
                    <div key={exp.id} onClick={()=>setDetailExp(exp)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #f8fafc',cursor:'pointer'}}>
                      <div style={{width:32,height:32,borderRadius:9,background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                        {catEmoji(exp.category?.name??'')}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.description}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{exp.category?.name} · {fmtShort(exp.date)}</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{cs}{Number(exp.amount).toFixed(2)}</div>
                        <span style={{fontSize:10,fontWeight:700,color:st.color,padding:'1px 5px',background:st.bg,borderRadius:99,border:`1px solid ${st.border}`}}>{st.label}</span>
                      </div>
                    </div>
                  )
                })}
                <button onClick={()=>setNavTab('expenses')}
                  style={{marginTop:8,fontSize:12,color:'#1a3a6b',fontWeight:600,background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:4}}>
                  View all →
                </button>
              </div>
            </div>

            {/* How settlements work */}
            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{width:36,height:36,borderRadius:10,background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:3}}>How settlements work</div>
                <div style={{fontSize:12,color:'#64748b',lineHeight:1.6}}>When you settle an expense, the other parent will be notified to review and approve. Once they approve, the expense will be marked as fully settled for both of you.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB ─────────────────────────────────────────── */}
      {navTab==='expenses' && (
        <div style={{maxWidth:520,margin:'0 auto',padding:'0 0 16px'}}>
          <div style={{padding:'20px 16px 12px',background:'#fff',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a',marginBottom:12}}>All Expenses</div>
            {/* Search */}
            <div style={{position:'relative',marginBottom:12}}>
              <MagnifyingGlassIcon style={{width:15,height:15,color:'#94a3b8',position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses…"
                style={{...INP,paddingLeft:34,border:'1px solid #e2e8f0',background:'#f8fafc'}}/>
            </div>
            {/* Filter tabs */}
            <div style={{display:'flex',gap:4}}>
              {(['all','outstanding','partial','settled'] as const).map(f=>(
                <button key={f} onClick={()=>setExpFilter(f)}
                  style={{flex:1,padding:'6px 4px',border:'none',borderBottom:`2px solid ${expFilter===f?'#1a3a6b':'transparent'}`,background:'transparent',fontSize:11,fontWeight:600,color:expFilter===f?'#1a3a6b':'#94a3b8',cursor:'pointer'}}>
                  {f==='all'?'All Expenses':f==='outstanding'?'Unpaid':f==='partial'?'Partial':'Settled'}
                </button>
              ))}
            </div>
          </div>

          <div style={{padding:'12px 16px'}}>
            {/* Table header */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 90px 80px 70px 70px',gap:8,padding:'8px 12px',marginBottom:4}}>
              {['Expense','Date','Category','Total','Status','Action'].slice(0,5).map((h,i)=>(
                <div key={h} style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',textAlign:i>0?'right':'left'}}>{h}</div>
              ))}
            </div>

            {pageLoad ? <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Loading…</div>
            : expTabList.length===0 ? (
              <div style={{textAlign:'center',padding:'40px 0',color:'#94a3b8',fontSize:14}}>No expenses found</div>
            ) : (
              expTabList.map(exp => {
                const st = STATUS[exp.settlement_status]
                const payer = ctx?.members.find(m=>m.user_id===exp.paid_by_user_id)
                const isOwner = exp.created_by===ctx?.myUserId
                const owed = expenseOwed(exp)
                const canApprove = exp.settlement_status==='pending_approval'&&exp.pending_approval_by!==ctx?.myUserId
                return (
                  <div key={exp.id} onClick={()=>setDetailExp(exp)}
                    style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:12,padding:'12px',marginBottom:8,cursor:'pointer',display:'grid',gridTemplateColumns:'1fr 90px 80px',gap:8,alignItems:'center'}}>
                    {/* Left: avatar + info */}
                    <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:10,background:exp.kid?.color??'#1a3a6b',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:14,flexShrink:0}}>
                        {exp.kid?.name?.[0]?.toUpperCase()??'?'}
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.description}</div>
                        <div style={{fontSize:11,color:'#94a3b8'}}>{exp.category?.name} · {exp.kid?.name}</div>
                      </div>
                    </div>
                    {/* Center: amount + split */}
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{cs}{Number(exp.amount).toFixed(2)}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>Split {exp.split_pct}/{100-exp.split_pct}</div>
                      {payer && <div style={{fontSize:10,color:'#64748b',marginTop:1}}>
                        {payer.user_id===ctx?.myUserId?'You':payer.display_name?.split(' ')[0]} paid
                      </div>}
                    </div>
                    {/* Right: status */}
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:13,fontWeight:700,color:st.color,marginBottom:2}}>{st.label}</div>
                      {exp.settlement_status==='settled' && <div style={{fontSize:11,fontWeight:600,color:'#059669'}}>{cs}{Number(exp.settled_amount).toFixed(2)}</div>}
                      {exp.settlement_status==='outstanding' && <div style={{fontSize:11,color:'#dc2626'}}>{cs}{owed.toFixed(2)} owed</div>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ─────────────────────────────────────────── */}
      {navTab==='analytics' && (
        <div style={{maxWidth:520,margin:'0 auto',padding:'0 0 16px'}}>
          <div style={{padding:'20px 16px 12px',background:'#fff',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>Analytics</div>
            {isPremium && <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:'#374151'}}><ArrowDownTrayIcon style={{width:13,height:13}}/> CSV</button>}
          </div>
          <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:14}}>

            {/* Monthly bar chart */}
            {stats.monthly.length > 0 && (
              <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'16px'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Monthly spend</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={stats.monthly} barSize={22} margin={{top:0,right:4,bottom:0,left:-10}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`${cs}${v}`}/>
                    <Tooltip formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                    <Bar dataKey="settled" name="Settled" fill="#059669" radius={[3,3,0,0]} stackId="a"/>
                    <Bar dataKey="outstanding" name="Outstanding" fill="#fca5a5" radius={[3,3,0,0]} stackId="a"/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{display:'flex',justifyContent:'center',gap:16,marginTop:6}}>
                  {[{c:'#059669',l:'Settled'},{c:'#fca5a5',l:'Outstanding'}].map(x=>(
                    <div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#64748b'}}>
                      <div style={{width:10,height:10,borderRadius:2,background:x.c}}/>{x.l}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2-col charts */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {/* Cost split */}
              {stats.splitData.length===2 && stats.total>0 && (
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Cost split</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={stats.splitData} cx="50%" cy="50%" outerRadius={50} dataKey="value" labelLine={false}>
                        {stats.splitData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                      </Pie>
                      <Tooltip formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:6}}>
                    {stats.splitData.map(d=>(
                      <div key={d.name} style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/>
                        <span style={{color:'#64748b',flex:1}}>{d.name.split(' ')[0]}</span>
                        <span style={{fontWeight:700,color:'#0f172a'}}>{cs}{d.value.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By category — drillable */}
              {stats.byCat.length > 0 && (
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>
                    {drillCat ? <button onClick={()=>setDrillCat(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#1a3a6b',padding:0,fontWeight:700}}>← All categories</button> : 'By category'}
                  </div>
                  {drillCat ? (
                    <div style={{maxHeight:160,overflowY:'auto',marginTop:6}}>
                      {filtered.filter(e=>e.category?.id===drillCat).map(e=>(
                        <div key={e.id} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'4px 0',borderBottom:'1px solid #f8fafc'}}>
                          <span style={{color:'#0f172a'}}>{e.description}</span>
                          <span style={{fontWeight:600}}>{cs}{Number(e.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={stats.byCat} cx="50%" cy="50%" outerRadius={50} dataKey="amount" labelLine={false}
                          onClick={(d:any)=>setDrillCat(d.id)} style={{cursor:'pointer'}}>
                          {stats.byCat.map((d,i)=><Cell key={i} fill={d.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {/* By kid — drillable */}
              {stats.byKid.length > 0 && (
                <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:14,padding:'14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>
                    {drillKid ? <button onClick={()=>setDrillKid(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#1a3a6b',padding:0,fontWeight:700}}>← All children</button> : 'By child'}
                  </div>
                  {drillKid ? (
                    <div style={{maxHeight:160,overflowY:'auto',marginTop:6}}>
                      {filtered.filter(e=>e.kid?.id===drillKid).map(e=>(
                        <div key={e.id} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'4px 0',borderBottom:'1px solid #f8fafc'}}>
                          <div><div style={{color:'#0f172a'}}>{e.description}</div><div style={{fontSize:10,color:'#94a3b8'}}>{e.category?.name}</div></div>
                          <span style={{fontWeight:600}}>{cs}{Number(e.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={stats.byKid} cx="50%" cy="50%" outerRadius={50} dataKey="amount" labelLine={false}
                          onClick={(d:any)=>setDrillKid(d.id)} style={{cursor:'pointer'}}>
                          {stats.byKid.map((d,i)=><Cell key={i} fill={d.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────────────────── */}
      {navTab==='settings' && (
        <div style={{maxWidth:520,margin:'0 auto',padding:'0 0 16px'}}>
          <div style={{padding:'20px 16px 12px',background:'#fff',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>Settings</div>
          </div>
          <div style={{padding:'16px'}}>
            {/* Quick links */}
            {[
              {label:'Manage Kids',       icon:'👶', path:'/kids'},
              {label:'Parents & Household', icon:'👨‍👩‍👧', path:'/parents'},
              {label:'Categories',        icon:'🏷️', path:'/categories'},
              {label:'Expense Rules',     icon:'⚡', path:'/rules'},
              {label:'Monthly Statements', icon:'📋', path:'/statements'},
            ].map(item=>(
              <button key={item.path} onClick={()=>router.push(item.path)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px',background:'#fff',border:'1px solid #f1f5f9',borderRadius:12,marginBottom:8,cursor:'pointer',textAlign:'left'}}>
                <span style={{fontSize:20}}>{item.icon}</span>
                <span style={{fontSize:14,fontWeight:600,color:'#0f172a',flex:1}}>{item.label}</span>
                <span style={{color:'#94a3b8',fontSize:16}}>›</span>
              </button>
            ))}

            {/* Currency */}
            <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:12,padding:'14px',marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginBottom:8}}>Currency</label>
              <select value={currency} onChange={e=>setCurrency(e.target.value)} style={{...INP,border:'1px solid #e2e8f0'}}>
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </div>

            {/* Plan */}
            <div style={{background:'#fff',border:'1px solid #f1f5f9',borderRadius:12,padding:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>Your plan</div>
                {isPremium
                  ? <span style={{padding:'3px 10px',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:99,fontSize:12,fontWeight:700,color:'#d97706'}}>★ Premium</span>
                  : <span style={{padding:'3px 10px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:99,fontSize:12,fontWeight:600,color:'#64748b'}}>Free</span>
                }
              </div>
              {!isPremium && (
                <div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>{usage?.count??0}/10 expenses used · upgrade for unlimited</div>
                  <button onClick={()=>router.push('/dashboard')}
                    style={{width:'100%',padding:11,background:'#1a3a6b',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                    Upgrade to Premium — $7/month
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ───────────────────────────────────────────── */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #f1f5f9',display:'flex',alignItems:'stretch',zIndex:100,paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {[
          {tab:'home'     as NavTab, icon:HomeIcon,          label:'Home'},
          {tab:'expenses' as NavTab, icon:DocumentTextIcon,  label:'Expenses'},
          {tab:'add'      as NavTab, icon:null,              label:''},
          {tab:'analytics'as NavTab, icon:ChartBarIcon,      label:'Analytics'},
          {tab:'settings' as NavTab, icon:Cog6ToothIcon,     label:'Settings'},
        ].map(item => {
          if (item.tab==='add') return (
            <div key="add" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',paddingBottom:8}}>
              <button onClick={()=>openAdd()}
                style={{width:52,height:52,borderRadius:'50%',background:'#1a3a6b',border:'3px solid #fff',boxShadow:'0 2px 12px rgba(26,58,107,0.3)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginTop:-20}}>
                <PlusIcon style={{width:24,height:24,color:'#fff'}}/>
              </button>
            </div>
          )
          const Icon = item.icon!
          const active = navTab===item.tab
          return (
            <button key={item.tab} onClick={()=>setNavTab(item.tab)}
              style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'10px 0 6px',background:'transparent',border:'none',cursor:'pointer'}}>
              <Icon style={{width:22,height:22,color:active?'#1a3a6b':'#94a3b8'}}/>
              <span style={{fontSize:10,fontWeight:active?700:500,color:active?'#1a3a6b':'#94a3b8'}}>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── ADD/EDIT EXPENSE MODAL ───────────────────────────────── */}
      {addModal && (
        <div onClick={e=>e.target===e.currentTarget&&setAddModal(false)}
          style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 0 32px',width:'100%',maxWidth:520,maxHeight:'94vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,background:'#e2e8f0',borderRadius:2,margin:'14px auto 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px 0'}}>
              <h3 style={{fontSize:17,fontWeight:800,color:'#0f172a',margin:0}}>{editingId?'Edit expense':'Add expense'}</h3>
              <button onClick={()=>setAddModal(false)} style={{width:30,height:30,background:'#f1f5f9',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:15,height:15,color:'#64748b'}}/></button>
            </div>
            <div style={{padding:'16px 20px 0',display:'flex',flexDirection:'column',gap:11}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 100px 80px',gap:8}}>
                <div><label style={LBL}>Description *</label><input value={form.description} onChange={e=>F({description:e.target.value})} placeholder="e.g. School excursion" style={INP} autoFocus/></div>
                <div><label style={LBL}>Amount *</label><input type="number" value={form.amount} onChange={e=>F({amount:e.target.value})} placeholder="0.00" step="0.01" min="0" style={INP}/></div>
                <div><label style={LBL}>Currency</label><select value={form.currency} onChange={e=>F({currency:e.target.value})} style={{...INP,cursor:'pointer'}}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}</select></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label style={LBL}>Child *</label>
                  <select value={form.kid_id} onChange={e=>{const id=e.target.value;const rule=kidRules[id];F({kid_id:id,...(rule&&!rule.is_optional?{split_pct:rule.split_pct}:{})})}} style={{...INP,cursor:'pointer',color:form.kid_id?'#0f172a':'#94a3b8'}}>
                    <option value="">Select…</option>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                  {form.kid_id&&kidRules[form.kid_id]&&<div style={{marginTop:3,fontSize:11,color:'#059669'}}>⚡ {kidRules[form.kid_id].split_pct}/{100-kidRules[form.kid_id].split_pct} rule</div>}
                </div>
                <div>
                  <label style={LBL}>Category *</label>
                  <select value={form.category_id} onChange={e=>{const id=e.target.value;const rule=splitRules[id];F({category_id:id,...(rule&&!rule.is_optional?{split_pct:rule.split_pct}:{})})}} style={{...INP,cursor:'pointer',color:form.category_id?'#0f172a':'#94a3b8'}}>
                    <option value="">Select…</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {form.category_id&&splitRules[form.category_id]&&<div style={{marginTop:3,fontSize:11,color:'#059669'}}>⚡ {splitRules[form.category_id].split_pct}/{100-splitRules[form.category_id].split_pct} rule</div>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label style={LBL}>Paid by</label><select value={form.paid_by_user_id} onChange={e=>F({paid_by_user_id:e.target.value})} style={{...INP,cursor:'pointer'}}><option value="">Not specified</option>{ctx?.members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}{m.user_id===ctx.myUserId?' (you)':''}</option>)}</select></div>
                <div><label style={LBL}>Date</label><input type="date" value={form.date} onChange={e=>F({date:e.target.value})} style={INP}/></div>
              </div>
              <div>
                <label style={LBL}>Split — {me?.display_name??'You'}: <strong>{form.split_pct}%</strong> · {co?.display_name??'Co-parent'}: <strong>{100-form.split_pct}%</strong></label>
                <input type="range" min="0" max="100" step="1" value={form.split_pct} onChange={e=>F({split_pct:parseInt(e.target.value)})} style={{width:'100%',accentColor:'#1a3a6b'}}/>
                <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>
                  {[0,25,50,75,100].map(v=><button key={v} type="button" onClick={()=>F({split_pct:v})} style={{padding:'3px 9px',border:form.split_pct===v?'1.5px solid #1a3a6b':'1px solid #e2e8f0',borderRadius:6,background:form.split_pct===v?'#1a3a6b':'#f8fafc',color:form.split_pct===v?'#fff':'#64748b',fontSize:12,fontWeight:form.split_pct===v?700:400,cursor:'pointer'}}>{v}%</button>)}
                </div>
              </div>
              {!editingId && (
                <div>
                  <label style={LBL}>Receipt (optional)</label>
                  {!receiptPreview
                    ? <label style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',border:'1.5px dashed #cbd5e1',borderRadius:10,cursor:'pointer',color:'#64748b',fontSize:13}}><PaperClipIcon style={{width:14,height:14,color:'#94a3b8'}}/> Attach photo or PDF<input type="file" accept="image/*,.pdf" onChange={handleReceipt} style={{display:'none'}}/></label>
                    : <div style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid #e2e8f0'}}><img src={receiptPreview} alt="Receipt" style={{width:'100%',maxHeight:100,objectFit:'cover',display:'block'}}/><button onClick={()=>{setReceiptFile(null);setReceiptPreview(null)}} style={{position:'absolute',top:5,right:5,width:22,height:22,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:11,height:11,color:'#fff'}}/></button></div>
                  }
                </div>
              )}
              {saveErr && <div style={{padding:'9px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,fontSize:13,color:'#dc2626'}}>{saveErr}</div>}
              <button onClick={submitExpense} disabled={saving}
                style={{padding:13,background:saving?'#94a3b8':'#1a3a6b',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'Saving…':editingId?'Save changes':'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPENSE DETAIL MODAL ─────────────────────────────────── */}
      {detailExp && (
        <div onClick={e=>e.target===e.currentTarget&&setDetailExp(null)}
          style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto',paddingBottom:32}}>
            <div style={{width:36,height:4,background:'#e2e8f0',borderRadius:2,margin:'14px auto 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px 0'}}>
              <h3 style={{fontSize:17,fontWeight:800,color:'#0f172a',margin:0}}>Expense details</h3>
              <button onClick={()=>setDetailExp(null)} style={{width:30,height:30,background:'#f1f5f9',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:15,height:15,color:'#64748b'}}/></button>
            </div>
            <div style={{padding:'16px 20px 0'}}>
              {/* Amount hero */}
              <div style={{background:'#0f172a',borderRadius:16,padding:'20px',textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>Total amount</div>
                <div style={{fontSize:40,fontWeight:800,color:'#fff',letterSpacing:'-1px'}}>{sym(detailExp.currency)}{Number(detailExp.amount).toFixed(2)}</div>
                <span style={{display:'inline-block',marginTop:8,padding:'3px 10px',background:STATUS[detailExp.settlement_status].bg,border:`1px solid ${STATUS[detailExp.settlement_status].border}`,borderRadius:99,fontSize:12,fontWeight:700,color:STATUS[detailExp.settlement_status].color}}>
                  {STATUS[detailExp.settlement_status].label}
                </span>
              </div>

              {/* Balance to settle (if unpaid) */}
              {detailExp.settlement_status==='outstanding' && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'14px 16px',marginBottom:16,textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#64748b',marginBottom:2}}>Balance to settle</div>
                  <div style={{fontSize:28,fontWeight:800,color:'#059669'}}>
                    {sym(detailExp.currency)}{expenseOwed(detailExp).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Details */}
              <div style={{background:'#f8fafc',borderRadius:12,padding:'14px',marginBottom:16}}>
                {[
                  ['Description',  detailExp.description],
                  ['Child',        detailExp.kid?.name ?? '—'],
                  ['Category',     detailExp.category?.name ?? '—'],
                  ['Date',         fmtDate(detailExp.date)],
                  ['Split',        `${detailExp.split_pct} / ${100-detailExp.split_pct}`],
                  ['Paid by',      ctx?.members.find(m=>m.user_id===detailExp.paid_by_user_id)?.display_name ?? '—'],
                  ['Settled',      `${sym(detailExp.currency)}${Number(detailExp.settled_amount??0).toFixed(2)}`],
                ].map(([label,value])=>(
                  <div key={label as string} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #e2e8f0'}}>
                    <span style={{fontSize:13,color:'#64748b'}}>{label as string}</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{value as string}</span>
                  </div>
                ))}
              </div>

              {/* Pending approval note */}
              {detailExp.settlement_status==='pending_approval' && (
                <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'12px 14px',marginBottom:14,fontSize:13,color:'#7c3aed'}}>
                  ⏳ Settlement of {cs}{Number(detailExp.pending_approval_amount??0).toFixed(2)} awaiting {detailExp.pending_approval_by===ctx?.myUserId?(co?.display_name??'co-parent'):'your'} approval
                </div>
              )}

              {/* Receipt */}
              {detailExp.receipt_url && (
                <button onClick={()=>setViewReceipt(detailExp.receipt_url)}
                  style={{width:'100%',padding:'10px',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,fontSize:13,fontWeight:600,color:'#1e40af',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:12}}>
                  <PaperClipIcon style={{width:14,height:14}}/> View receipt
                </button>
              )}

              {/* Action buttons */}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {detailExp.settlement_status==='outstanding' && (
                  <button onClick={()=>{setDetailExp(null);openSettle(detailExp)}}
                    style={{padding:13,background:'#059669',color:'#fff',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                    <CheckCircleIcon style={{width:16,height:16}}/> Settle this expense
                  </button>
                )}
                {detailExp.settlement_status==='pending_approval' && detailExp.pending_approval_by!==ctx?.myUserId && (
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>{approveSettlement(detailExp.id);setDetailExp(null)}} style={{flex:1,padding:12,background:'#059669',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><HandThumbUpIcon style={{width:14,height:14}}/> Approve</button>
                    <button onClick={()=>{rejectSettlement(detailExp.id);setDetailExp(null)}} style={{flex:1,padding:12,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><HandThumbDownIcon style={{width:14,height:14}}/> Reject</button>
                  </div>
                )}
                {detailExp.created_by===ctx?.myUserId && detailExp.settlement_status!=='settled' && (
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>{setDetailExp(null);openAdd(detailExp)}} style={{flex:1,padding:12,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}><PencilIcon style={{width:13,height:13}}/> Edit</button>
                    <button onClick={()=>deleteExpense(detailExp.id,detailExp.receipt_url)} style={{flex:1,padding:12,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:13,fontWeight:600,color:'#dc2626',cursor:'pointer'}}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTLE MODAL ─────────────────────────────────────────── */}
      {settleModal && (
        <div onClick={e=>e.target===e.currentTarget&&setSettleModal(null)}
          style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 0 32px',width:'100%',maxWidth:520}}>
            <div style={{width:36,height:4,background:'#e2e8f0',borderRadius:2,margin:'14px auto 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px 0'}}>
              <h3 style={{fontSize:17,fontWeight:800,color:'#0f172a',margin:0}}>Settle expense</h3>
              <button onClick={()=>setSettleModal(null)} style={{width:30,height:30,background:'#f1f5f9',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:15,height:15,color:'#64748b'}}/></button>
            </div>
            <div style={{padding:'16px 20px 0'}}>
              {/* Balance */}
              <div style={{background:'#0f172a',borderRadius:14,padding:'18px 20px',textAlign:'center',marginBottom:14}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>Balance to settle</div>
                <div style={{fontSize:40,fontWeight:800,color:'#4ade80',letterSpacing:'-1.5px'}}>
                  {sym(settleModal.currency)}{(expenseOwed(settleModal)-Number(settleModal.settled_amount??0)).toFixed(2)}
                </div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:3}}>
                  of {sym(settleModal.currency)}{Number(settleModal.amount).toFixed(2)} total
                </div>
              </div>
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,padding:'9px 13px',marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{settleModal.description}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{settleModal.kid?.name&&`${settleModal.kid.name} · `}{settleModal.category?.name}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:11}}>
                <div><label style={LBL}>Amount settling</label><input type="number" value={settleForm.amount} onChange={e=>setSettleForm(p=>({...p,amount:e.target.value}))} step="0.01" min="0.01" style={INP} autoFocus/></div>
                <div><label style={LBL}>Date</label><input type="date" value={settleForm.settlement_date} onChange={e=>setSettleForm(p=>({...p,settlement_date:e.target.value}))} style={INP}/></div>
                <div><label style={LBL}>Note (optional)</label><input value={settleForm.note} onChange={e=>setSettleForm(p=>({...p,note:e.target.value}))} placeholder="e.g. Bank transfer" style={INP}/></div>
                <div style={{padding:'10px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:12,color:'#92400e'}}>
                  📩 Sends approval request to <strong>{co?.display_name??'co-parent'}</strong>
                </div>
                <button onClick={submitSettlement} disabled={settling}
                  style={{padding:13,background:settling?'#6ee7b7':'#059669',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:settling?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  <CheckCircleIcon style={{width:17,height:17}}/> {settling?'Sending…':'Send for approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt viewer */}
      {viewReceipt && (
        <div onClick={()=>setViewReceipt(null)} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{position:'relative',maxWidth:520,width:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <span style={{color:'#fff',fontSize:14,fontWeight:600}}>Receipt</span>
              <div style={{display:'flex',gap:8}}>
                <a href={viewReceipt} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,color:'#fff',fontSize:13,textDecoration:'none'}}><EyeIcon style={{width:13,height:13}}/> Open</a>
                <button onClick={()=>setViewReceipt(null)} style={{width:32,height:32,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:15,height:15,color:'#fff'}}/></button>
              </div>
            </div>
            <img src={viewReceipt} alt="Receipt" style={{width:'100%',maxHeight:'80vh',objectFit:'contain',borderRadius:12}}/>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:88,left:'50%',transform:'translateX(-50%)',zIndex:600,background:'#0f172a',color:'#fff',padding:'10px 18px',borderRadius:99,fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:7,boxShadow:'0 4px 12px rgba(0,0,0,0.2)',whiteSpace:'nowrap'}}>
          <CheckCircleIcon style={{width:14,height:14,color:'#4ade80'}}/> {toast}
        </div>
      )}
    </div>
  )
}
