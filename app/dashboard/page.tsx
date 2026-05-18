'use client'
import React from 'react'
import {
  ArrowDownTrayIcon, BanknotesIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon,
  ClockIcon, ExclamationCircleIcon, EyeIcon, LockClosedIcon, PaperClipIcon,
  PencilIcon, PlusIcon, StarIcon, XMarkIcon, HandThumbUpIcon, HandThumbDownIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { CURRENCIES } from '@/components/CurrencySelect'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { logAudit } from '@/lib/audit'
import { CategoryIcon } from '@/components/CategoryIcon'

type SettlementStatus = 'outstanding' | 'partial' | 'pending_approval' | 'settled'
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
  category: { id: string; name: string; color: string; icon: string | null } | null
}
interface Usage { plan: 'free'|'premium'; count: number; can_add: boolean; limit: number|null; trial_active: boolean; trial_days_left: number; trial_expired: boolean }

const sym    = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
const PERIODS = [
  { key: 'month',  label: 'This Month'     },
  { key: '3month', label: 'Last 3 Months'  },
  { key: 'year',   label: 'This Year'      },
  { key: 'all',    label: 'All Time'       },
] as const
type Period = typeof PERIODS[number]['key']

const STATUS_CONFIG: Record<SettlementStatus, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  outstanding:      { label: 'Unpaid',           color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: ExclamationCircleIcon },
  partial:          { label: 'Partial',          color: '#b45309', bg: '#fffbeb', border: '#fde68a', Icon: ClockIcon },
  pending_approval: { label: 'Pending approval', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', Icon: ClockIcon },
  settled:          { label: 'Settled',          color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircleIcon },
}

const INP: React.CSSProperties = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:14, background:'#f8fafc', outline:'none', color:'#0f172a', boxSizing:'border-box' }
const LBL: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'#64748b', marginBottom:5, letterSpacing:'0.06em', textTransform:'uppercase' as const }

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null
  const R = Math.PI/180, r = innerRadius + (outerRadius-innerRadius)*0.5
  return <text x={cx+r*Math.cos(-midAngle*R)} y={cy+r*Math.sin(-midAngle*R)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>
}

export default function DashboardPage() {
  const { ctx, loading: ctxLoading, error: ctxError, reload: reloadCtx } = useHousehold()
  const [expenses,   setExpenses]   = useState<Expense[]>([])
  const [kids,       setKids]       = useState<Kid[]>([])
  const [cats,       setCats]       = useState<Category[]>([])
  const [usage,      setUsage]      = useState<Usage|null>(null)
  const [splitRules, setSplitRules] = useState<Record<string,{split_pct:number;is_optional:boolean}>>({})
  const [kidRules,   setKidRules]   = useState<Record<string,{split_pct:number;is_optional:boolean}>>({})
  const [currency,   setCurrency]   = useState('AUD')
  const [period,     setPeriod]     = useState<Period>('month')
  const [tab,        setTab]        = useState<'overview'|'analytics'|'expenses'>('overview')
  const [pageLoad,   setPageLoad]   = useState(false)
  const [drillCat,   setDrillCat]   = useState<string|null>(null)
  const [drillKid,   setDrillKid]   = useState<string|null>(null)
  const [kidFilter,  setKidFilter]   = useState<string>('all')
  const [custChart,  setCustChart]   = useState<'bar'|'pie'|'line'>('bar')
  const [custMetric, setCustMetric]  = useState<'category'|'kid'|'member'|'status'>('category')

  const [expenseModal,  setExpenseModal]  = useState(false)
  const [editingId,     setEditingId]     = useState<string|null>(null)
  const [settleModal,   setSettleModal]   = useState<Expense|null>(null)
  const [saving,        setSaving]        = useState(false)
  const [settling,      setSettling]      = useState(false)
  const [saveErr,       setSaveErr]       = useState('')
  const [viewReceipt,   setViewReceipt]   = useState<string|null>(null)
  const [receiptFile,   setReceiptFile]   = useState<File|null>(null)
  const [receiptPreview,setReceiptPreview]= useState<string|null>(null)
  const [expandedId,    setExpandedId]    = useState<string|null>(null)
  const [toast,         setToast]         = useState('')

  const EMPTY = { description:'', amount:'', currency:'AUD', kid_id:'', category_id:'', paid_by_user_id:'', date:new Date().toISOString().split('T')[0], split_pct:50 }
  const [form, setForm] = useState(EMPTY)
  const F = (k: Partial<typeof form>) => setForm(p => ({ ...p, ...k }))
  const SETTLE_EMPTY = { amount:'', note:'', settlement_date:new Date().toISOString().split('T')[0] }
  const [settleForm, setSettleForm] = useState(SETTLE_EMPTY)

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadData = useCallback(async () => {
    if (!ctx) return
    setPageLoad(true)
    try {
      const [e, k, c, u, r] = await Promise.all([
        supabase.from('expenses')
          .select('id,description,amount,currency,date,created_at,split_pct,paid_by_user_id,created_by,receipt_url,archived,settlement_status,settled_amount,settled_at,settlement_note,pending_approval_by,pending_approval_amount,pending_approval_note,pending_approval_at,kid:kids(id,name,color),category:categories(id,name,color,icon)')
          .eq('household_id', ctx.household_id).eq('archived', false)
          .order('created_at', { ascending: false }),
        supabase.from('kids').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
        supabase.from('categories').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
        supabase.rpc('get_my_usage'),
        supabase.from('split_rules').select('category_id,kid_id,split_pct,is_optional').eq('household_id', ctx.household_id),
      ])
      setExpenses((e.data ?? []) as unknown as Expense[])
      setKids(k.data ?? []); setCats(c.data ?? [])
      if (!u.error && u.data) setUsage(u.data as Usage)
      const rm: Record<string,{split_pct:number;is_optional:boolean}> = {}
      const km: Record<string,{split_pct:number;is_optional:boolean}> = {}
      ;(r.data ?? []).forEach((rule: any) => {
        if (rule.category_id) rm[rule.category_id] = { split_pct:rule.split_pct, is_optional:rule.is_optional }
        if (rule.kid_id)      km[rule.kid_id]      = { split_pct:rule.split_pct, is_optional:rule.is_optional }
      })
      setSplitRules(rm); setKidRules(km)
    } catch(err) { console.error('loadData:', err) }
    setPageLoad(false)
  }, [ctx])

  const ctxIdRef = useRef<string|null>(null)
  useEffect(() => {
    if (!ctx || ctx.household_id === ctxIdRef.current) return
    ctxIdRef.current = ctx.household_id
    loadData()

    // Real-time subscription — reload data whenever expenses or settlements change
    const channel = supabase
      .channel(`household_${ctx.household_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'expenses',
        filter: `household_id=eq.${ctx.household_id}`,
      }, () => { loadData() })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'settlements',
        filter: `household_id=eq.${ctx.household_id}`,
      }, () => { loadData() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ctx, loadData])

  function openAdd() {
    if (trialExpired && !isPremium) { setSaveErr('Your 7-day trial has ended. Please upgrade to Premium to add expenses.'); return }
    const autoKid  = kids.length===1 ? kids[0].id  : ''
    const autoCat  = cats.length===1 ? cats[0].id  : ''
    const autoSplit = (autoKid && kidRules[autoKid] && !kidRules[autoKid].is_optional) ? kidRules[autoKid].split_pct
                    : (autoCat && splitRules[autoCat] && !splitRules[autoCat].is_optional) ? splitRules[autoCat].split_pct : 50
    setEditingId(null)
    setForm({ ...EMPTY, kid_id:autoKid, category_id:autoCat, paid_by_user_id:ctx?.myUserId??'', split_pct:autoSplit })
    setReceiptFile(null); setReceiptPreview(null); setSaveErr(''); setExpenseModal(true)
  }
  function openEdit(exp: Expense) {
    setEditingId(exp.id)
    setForm({ description:exp.description, amount:String(exp.amount), currency:exp.currency, kid_id:exp.kid?.id??'', category_id:exp.category?.id??'', paid_by_user_id:exp.paid_by_user_id??'', date:exp.date, split_pct:exp.split_pct })
    setReceiptFile(null); setReceiptPreview(null); setSaveErr(''); setExpenseModal(true)
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
    setExpenseModal(false); loadData()
  }

  async function removeExpense(id: string, receiptUrl: string|null) {
    if (!confirm('Delete this expense?')) return
    if (receiptUrl) { const path=receiptUrl.split('/receipts/')[1]; if(path) await supabase.storage.from('receipts').remove([decodeURIComponent(path)]) }
    await supabase.from('expenses').delete().eq('id', id)
    loadData()
  }

  function expenseOwed(exp: Expense) {
    return Number(exp.amount) * (exp.created_by===ctx?.myUserId ? (100-exp.split_pct) : exp.split_pct) / 100
  }

  function openSettle(exp: Expense) {
    const rem = expenseOwed(exp) - Number(exp.settled_amount??0)
    setSettleForm({ amount:rem.toFixed(2), note:'', settlement_date:new Date().toISOString().split('T')[0] })
    setSettleModal(exp)
  }

  async function submitSettlement() {
    if (!settleModal||!ctx||!co||!me) return
    const amt = parseFloat(settleForm.amount)
    if (isNaN(amt)||amt<=0) return
    setSettling(true)
    // The person clicking Settle is the one making the payment (payer = me)
    // pending_approval_by is set to paid_by_uid (me) in the SQL
    // so the OTHER parent (co) sees the approval banner
    const {error} = await supabase.rpc('record_settlement',{
      hh_id:ctx.household_id,
      paid_by_uid:ctx.myUserId,   // I am paying
      recv_by_uid:co.user_id,      // co-parent receives / confirms
      amt, curr:settleModal.currency, note_text:settleForm.note||null,
      settle_date:settleForm.settlement_date, exp_id:settleModal.id, month_yr:null,
    })
    setSettling(false)
    if (error) { alert(error.message); return }
    setSettleModal(null); loadData()
    showToast(`Settlement request sent to ${co.display_name} for approval`)
  }

  async function approveSettlement(expId: string) {
    const {error} = await supabase.rpc('approve_settlement', {exp_id:expId})
    if (error) { alert(error.message); return }
    loadData(); showToast('Settlement approved')
  }

  async function rejectSettlement(expId: string) {
    const {error} = await supabase.rpc('reject_settlement', {exp_id:expId})
    if (error) { alert(error.message); return }
    loadData(); showToast('Settlement rejected')
  }

  async function requestMonthSettlement() {
    if (!ctx||!me||!co) return
    const cs = sym(currency)
    if (Math.abs(stats.balance) < 0.01) { showToast('No outstanding balance to settle'); return }
    // payer is who owes money, receiver is who is owed
    // I (me) am the one requesting settlement — I am the payer in the SQL so
    // pending_approval_by = me → the banner shows to co-parent only
    const currentMY = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
    if (!confirm(`Send settlement request of ${cs}${Math.abs(stats.balance).toFixed(2)} to ${co.display_name} for approval?`)) return
    const {error} = await supabase.rpc('record_settlement',{
      hh_id:ctx.household_id, paid_by_uid:me.user_id, recv_by_uid:co.user_id,
      amt:Math.abs(stats.balance), curr:currency,
      note_text:`Monthly settlement`,
      settle_date:new Date().toISOString().split('T')[0],
      exp_id:null,
      month_yr:currentMY,
    })
    if (error) { alert(error.message); return }
    loadData(); showToast(`Settlement request sent to ${co.display_name}`)
  }

  function exportCSV() {
    if (usage?.plan!=='premium') return
    const rows=[['Date','Description','Child','Category','Amount','Currency','Split%','Paid By','Status'],
      ...filtered.map(e=>[e.date,e.description,e.kid?.name??'',e.category?.name??'',e.amount,e.currency,e.split_pct,ctx?.members.find(m=>m.user_id===e.paid_by_user_id)?.display_name??'',e.settlement_status])]
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`coparent-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  // ── Derived data ─────────────────────────────────────────────
  const cs = sym(currency)
  const filtered = useMemo(() => {
    const now = new Date()
    return expenses.filter(e => e.currency===currency).filter(e => {
      if (period==='all') return true
      const d = new Date(e.date)
      if (period==='month')  return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
      if (period==='3month') return (now.getTime()-d.getTime())/86400000 <= 90
      if (period==='year')   return d.getFullYear()===now.getFullYear()
      return true
    }).filter(e => kidFilter==='all' || e.kid?.id===kidFilter)
  }, [expenses, currency, period, kidFilter])

  const pendingMyApproval     = useMemo(() => expenses.filter(e=>e.settlement_status==='pending_approval'&&e.pending_approval_by!==ctx?.myUserId&&e.currency===currency), [expenses,ctx,currency])
  const awaitingTheirApproval = useMemo(() => expenses.filter(e=>e.settlement_status==='pending_approval'&&e.pending_approval_by===ctx?.myUserId&&e.currency===currency), [expenses,ctx,currency])

  const stats = useMemo(() => {
    const total  = filtered.reduce((s,e)=>s+Number(e.amount),0)
    let myShare  = 0
    filtered.forEach(e => { myShare += Number(e.amount)*(e.created_by===ctx?.myUserId?e.split_pct:100-e.split_pct)/100 })
    const theirs = total - myShare
    const mePaid = me ? filtered.filter(e=>e.paid_by_user_id===me.user_id).reduce((s,e)=>s+Number(e.amount),0) : 0
    // Balance = money I&apos;ve paid minus my share, BUT exclude already settled/pending amounts
    // settled_amount tracks what has been paid toward each expense
    // balance only counts OUTSTANDING (unpaid) portion
    let settledByMe = 0
    filtered.forEach(e => {
      // If I paid this expense and it's been settled, subtract the settled portion from what co owes me
      if (e.paid_by_user_id===ctx?.myUserId && (e.settlement_status==='settled'||e.settlement_status==='pending_approval')) {
        settledByMe += Number(e.settled_amount??0)
      }
    })
    // Simpler and more accurate: sum outstanding owed amounts across all unsettled expenses
    let outstandingOwed = 0
    filtered.forEach(e => {
      if (e.settlement_status==='outstanding'||e.settlement_status==='partial') {
        const iMine = e.created_by===ctx?.myUserId
        const myPortion = Number(e.amount)*(iMine?e.split_pct:100-e.split_pct)/100
        const theirPortion = Number(e.amount) - myPortion
        // If I paid this expense, co owes me theirPortion (minus what's settled)
        if (e.paid_by_user_id===ctx?.myUserId) {
          outstandingOwed += theirPortion - Number(e.settled_amount??0)
        }
        // If co paid, I owe them myPortion (minus what's settled)
        if (e.paid_by_user_id!==ctx?.myUserId && e.paid_by_user_id!=null) {
          outstandingOwed -= myPortion - Number(e.settled_amount??0)
        }
      }
    })
    const balance = outstandingOwed

    const outstanding    = filtered.filter(e=>e.settlement_status==='outstanding')
    const settledArr     = filtered.filter(e=>e.settlement_status==='settled')
    const pendingArr     = filtered.filter(e=>e.settlement_status==='pending_approval')
    const outstandingAmt = outstanding.reduce((s,e)=>s+Number(e.amount),0)
    const settledAmt     = settledArr.reduce((s,e)=>s+Number(e.amount),0)
    const pendingAmt     = pendingArr.reduce((s,e)=>s+Number(e.amount),0)

    const byCatMap: Record<string,{id:string;name:string;color:string;amount:number}> = {}
    filtered.forEach(e => {
      if (!e.category?.id) return
      if (!byCatMap[e.category.id]) byCatMap[e.category.id] = {id:e.category.id,name:e.category.name,color:cats.find(c=>c.id===e.category?.id)?.color??'#374151',amount:0}
      byCatMap[e.category.id].amount += Number(e.amount)
    })
    const byKidMap: Record<string,{id:string;name:string;color:string;amount:number;count:number}> = {}
    filtered.forEach(e => {
      if (!e.kid?.id) return
      if (!byKidMap[e.kid.id]) byKidMap[e.kid.id] = {id:e.kid.id,name:e.kid.name,color:e.kid.color,amount:0,count:0}
      byKidMap[e.kid.id].amount += Number(e.amount)
      byKidMap[e.kid.id].count++
    })

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
    const splitData = me&&co ? [
      {name:me.display_name, value:parseFloat(myShare.toFixed(2)),   color:me.color||'#1a3a6b'},
      {name:co.display_name, value:parseFloat(theirs.toFixed(2)),    color:co.color||'#2ec4a0'},
    ] : []

    return {
      total, myShare, theirs, mePaid, balance, count:filtered.length,
      outstandingAmt, settledAmt, pendingAmt,
      outstandingCount:outstanding.length, settledCount:settledArr.length, pendingCount:pendingArr.length,
      byCat:Object.values(byCatMap).sort((a,b)=>b.amount-a.amount),
      byKid:Object.values(byKidMap).sort((a,b)=>b.amount-a.amount),
      monthly, splitData,
    }
  }, [filtered, expenses, me, co, ctx, cats, currency])

  const isPremium   = usage?.plan==='premium'
  const trialActive = usage?.trial_active ?? true
  const trialDays   = usage?.trial_days_left ?? 7
  const trialExpired = usage?.trial_expired ?? false
  const atLimit     = trialExpired && !isPremium

  if (!ctxLoading&&!ctx&&!ctxError) return (
    <Shell><div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 24px',textAlign:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{width:48,height:48,border:'3px solid #e2e8f0',borderTopColor:'#0f172a',borderRadius:'50%',animation:'spin .7s linear infinite',marginBottom:20}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{fontSize:18,fontWeight:700,color:'#0f172a',marginBottom:8}}>Initialising account</div>
      <div style={{fontSize:14,color:'#64748b',lineHeight:1.6}}>Setting up your household. This may take a moment.</div>
    </div></Shell>
  )
  if (ctxLoading) return <Shell><div style={{display:'flex',justifyContent:'center',padding:60}}><div style={{width:28,height:28,border:'2px solid #e2e8f0',borderTopColor:'#0f172a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>
  if (ctxError)   return <Shell><div style={{padding:24,textAlign:'center'}}><p style={{color:'#dc2626',marginBottom:12}}>{ctxError}</p><button onClick={reloadCtx} style={{padding:'8px 16px',background:'#0f172a',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>Retry</button></div></Shell>

  // Trial expired wall
  if (trialExpired && !isPremium && !ctxLoading) return (
    <Shell>
      <div style={{maxWidth:480,margin:'80px auto',padding:'0 24px',textAlign:'center',fontFamily:'system-ui,sans-serif'}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:6,padding:'40px 32px'}}>
          <div style={{width:48,height:48,borderRadius:6,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <LockClosedIcon style={{width:22,height:22,color:'#374151'}}/>
          </div>
          <h2 style={{fontSize:20,fontWeight:700,color:'#111827',marginBottom:8}}>Your trial has ended</h2>
          <p style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:24}}>Your 7-day free trial of CoParent Pay has expired. Upgrade to Premium to continue tracking shared expenses with your co-parent.</p>
          <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:4,padding:'16px 20px',marginBottom:24,textAlign:'left'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Premium includes</div>
            {['Unlimited shared expenses','Smart split rules','Monthly statements','Receipt attachments','Analytics and reporting','Priority support'].map(f=>(
              <div key={f} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <CheckCircleIcon style={{width:14,height:14,color:'#059669',flexShrink:0}}/>
                <span style={{fontSize:13,color:'#374151'}}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:24,fontWeight:800,color:'#111827',marginBottom:4}}>AUD $7.00 <span style={{fontSize:14,fontWeight:400,color:'#6b7280'}}>/ month</span></div>
          <p style={{fontSize:12,color:'#9ca3af',marginBottom:20}}>Cancel anytime</p>
          <a href="/plan" style={{display:'block',padding:'13px',background:'#0f172a',color:'#fff',textDecoration:'none',borderRadius:4,fontSize:14,fontWeight:600,textAlign:'center' as const}}>Upgrade to Premium</a>
          <p style={{fontSize:12,color:'#9ca3af',marginTop:16}}>Your expense history is preserved and accessible after upgrading.</p>
        </div>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{maxWidth:760,margin:'0 auto',padding:'20px 16px 40px',fontFamily:'system-ui,sans-serif'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,gap:10}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <h1 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:0}}>
                Welcome back, {me?.display_name??''}
              </h1>
              {isPremium&&<span style={{display:'flex',alignItems:'center',gap:4,padding:'2px 10px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:4,fontSize:11,fontWeight:600,color:'#374151',letterSpacing:'0.04em',textTransform:'uppercase'}}><StarIcon style={{width:10,height:10}}/> Premium</span>}
            </div>
            <p style={{fontSize:13,color:'#64748b',margin:'2px 0 0'}}>{co?`Shared with ${co.display_name}`:'Your household'}</p>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {isPremium&&<button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 11px',border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',color:'#374151',fontSize:12,fontWeight:600,cursor:'pointer'}}><ArrowDownTrayIcon style={{width:13,height:13}}/> CSV</button>}
            <select value={currency} onChange={e=>setCurrency(e.target.value)} style={{padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,fontWeight:600,background:'#fff',color:'#0f172a',cursor:'pointer',outline:'none'}}>
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
          </div>
        </div>

        {/* Trial / Plan bar */}
        {usage&&!isPremium&&(
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:4,padding:'10px 14px',marginBottom:14}}>
            {trialExpired ? (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:700,color:'#dc2626'}}>Trial period ended — upgrade to continue</span>
                <a href="/plan" style={{fontSize:12,fontWeight:700,color:'#fff',background:'#0f172a',padding:'5px 12px',borderRadius:3,textDecoration:'none'}}>Upgrade now</a>
              </div>
            ) : (
              <>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,fontWeight:600,color:'#374151',marginBottom:5}}>
                  <span>Free trial · {trialDays} day{trialDays!==1?'s':''} remaining</span>
                  <a href="/plan" style={{fontSize:12,color:'#374151',textDecoration:'underline'}}>View plans</a>
                </div>
                <div style={{height:4,background:'#f1f5f9',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.max(((7-trialDays)/7)*100,4)}%`,background:trialDays<=2?'#dc2626':trialDays<=4?'#d97706':'#0f172a',borderRadius:2}}/>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PENDING APPROVALS BANNER ── */}
        {pendingMyApproval.length>0&&(
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderLeft:'3px solid #374151',borderRadius:6,padding:'14px 16px',marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>
              Settlement approval required from {co?.display_name??'Co-parent'} · {pendingMyApproval.length} item{pendingMyApproval.length>1?'s':''}
            </div>
            {pendingMyApproval.map(exp=>(
              <div key={exp.id} style={{background:'#fff',borderRadius:10,padding:'10px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{exp.description}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:1}}>{exp.kid?.name&&`${exp.kid.name} · `}{exp.category?.name} · {new Date(exp.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</div>
                  {exp.pending_approval_note&&<div style={{fontSize:11,color:'#7c3aed',marginTop:2,fontStyle:'italic'}}>"{exp.pending_approval_note}"</div>}
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{cs}{Number(exp.pending_approval_amount??exp.amount).toFixed(2)}</div>
                  <div style={{fontSize:10,color:'#94a3b8'}}>settlement amount</div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={()=>approveSettlement(exp.id)} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',background:'#059669',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    <HandThumbUpIcon style={{width:13,height:13}}/> Approve
                  </button>
                  <button onClick={()=>rejectSettlement(exp.id)} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 10px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    <HandThumbDownIcon style={{width:13,height:13}}/> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {awaitingTheirApproval.length>0&&(
          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#374151',display:'flex',alignItems:'center'}}>
            <ClockIcon style={{width:13,height:13,marginRight:5,display:'inline',verticalAlign:'middle'}}/><strong>{awaitingTheirApproval.length} settlement{awaitingTheirApproval.length>1?'s':''}</strong> submitted to {co?.display_name??'co-parent'} — pending their approval
          </div>
        )}

        {/* ── BALANCE HERO ── */}
        {me&&co&&(
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderLeft:`3px solid ${stats.balance>=0?'#dc2626':'#374151'}`,borderRadius:6,padding:'20px',marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                  {stats.balance>=0 ? 'Outstanding receivable' : 'Outstanding payable'}
                </div>
                <div style={{fontSize:42,fontWeight:800,color:stats.balance>=0?'#dc2626':'#1a3a6b',letterSpacing:'-1.5px',marginBottom:6}}>
                  {cs}{Math.abs(stats.balance).toFixed(2)}
                </div>
                <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>
                  {stats.balance>=0?`${co.display_name} owes you`:`You owe ${co.display_name}`}
                  {' · '}{period==='month'?new Date().toLocaleDateString('en-AU',{month:'long',year:'numeric'}):period==='3month'?'Last 3 months':period==='year'?'This year':'All time'}
                </div>
                {/* Progress bar */}
                {stats.total>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden',marginBottom:5}}>
                      <div style={{height:'100%',width:`${Math.min((stats.settledAmt/stats.total)*100,100)}%`,background:'#059669',borderRadius:4,transition:'width .4s'}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8'}}>
                      <span>{cs}{stats.settledAmt.toFixed(2)} Settled</span>
                      <span>{cs}{(stats.total-stats.settledAmt).toFixed(2)} Remaining</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Action buttons */}
              {Math.abs(stats.balance)>0.01&&(
                <div style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0,minWidth:160}}>
                  <button onClick={requestMonthSettlement}
                    style={{padding:'10px 16px',background:'#0f172a',color:'#fff',border:'none',borderRadius:4,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,letterSpacing:'0.02em'}}>
                    <ArrowDownTrayIcon style={{width:14,height:14}}/>
                    Request Settlement
                  </button>
                </div>
              )}
              {Math.abs(stats.balance)<=0.01&&stats.count>0&&(
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#f0fdf4',borderRadius:4,border:'1px solid #d1fae5',flexShrink:0}}>
                  <CheckCircleIcon style={{width:18,height:18,color:'#059669'}}/>
                  <span style={{fontSize:13,fontWeight:600,color:'#059669'}}>All settled</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STATUS CARDS ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
          {([
            {status:'outstanding' as SettlementStatus, count:stats.outstandingCount, total:stats.outstandingAmt},
            {status:'pending_approval' as SettlementStatus, count:stats.pendingCount, total:stats.pendingAmt},
            {status:'settled' as SettlementStatus, count:stats.settledCount, total:stats.settledAmt},
          ]).map(({status,count,total})=>{
            const cfg = STATUS_CONFIG[status]
            return (
              <div key={status} style={{background:'#fff',border:'1px solid #e2e8f0',borderBottom:`2px solid ${cfg.color}`,borderRadius:6,padding:'12px 10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>
                  <cfg.Icon style={{width:12,height:12,color:cfg.color}}/>
                  <span style={{fontSize:10,fontWeight:700,color:cfg.color,textTransform:'uppercase',letterSpacing:'0.04em'}}>{cfg.label}</span>
                </div>
                <div style={{fontSize:17,fontWeight:800,color:'#0f172a'}}>{cs}{total.toFixed(2)}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{count} expense{count!==1?'s':''}</div>
              </div>
            )
          })}
        </div>

        {/* ── TABS ── */}
        <div style={{display:'flex',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:6,padding:3,marginBottom:16,gap:2}}>
          {([
            {key:'overview',  label:'Overview'},
            {key:'analytics', label:'Analytics'},
            {key:'expenses',  label:'Expenses'},
          ] as {key:'overview'|'analytics'|'expenses', label:string}[]).map(({key,label})=>(
            <button key={key} onClick={()=>setTab(key)}
              style={{flex:1,padding:'9px 0',border:'none',borderRadius:4,background:tab===key?'#fff':'transparent',color:tab===key?'#111827':'#6b7280',fontSize:13,fontWeight:tab===key?700:400,cursor:'pointer',boxShadow:tab===key?'0 1px 2px rgba(0,0,0,0.07)':'none',transition:'all 0.15s'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Period pills */}
        <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
          {PERIODS.map(p=>(
            <button key={p.key} onClick={()=>setPeriod(p.key)} style={{padding:'5px 12px',border:period===p.key?'1px solid #0f172a':'1px solid #e2e8f0',borderRadius:3,background:period===p.key?'#0f172a':'#fff',color:period===p.key?'#fff':'#64748b',fontSize:12,fontWeight:period===p.key?600:400,cursor:'pointer'}}>
              {p.label}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==='overview'&&(<>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {[
              {label:'Total',              value:`${cs}${stats.total.toFixed(2)}`,    sub:`${stats.count} expenses`,                                     color:'#64748b'},
              {label:me?.display_name??'Mine',   value:`${cs}${stats.myShare.toFixed(2)}`, sub:`${stats.total>0?(stats.myShare/stats.total*100).toFixed(0):0}% share`, color:me?.color??'#1a3a6b'},
              {label:co?.display_name??'Theirs', value:`${cs}${stats.theirs.toFixed(2)}`,  sub:`${stats.total>0?(stats.theirs/stats.total*100).toFixed(0):0}% share`, color:co?.color??'#94a3b8'},
            ].map(s=>(
              <div key={s.label} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'12px'}}>
                <div style={{marginBottom:5}}>
                  <span style={{fontSize:10,fontWeight:600,color:'#94a3b8',letterSpacing:'0.05em',textTransform:'uppercase',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>{s.label}</span>
                </div>
                <div style={{fontSize:16,fontWeight:700,color:'#0f172a'}}>{s.value}</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Add button */}
          <button onClick={openAdd} disabled={atLimit}
            style={{width:'100%',padding:'11px 16px',background:(trialExpired&&!isPremium)?'#f1f5f9':'#0f172a',color:(trialExpired&&!isPremium)?'#9ca3af':'#fff',border:'none',borderRadius:4,fontSize:14,fontWeight:600,cursor:atLimit?'not-allowed':'pointer',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {(trialExpired&&!isPremium)?<><LockClosedIcon style={{width:14,height:14}}/> Trial ended — upgrade to Premium</>:<><PlusIcon style={{width:15,height:15}}/> Add expense</>}
          </button>

          {/* ── Child filter buttons (only when multiple kids) ── */}
          {kids.length > 1 && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
              <button
                onClick={()=>setKidFilter('all')}
                style={{display:'flex',alignItems:'center',gap:7,padding:'5px 13px',border:kidFilter==='all'?'1.5px solid #111827':'1px solid #e2e8f0',borderRadius:99,background:kidFilter==='all'?'#f0f4ff':'#fff',cursor:'pointer',fontSize:12,fontWeight:kidFilter==='all'?700:500,color:kidFilter==='all'?'#111827':'#6b7280',transition:'all 0.15s'}}>
                All children
              </button>
              {kids.map(kid=>(
                <button key={kid.id}
                  onClick={()=>setKidFilter(kidFilter===kid.id?'all':kid.id)}
                  style={{display:'flex',alignItems:'center',gap:7,padding:'5px 13px',border:kidFilter===kid.id?`1.5px solid ${kid.color||'#2563eb'}`:'1px solid #e2e8f0',borderRadius:99,background:kidFilter===kid.id?(kid.color||'#2563eb')+'14':'#fff',cursor:'pointer',fontSize:12,fontWeight:kidFilter===kid.id?700:500,color:kidFilter===kid.id?(kid.color||'#2563eb'):'#6b7280',transition:'all 0.15s'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:kid.color||'#2563eb',flexShrink:0}}/>
                  {kid.name}
                </button>
              ))}
            </div>
          )}

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              {filtered.length} expense{filtered.length!==1?'s':''}{kidFilter!=='all'?` · ${kids.find(k=>k.id===kidFilter)?.name??''}`:''} · most recent first
            </div>
            {kidFilter!=='all'&&(
              <button onClick={()=>setKidFilter('all')} style={{fontSize:11,color:'#6b7280',background:'none',border:'1px solid #e5e7eb',borderRadius:3,padding:'2px 8px',cursor:'pointer'}}>
                Clear filter
              </button>
            )}
          </div>

          {pageLoad?<div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Loading…</div>
          :filtered.length===0?(
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'36px 24px',textAlign:'center'}}>
              <p style={{fontSize:14,color:'#9ca3af',margin:0}}>No expenses for this period.</p>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.map(exp=>{
                const cfg     = STATUS_CONFIG[exp.settlement_status]
                const payer   = ctx?.members.find(m=>m.user_id===exp.paid_by_user_id)
                const isOwner = exp.created_by===ctx?.myUserId
                const owed    = expenseOwed(exp)
                const rem     = owed - Number(exp.settled_amount??0)
                const isExp   = expandedId===exp.id
                const canApprove = exp.settlement_status==='pending_approval'&&exp.pending_approval_by!==ctx?.myUserId

                return (
                  <div key={exp.id} style={{background:'#fff',border:`1px solid ${isExp?cfg.color+'44':'#e2e8f0'}`,borderRadius:13,overflow:'hidden'}}>
                    <div style={{padding:'11px 14px',display:'flex',alignItems:'center',gap:10}}>
                      {/* Category icon */}
                      <div style={{width:40,height:40,borderRadius:10,background:'#f3f4f6',border:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <CategoryIcon
                          name={exp.category?.icon??'tag'}
                          size={19}
                          color={exp.category?.color||'#6b7280'}
                        />
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:14,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.description}</div>
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:1,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                          <span>{exp.category?.name}</span>
                          <span>·</span>
                          <span>{new Date(exp.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</span>
                          <span>·</span>
                          <span style={{color:'#b0b8c4'}}>{new Date(exp.created_at).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}</span>
                          {payer&&<><span>·</span><span style={{fontWeight:500,color:'#6b7280'}}>{payer.user_id===ctx?.myUserId?'You':payer.display_name} paid</span></>}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{sym(exp.currency)}{Number(exp.amount).toFixed(2)}</div>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{exp.split_pct}/{100-exp.split_pct}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:3,padding:'2px 7px',borderRadius:3,background:cfg.bg,border:`1px solid ${cfg.border}`,flexShrink:0}}>
                        <cfg.Icon style={{width:11,height:11,color:cfg.color}}/>
                        <span style={{fontSize:10,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                      </div>
                      <div style={{display:'flex',gap:3,flexShrink:0}}>
                        {exp.receipt_url&&<button onClick={()=>setViewReceipt(exp.receipt_url)} style={{padding:4,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:6,cursor:'pointer',display:'flex'}}><PaperClipIcon style={{width:12,height:12,color:'#374151'}}/></button>}
                        {isOwner&&exp.settlement_status==='outstanding'&&<button onClick={()=>openEdit(exp)} style={{padding:4,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',display:'flex'}}><PencilIcon style={{width:12,height:12,color:'#64748b'}}/></button>}
                        {exp.settlement_status==='outstanding'&&<button onClick={()=>openSettle(exp)} style={{padding:'3px 8px',background:'#fff',border:'1px solid #d1d5db',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:500,color:'#374151',display:'flex',alignItems:'center',gap:3}}>Settle</button>}
                        {canApprove&&(
                          <>
                            <button onClick={()=>approveSettlement(exp.id)} style={{padding:'3px 8px',background:'#059669',border:'none',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:600,color:'#fff',display:'flex',alignItems:'center',gap:3}}><HandThumbUpIcon style={{width:11,height:11}}/> Approve</button>
                            <button onClick={()=>rejectSettlement(exp.id)} style={{padding:'3px 8px',background:'#fff',border:'1px solid #fecaca',borderRadius:3,cursor:'pointer',fontSize:11,fontWeight:600,color:'#dc2626',display:'flex',alignItems:'center',gap:3}}><HandThumbDownIcon style={{width:11,height:11}}/> Reject</button>
                          </>
                        )}
                        <button onClick={()=>setExpandedId(isExp?null:exp.id)} style={{padding:4,background:'none',border:'none',cursor:'pointer',display:'flex'}}>
                          {isExp?<ChevronUpIcon style={{width:14,height:14,color:'#94a3b8'}}/>:<ChevronDownIcon style={{width:14,height:14,color:'#94a3b8'}}/>}
                        </button>
                        {isOwner&&exp.settlement_status!=='settled'&&<button onClick={()=>removeExpense(exp.id,exp.receipt_url)} style={{padding:4,background:'none',border:'none',cursor:'pointer',color:'#cbd5e1',display:'flex'}}><XMarkIcon style={{width:14,height:14}}/></button>}
                      </div>
                    </div>
                    {isExp&&(
                      <div style={{padding:'10px 14px 14px',background:'#f8fafc',borderTop:'1px solid #e2e8f0'}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:8}}>
                          <div><div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:2}}>Owed</div><div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{sym(exp.currency)}{owed.toFixed(2)}</div></div>
                          <div><div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:2}}>Settled</div><div style={{fontSize:14,fontWeight:700,color:'#059669'}}>{sym(exp.currency)}{Number(exp.settled_amount??0).toFixed(2)}</div></div>
                          <div><div style={{fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',marginBottom:2}}>Remaining</div><div style={{fontSize:14,fontWeight:700,color:rem>0?'#dc2626':'#059669'}}>{sym(exp.currency)}{Math.max(rem,0).toFixed(2)}</div></div>
                        </div>
                        {exp.settlement_status==='pending_approval'&&(
                          <div style={{fontSize:12,color:'#7c3aed',padding:'6px 10px',background:'#f5f3ff',borderRadius:8,marginBottom:8}}>
                            Settlement of {cs}{Number(exp.pending_approval_amount??0).toFixed(2)} pending approval from {exp.pending_approval_by===ctx?.myUserId?(co?.display_name??'co-parent'):'your'} approval
                          </div>
                        )}
                        {exp.settlement_note&&<div style={{fontSize:12,color:cfg.color,fontStyle:'italic',marginBottom:6}}>Note: {exp.settlement_note}</div>}
                        {exp.settled_at&&<div style={{fontSize:11,color:'#64748b',marginBottom:6}}>Settled {new Date(exp.settled_at).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</div>}
                        {owed>0&&<div style={{height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min((Number(exp.settled_amount??0)/owed)*100,100)}%`,background:exp.settlement_status==='settled'?'#059669':exp.settlement_status==='partial'?'#d97706':'#dc2626',transition:'width 0.3s'}}/></div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>)}

        {/* ══ ANALYTICS ══════════════════════════════════════════ */}
        {tab==='analytics'&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* ── 1. FINANCIAL SUMMARY CARDS ── */}
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>Financial summary · {PERIODS.find(p=>p.key===period)?.label}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {/* Total */}
                <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'14px 16px'}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Total expenses</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#111827',letterSpacing:'-0.5px'}}>{cs}{stats.total.toFixed(2)}</div>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:3}}>{stats.count} expense{stats.count!==1?'s':''}</div>
                </div>
                {/* Balance */}
                <div style={{background:'#fff',border:`1px solid ${Math.abs(stats.balance)>0.01?(stats.balance>=0?'#d1fae5':'#fecaca'):'#e5e7eb'}`,borderLeft:`3px solid ${Math.abs(stats.balance)>0.01?(stats.balance>=0?'#059669':'#dc2626'):'#e5e7eb'}`,borderRadius:6,padding:'14px 16px'}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>
                    {Math.abs(stats.balance)>0.01?(stats.balance>=0?'Outstanding receivable':'Outstanding payable'):'Balance'}
                  </div>
                  <div style={{fontSize:22,fontWeight:700,color:Math.abs(stats.balance)>0.01?(stats.balance>=0?'#059669':'#dc2626'):'#9ca3af',letterSpacing:'-0.5px'}}>
                    {Math.abs(stats.balance)>0.01?`${cs}${Math.abs(stats.balance).toFixed(2)}`:'Settled'}
                  </div>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:3}}>
                    {Math.abs(stats.balance)>0.01?(stats.balance>=0?`${co?.display_name??'Co-parent'} owes you`:`You owe ${co?.display_name??'co-parent'}`):'No outstanding balance'}
                  </div>
                </div>
                {/* Parent A */}
                {me&&(
                  <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'14px 16px'}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{me.display_name}</div>
                    <div style={{fontSize:22,fontWeight:700,color:'#111827',letterSpacing:'-0.5px'}}>{cs}{stats.mePaid.toFixed(2)}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                      <div style={{flex:1,height:3,background:'#f3f4f6',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${stats.total>0?(stats.mePaid/stats.total*100):0}%`,background:'#2563eb',borderRadius:2}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:600,color:'#6b7280'}}>{stats.total>0?(stats.mePaid/stats.total*100).toFixed(0):0}%</span>
                    </div>
                  </div>
                )}
                {/* Parent B */}
                {co&&(
                  <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'14px 16px'}}>
                    <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{co.display_name}</div>
                    <div style={{fontSize:22,fontWeight:700,color:'#111827',letterSpacing:'-0.5px'}}>{cs}{stats.theirs.toFixed(2)}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                      <div style={{flex:1,height:3,background:'#f3f4f6',borderRadius:2,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${stats.total>0?(stats.theirs/stats.total*100):0}%`,background:'#059669',borderRadius:2}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:600,color:'#6b7280'}}>{stats.total>0?(stats.theirs/stats.total*100).toFixed(0):0}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. CATEGORY BREAKDOWN ── */}
            {stats.byCat.length>0&&(
              <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'16px'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:14}}>Category breakdown</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'center'}}>
                  {/* Bar list */}
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {stats.byCat.slice(0,6).map(cat=>(
                      <div key={cat.id} onClick={()=>setDrillCat(drillCat===cat.id?null:cat.id)}
                        style={{cursor:'pointer',padding:'6px 8px',borderRadius:4,background:drillCat===cat.id?'#f3f4f6':'transparent',border:drillCat===cat.id?'1px solid #e5e7eb':'1px solid transparent'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:8,height:8,borderRadius:'50%',background:cat.color||'#374151',flexShrink:0}}/>
                            <span style={{fontSize:12,fontWeight:drillCat===cat.id?700:500,color:'#111827'}}>{cat.name}</span>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,color:'#111827'}}>{cs}{cat.amount.toFixed(2)}</span>
                        </div>
                        <div style={{height:3,background:'#f3f4f6',borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${stats.total>0?(cat.amount/stats.total*100):0}%`,background:cat.color||'#374151',borderRadius:2,transition:'width 0.3s'}}/>
                        </div>
                        <div style={{fontSize:10,color:'#9ca3af',marginTop:3}}>{stats.total>0?(cat.amount/stats.total*100).toFixed(0):0}% of total</div>
                      </div>
                    ))}
                  </div>
                  {/* Pie */}
                  {drillCat?(
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#374151',marginBottom:6}}>
                        {stats.byCat.find(c=>c.id===drillCat)?.name} expenses
                      </div>
                      <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column',gap:0}}>
                        {filtered.filter(e=>e.category?.id===drillCat).map(e=>(
                          <div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f3f4f6'}}>
                            <div>
                              <div style={{fontSize:12,color:'#111827',fontWeight:500}}>{e.description}</div>
                              <div style={{fontSize:10,color:'#9ca3af'}}>{new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:12,fontWeight:700,color:'#111827'}}>{cs}{Number(e.amount).toFixed(2)}</div>
                              <div style={{fontSize:9,padding:'1px 5px',borderRadius:3,background:e.settlement_status==='settled'?'#f0fdf4':e.settlement_status==='pending_approval'?'#f5f3ff':'#fef2f2',color:e.settlement_status==='settled'?'#059669':e.settlement_status==='pending_approval'?'#7c3aed':'#dc2626',display:'inline-block',marginTop:1}}>{e.settlement_status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>setDrillCat(null)} style={{marginTop:8,fontSize:11,color:'#6b7280',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}>← Back to all categories</button>
                    </div>
                  ):(
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={stats.byCat} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="amount" labelLine={false}
                          onClick={(d:any)=>setDrillCat(d.id)} style={{cursor:'pointer'}}>
                          {stats.byCat.map((d,i)=><Cell key={i} fill={d.color||'#374151'}/>)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`} contentStyle={{fontSize:12,border:'1px solid #e5e7eb',borderRadius:4}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* ── 3. MONTHLY TREND ── */}
            {stats.monthly.length>0&&(
              <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em'}}>Monthly trend</div>
                  <div style={{display:'flex',gap:12}}>
                    {[{c:'#d1fae5',l:'Settled'},{c:'#fca5a5',l:'Outstanding'}].map(x=>(
                      <div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#9ca3af'}}>
                        <div style={{width:10,height:10,borderRadius:2,background:x.c}}/>{x.l}
                      </div>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stats.monthly} barSize={24} margin={{top:0,right:4,bottom:0,left:-12}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`${cs}${v}`}/>
                    <Tooltip contentStyle={{fontSize:12,border:'1px solid #e5e7eb',borderRadius:4}} formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                    <Bar dataKey="settled"     name="Settled"     fill="#d1fae5" radius={[2,2,0,0]} stackId="a"/>
                    <Bar dataKey="outstanding" name="Outstanding" fill="#fca5a5" radius={[2,2,0,0]} stackId="a"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── 4. SETTLEMENT TIMELINE ── */}
            {(()=>{
              const events = expenses
                .filter(e=>e.currency===currency)
                .filter(e=>e.settlement_status==='settled'||e.settlement_status==='pending_approval')
                .sort((a,b)=>{
                  const da = a.settled_at||a.pending_approval_at||a.created_at
                  const db = b.settled_at||b.pending_approval_at||b.created_at
                  return new Date(db).getTime()-new Date(da).getTime()
                })
                .slice(0,10)
              if (events.length===0) return null
              return (
                <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'16px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:14}}>Settlement history</div>
                  <div style={{display:'flex',flexDirection:'column',gap:0}}>
                    {events.map((exp,idx)=>{
                      const isPending = exp.settlement_status==='pending_approval'
                      const date = isPending ? exp.pending_approval_at : exp.settled_at
                      const payer   = ctx?.members.find(m=>m.user_id===(isPending?exp.pending_approval_by:exp.paid_by_user_id))
                      const amt     = isPending ? Number(exp.pending_approval_amount??0) : Number(exp.settled_amount??0)
                      return (
                        <div key={exp.id} style={{display:'flex',gap:12,paddingBottom:12,marginBottom:12,borderBottom:idx<events.length-1?'1px solid #f3f4f6':'none'}}>
                          {/* Timeline dot */}
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,flexShrink:0}}>
                            <div style={{width:10,height:10,borderRadius:'50%',background:isPending?'#7c3aed':'#059669',marginTop:3,flexShrink:0}}/>
                            {idx<events.length-1&&<div style={{width:1,flex:1,background:'#f3f4f6',minHeight:20,marginTop:4}}/>}
                          </div>
                          {/* Content */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                              <div style={{minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.description}</div>
                                <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>
                                  {isPending?'Settlement requested':'Settlement approved'}
                                  {payer?` · ${payer.display_name}`:''}
                                </div>
                                {date&&<div style={{fontSize:10,color:'#d1d5db',marginTop:2}}>{new Date(date).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}
                              </div>
                              <div style={{textAlign:'right',flexShrink:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:'#111827'}}>{cs}{amt.toFixed(2)}</div>
                                <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:3,background:isPending?'#f5f3ff':'#f0fdf4',color:isPending?'#7c3aed':'#059669',border:`1px solid ${isPending?'#ddd6fe':'#d1fae5'}`,display:'inline-block',marginTop:2}}>
                                  {isPending?'Pending approval':'Settled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* ── 5. CUSTOM CHART BUILDER ── */}
            <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:6,padding:'16px'}}>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:2}}>Custom chart builder</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>Visualise any dimension of your expense data</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Chart type</div>
                  <div style={{display:'flex',background:'#f3f4f6',borderRadius:4,padding:2,gap:1}}>
                    {(['bar','pie','line'] as const).map(t=>(
                      <button key={t} onClick={()=>setCustChart(t)}
                        style={{flex:1,padding:'6px 0',border:'none',borderRadius:3,background:custChart===t?'#fff':'transparent',color:custChart===t?'#111827':'#9ca3af',fontSize:11,fontWeight:custChart===t?700:500,cursor:'pointer',textTransform:'capitalize',boxShadow:custChart===t?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Group by</div>
                  <div style={{display:'flex',background:'#f3f4f6',borderRadius:4,padding:2,gap:1}}>
                    {([
                      {v:'category',l:'Category'},
                      {v:'kid',l:'Child'},
                      {v:'member',l:'Parent'},
                      {v:'status',l:'Status'},
                    ] as {v:'category'|'kid'|'member'|'status',l:string}[]).map(({v,l})=>(
                      <button key={v} onClick={()=>setCustMetric(v)}
                        style={{flex:1,padding:'6px 0',border:'none',borderRadius:3,background:custMetric===v?'#111827':'transparent',color:custMetric===v?'#fff':'#9ca3af',fontSize:10,fontWeight:custMetric===v?700:500,cursor:'pointer',boxShadow:custMetric===v?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {(()=>{
                const custData: {name:string;value:number;color:string}[] = custMetric==='category'
                  ? stats.byCat.map(c=>({name:c.name,value:c.amount,color:c.color||'#374151'}))
                  : custMetric==='kid'
                  ? stats.byKid.map(k=>({name:k.name,value:k.amount,color:k.color||'#374151'}))
                  : custMetric==='member'
                  ? stats.splitData.map(d=>({name:d.name.split(' ')[0],value:d.value,color:d.color}))
                  : custMetric==='status'
                  ? [
                      {name:'Settled',value:stats.settledAmt,color:'#059669'},
                      {name:'Pending',value:stats.pendingAmt,color:'#7c3aed'},
                      {name:'Unpaid',value:stats.outstandingAmt,color:'#dc2626'},
                    ].filter(d=>d.value>0)
                  : []
                if (custData.length===0) return <div style={{textAlign:'center',padding:'32px 0',color:'#9ca3af',fontSize:13}}>No data for this period</div>
                return (
                  <>
                    {custChart==='bar'&&(
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={custData} barSize={28} margin={{top:0,right:4,bottom:0,left:-12}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                          <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`${cs}${v}`}/>
                          <Tooltip contentStyle={{fontSize:12,border:'1px solid #e5e7eb',borderRadius:4}} formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                          <Bar dataKey="value" name="Amount" radius={[3,3,0,0]}>
                            {custData.map((d:{name:string;value:number;color:string},i:number)=><Cell key={i} fill={d.color}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {custChart==='pie'&&(
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={custData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="value" labelLine={false} label={PieLabel}>
                            {custData.map((d:{name:string;value:number;color:string},i:number)=><Cell key={i} fill={d.color}/>)}
                          </Pie>
                          <Tooltip contentStyle={{fontSize:12,border:'1px solid #e5e7eb',borderRadius:4}} formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {custChart==='line'&&(
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={custData} margin={{top:0,right:4,bottom:0,left:-12}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                          <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`${cs}${v}`}/>
                          <Tooltip contentStyle={{fontSize:12,border:'1px solid #e5e7eb',borderRadius:4}} formatter={(v:any)=>`${cs}${Number(v).toFixed(2)}`}/>
                          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{r:3,fill:'#2563eb'}} activeDot={{r:5}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:12,justifyContent:'center'}}>
                      {custData.map((d:{name:string;value:number;color:string},i:number)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#6b7280'}}>
                          <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                          {d.name}: {cs}{d.value.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>

          </div>
        )}

        {/* ══ EXPENSES TAB ══ */}
        {tab==='expenses'&&(
          <ExpensesTab
            expenses={filtered} ctx={ctx} cs={cs} STATUS_CONFIG={STATUS_CONFIG}
            onEdit={exp=>{ setEditingId(exp.id); setForm({description:exp.description,amount:String(exp.amount),currency:exp.currency,date:exp.date,split_pct:exp.split_pct,kid_id:exp.kid?.id??'',category_id:exp.category?.id??'',paid_by_user_id:exp.paid_by_user_id??ctx?.myUserId??''}); setExpenseModal(true) }}
            onSettle={exp=>{ setSettleModal(exp); setSettleForm({amount:String((expenseOwed(exp)-Number(exp.settled_amount??0)).toFixed(2)),settlement_date:new Date().toISOString().split('T')[0],note:''}) }}
            onApprove={approveSettlement} onReject={rejectSettlement}
            onDelete={id=>removeExpense(id,null)}
          />
        )}
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {expenseModal&&(
        <div onClick={e=>e.target===e.currentTarget&&setExpenseModal(false)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'24px 24px 0 0',padding:22,width:'100%',maxWidth:640,maxHeight:'92vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3 style={{fontSize:17,fontWeight:700,color:'#0f172a',margin:0}}>{editingId?'Edit expense':'Add expense'}</h3>
              <button onClick={()=>setExpenseModal(false)} style={{width:30,height:30,background:'#f1f5f9',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:15,height:15,color:'#64748b'}}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 100px 80px',gap:8}}>
                <div><label style={LBL}>Description *</label><input value={form.description} onChange={e=>F({description:e.target.value})} placeholder="e.g. School excursion" style={INP} autoFocus/></div>
                <div><label style={LBL}>Amount *</label><input type="number" value={form.amount} onChange={e=>F({amount:e.target.value})} placeholder="0.00" step="0.01" min="0" style={INP}/></div>
                <div><label style={LBL}>Currency</label><select value={form.currency} onChange={e=>F({currency:e.target.value})} style={{...INP,cursor:'pointer'}}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}</select></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label style={LBL}>Child *</label>
                  <select value={form.kid_id} onChange={e=>{const id=e.target.value;const rule=kidRules[id];F({kid_id:id,...(rule&&!rule.is_optional?{split_pct:rule.split_pct}:{})})}} style={{...INP,cursor:'pointer',color:form.kid_id?'#0f172a':'#94a3b8'}}>
                    <option value="">Child…</option>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                  {form.kid_id&&kidRules[form.kid_id]&&<div style={{marginTop:3,fontSize:11,color:'#059669'}}>Rule: {kidRules[form.kid_id].split_pct}/{100-kidRules[form.kid_id].split_pct} rule</div>}
                </div>
                <div>
                  <label style={LBL}>Category *</label>
                  <select value={form.category_id} onChange={e=>{const id=e.target.value;const rule=splitRules[id];F({category_id:id,...(rule&&!rule.is_optional?{split_pct:rule.split_pct}:{})})}} style={{...INP,cursor:'pointer',color:form.category_id?'#0f172a':'#94a3b8'}}>
                    <option value="">Category…</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {form.category_id&&splitRules[form.category_id]&&<div style={{marginTop:3,fontSize:11,color:'#059669'}}>Rule: {splitRules[form.category_id].split_pct}/{100-splitRules[form.category_id].split_pct} rule</div>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label style={LBL}>Paid by</label><select value={form.paid_by_user_id} onChange={e=>F({paid_by_user_id:e.target.value})} style={{...INP,cursor:'pointer'}}><option value="">Not specified</option>{ctx?.members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}{m.user_id===ctx.myUserId?' (you)':''}</option>)}</select></div>
                <div><label style={LBL}>Date</label><input type="date" value={form.date} onChange={e=>F({date:e.target.value})} style={INP}/></div>
              </div>
              <div>
                <label style={LBL}>Split — {me?.display_name??'You'}: <strong>{form.split_pct}%</strong> · {co?.display_name??'Co-parent'}: <strong>{100-form.split_pct}%</strong></label>
                <input type="range" min="0" max="100" step="1" value={form.split_pct} onChange={e=>F({split_pct:parseInt(e.target.value)})} style={{width:'100%',accentColor:'#0f172a'}}/>
                <div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>
                  {[0,25,50,75,100].map(v=><button key={v} type="button" onClick={()=>F({split_pct:v})} style={{padding:'3px 9px',border:form.split_pct===v?'1.5px solid #0f172a':'1px solid #e2e8f0',borderRadius:6,background:form.split_pct===v?'#0f172a':'#f8fafc',color:form.split_pct===v?'#fff':'#64748b',fontSize:12,fontWeight:form.split_pct===v?700:400,cursor:'pointer'}}>{v}%</button>)}
                </div>
              </div>
              {!editingId&&(
                <div>
                  <label style={LBL}>Receipt (optional)</label>
                  {!receiptPreview
                    ?<label style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',border:'1.5px dashed #cbd5e1',borderRadius:10,cursor:'pointer',color:'#64748b',fontSize:13}}><PaperClipIcon style={{width:14,height:14,color:'#94a3b8'}}/> Attach photo or PDF<input type="file" accept="image/*,.pdf" onChange={handleReceipt} style={{display:'none'}}/></label>
                    :<div style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid #e2e8f0'}}><img src={receiptPreview} alt="Receipt" style={{width:'100%',maxHeight:100,objectFit:'cover',display:'block'}}/><button onClick={()=>{setReceiptFile(null);setReceiptPreview(null)}} style={{position:'absolute',top:5,right:5,width:22,height:22,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:11,height:11,color:'#fff'}}/></button></div>
                  }
                </div>
              )}
              {saveErr&&<div style={{padding:'9px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,fontSize:13,color:'#dc2626'}}>{saveErr}</div>}
              <button onClick={submitExpense} disabled={saving} style={{padding:13,background:saving?'#94a3b8':'#0f172a',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:600,cursor:saving?'not-allowed':'pointer'}}>
                {saving?'Saving…':editingId?'Save changes':'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTLE MODAL ── */}
      {settleModal&&(
        <div onClick={e=>e.target===e.currentTarget&&setSettleModal(null)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'24px 24px 0 0',padding:22,width:'100%',maxWidth:480}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{fontSize:17,fontWeight:700,color:'#0f172a',margin:0}}>Record settlement</h3>
              <button onClick={()=>setSettleModal(null)} style={{width:30,height:30,background:'#f1f5f9',border:'none',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><XMarkIcon style={{width:15,height:15,color:'#64748b'}}/></button>
            </div>
            <div style={{background:'#0f172a',borderRadius:14,padding:'16px 20px',marginBottom:14,textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>Balance to settle</div>
              <div style={{fontSize:38,fontWeight:700,color:'#4ade80',letterSpacing:'-1px'}}>
                {sym(settleModal.currency)}{(expenseOwed(settleModal)-Number(settleModal.settled_amount??0)).toFixed(2)}
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:3}}>of {sym(settleModal.currency)}{Number(settleModal.amount).toFixed(2)} total</div>
            </div>
            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,padding:'9px 13px',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:13,color:'#0f172a'}}>{settleModal.description}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{settleModal.kid?.name&&`${settleModal.kid.name} · `}{settleModal.category?.name}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              <div><label style={LBL}>Amount settling</label><input type="number" value={settleForm.amount} onChange={e=>setSettleForm(p=>({...p,amount:e.target.value}))} step="0.01" min="0.01" style={INP} autoFocus/></div>
              <div><label style={LBL}>Date</label><input type="date" value={settleForm.settlement_date} onChange={e=>setSettleForm(p=>({...p,settlement_date:e.target.value}))} style={INP}/></div>
              <div><label style={LBL}>Note (optional)</label><input value={settleForm.note} onChange={e=>setSettleForm(p=>({...p,note:e.target.value}))} placeholder="e.g. Bank transfer" style={INP}/></div>
              <div style={{padding:'9px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:12,color:'#92400e'}}>
                This will notify <strong>{co?.display_name??'co-parent'}</strong> to review and approve this settlement.
              </div>
              <button onClick={submitSettlement} disabled={settling}
                style={{padding:'12px 16px',background:settling?'#6ee7b7':'#059669',color:'#fff',border:'none',borderRadius:4,fontSize:14,fontWeight:600,cursor:settling?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
                <CheckCircleIcon style={{width:17,height:17}}/> {settling?'Sending…':'Send for approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt viewer */}
      {viewReceipt&&(
        <div onClick={()=>setViewReceipt(null)} style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,cursor:'zoom-out'}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:760,width:'100%'}}>
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
      {toast&&(
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:600,background:'#0f172a',color:'#fff',padding:'10px 18px',borderRadius:3,fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(0,0,0,0.15)',whiteSpace:'nowrap'}}>
          <CheckCircleIcon style={{width:14,height:14,color:'#4ade80'}}/> {toast}
        </div>
      )}
    </Shell>
  )
}

function ExpensesTab({ expenses, ctx, cs, STATUS_CONFIG, onEdit, onSettle, onApprove, onReject, onDelete }: {
  expenses:any[]; ctx:any; cs:string; STATUS_CONFIG:any
  onEdit:(e:any)=>void; onSettle:(e:any)=>void
  onApprove:(id:string)=>void; onReject:(id:string)=>void
  onDelete:(id:string)=>void
}) {
  const [groupBy, setGroupBy] = React.useState<'date'|'category'|'payer'>('date')
  const [sortAsc, setSortAsc] = React.useState(false)
  const [expanded, setExpanded] = React.useState<Record<string,boolean>>({})
  const sorted = [...expenses].sort((a,b)=>{ const d=new Date(a.date).getTime()-new Date(b.date).getTime(); return sortAsc?d:-d })
  const groups: Record<string,{label:string;color:string;items:any[]}> = {}
  for (const exp of sorted) {
    let key='',label='',color=''
    if (groupBy==='date') { const d=new Date(exp.date); key=d.toISOString().slice(0,7); label=d.toLocaleDateString('en-AU',{month:'long',year:'numeric'}); color='#1a3a6b' }
    else if (groupBy==='category') { key=exp.category?.id??'none'; label=exp.category?.name??'Uncategorised'; color=exp.category?.color??'#94a3b8' }
    else { key=exp.paid_by_user_id??'unknown'; const m=ctx?.members?.find((m:any)=>m.user_id===key); label=m?.display_name??'Unknown'; color=m?.color??'#94a3b8' }
    if (!groups[key]) groups[key]={label,color,items:[]}
    groups[key].items.push(exp)
  }
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,gap:8,flexWrap:'wrap'}}>
        <div style={{display:'flex',background:'#f1f5f9',borderRadius:9,padding:2,gap:1}}>
          {(['date','category','payer'] as const).map(g=>(
            <button key={g} onClick={()=>setGroupBy(g)} style={{padding:'5px 11px',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',background:groupBy===g?'#0f172a':'transparent',color:groupBy===g?'#fff':'#64748b',boxShadow:'none'}}>
              {g.charAt(0).toUpperCase()+g.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={()=>setSortAsc(p=>!p)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 11px',border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',fontSize:12,fontWeight:600,color:'#64748b',cursor:'pointer'}}>
          {sortAsc?'↑ Oldest':'↓ Newest'}
        </button>
      </div>
      {expenses.length===0&&<div style={{padding:'40px 0',textAlign:'center',color:'#94a3b8',fontSize:14}}>No expenses for this period</div>}
      {Object.entries(groups).map(([key,g])=>{
        const isOpen = expanded[key]!==false
        const total  = g.items.reduce((s:number,e:any)=>s+e.amount,0)
        return (
          <div key={key} style={{marginBottom:10}}>
            <button onClick={()=>setExpanded(p=>({...p,[key]:!p[key]}))} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:0,cursor:'pointer',borderBottom:isOpen?'1px solid #e2e8f0':'1px solid #e2e8f0'}}>
              
              <span style={{flex:1,textAlign:'left',fontSize:13,fontWeight:700,color:'#0f172a'}}>{g.label}</span>
              <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>{g.items.length} · {cs}{total.toFixed(2)}</span>
              <span style={{fontSize:11,color:'#94a3b8'}}>{isOpen?'▲':'▼'}</span>
            </button>
            {isOpen&&(
              <div style={{border:'1px solid #e2e8f0',borderTop:'none',borderRadius:'0 0 12px 12px',overflow:'hidden'}}>
                {g.items.map((exp:any,idx:number)=>{
                  const cfg=STATUS_CONFIG[exp.settlement_status as keyof typeof STATUS_CONFIG]
                  const payer=ctx?.members?.find((m:any)=>m.user_id===exp.paid_by_user_id)
                  const isLast=idx===g.items.length-1
                  const isOwner=exp.created_by===ctx?.myUserId
                  const canApprove=exp.settlement_status==='pending_approval'&&exp.pending_approval_by!==ctx?.myUserId
                  return (
                    <div key={exp.id} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#fff',borderBottom:isLast?'none':'1px solid #f8fafc',flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:200}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{exp.description}</div>
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:2,display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                          {exp.category&&<span style={{background:(exp.category.color??'#94a3b8')+'20',color:exp.category.color??'#94a3b8',padding:'1px 6px',borderRadius:99,fontWeight:600}}>{exp.category.name}</span>}
                          {exp.kid&&<span style={{background:(exp.kid.color??'#94a3b8')+'20',color:exp.kid.color??'#94a3b8',padding:'1px 6px',borderRadius:99,fontWeight:600}}>{exp.kid.name}</span>}
                          {payer&&<span style={{fontWeight:500,color:'#6b7280'}}>{payer.user_id===ctx?.myUserId?'You':payer.display_name} paid</span>}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{cs}{exp.amount.toFixed(2)}</div>
                        <span style={{display:'inline-flex',alignItems:'center',gap:2,padding:'2px 6px',borderRadius:99,fontSize:9,fontWeight:700,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,marginTop:2}}>
                          <span style={{width:4,height:4,borderRadius:'50%',background:cfg.color,display:'inline-block'}}></span>{cfg.label}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:4,flexShrink:0,justifyContent:'flex-end'}}>
                        {exp.settlement_status==='outstanding'&&<button onClick={()=>onSettle(exp)} title="Settle" style={{width:26,height:26,border:'1px solid #d1d5db',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#374151'}}>✓</button>}
                        {canApprove&&<>
                          <button onClick={()=>onApprove(exp.id)} style={{width:26,height:26,border:'none',borderRadius:3,background:'#059669',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11}}>✓</button>
                          <button onClick={()=>onReject(exp.id)} style={{width:26,height:26,border:'1px solid #fecaca',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#dc2626',fontSize:11}}>✕</button>
                        </>}
                        {isOwner&&<>
                          <button onClick={()=>onEdit(exp)} title="Edit" style={{width:26,height:26,border:'1px solid #e2e8f0',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#374151'}}>✎</button>
                          <button onClick={()=>{if(confirm('Delete?'))onDelete(exp.id)}} title="Delete" style={{width:26,height:26,border:'1px solid #fecaca',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#dc2626'}}>✕</button>
                        </>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
function ChartCard({title,children}:{title:string;children:React.ReactNode}) {
  return (
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:4,padding:'14px 16px'}}>
      <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:12}}>{title}</div>
      {children}
    </div>
  )
}
