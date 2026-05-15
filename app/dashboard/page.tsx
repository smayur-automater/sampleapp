'use client'
import React from 'react'
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ExclamationCircleIcon,
  EyeIcon,
  LockClosedIcon,
  PaperClipIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { CURRENCIES } from '@/components/CurrencySelect'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

import { logAudit } from '@/lib/audit'

// ── Types ──────────────────────────────────────────────────────────
type SettlementStatus = 'outstanding' | 'partial' | 'settled'
interface Kid      { id: string; name: string; color: string }
interface Category { id: string; name: string; color: string }
interface Expense {
  id: string; description: string; amount: number; currency: string
  date: string; split_pct: number; created_at: string
  paid_by_user_id: string | null; created_by: string | null
  receipt_url: string | null; archived: boolean | null
  settlement_status: SettlementStatus
  settled_amount: number; settled_at: string | null
  settlement_note: string | null
  kid:      { id: string; name: string; color: string } | null
  category: { id: string; name: string } | null
}
interface Usage { plan: 'free'|'premium'; count: number; can_add: boolean; limit: number | null }

// ── Helpers ────────────────────────────────────────────────────────
const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'
const PERIODS = [
  { key: 'month', label: 'Month' }, { key: '90', label: '90d' },
  { key: 'year',  label: 'Year'  }, { key: 'all', label: 'All'  },
] as const
type Period = typeof PERIODS[number]['key']
type StatusFilter = 'all' | SettlementStatus

const STATUS_CONFIG: Record<SettlementStatus, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  outstanding: { label: 'Unpaid',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: ExclamationCircleIcon },
  partial:     { label: 'Partial',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', Icon: ClockIcon },
  settled:     { label: 'Settled',  color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircleIcon },
}

const INP: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' as const }

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null
  const R = Math.PI / 180, r = innerRadius + (outerRadius - innerRadius) * 0.5
  return <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>
}

// ── Component ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { ctx, loading: ctxLoading, error: ctxError, reload: reloadCtx } = useHousehold()
  const [expenses,    setExpenses]    = useState<Expense[]>([])
  const [kids,        setKids]        = useState<Kid[]>([])
  const [cats,        setCats]        = useState<Category[]>([])
  const [usage,       setUsage]       = useState<Usage | null>(null)
  const [splitRules,  setSplitRules]  = useState<Record<string, { split_pct: number; is_optional: boolean }>>({})
  const [currency,    setCurrency]    = useState('AUD')
  const [period,      setPeriod]      = useState<Period>('month')
  const [statusFilter,setStatusFilter]= useState<StatusFilter>('all')
  const [tab,         setTab]         = useState<'overview'|'analytics'|'expenses'>('overview')
  const [pageLoad,    setPageLoad]    = useState(false)

  // Modals
  const [expenseModal, setExpenseModal] = useState(false)
  const [editingId,    setEditingId]   = useState<string|null>(null)
  const [settleModal,  setSettleModal] = useState<Expense|null>(null)
  const [saving,       setSaving]      = useState(false)
  const [settling,     setSettling]    = useState(false)
  const [saveErr,      setSaveErr]     = useState('')
  const [viewReceipt,  setViewReceipt] = useState<string|null>(null)
  const [receiptFile,  setReceiptFile] = useState<File|null>(null)
  const [receiptPreview,setReceiptPreview] = useState<string|null>(null)
  const [expandedId,   setExpandedId] = useState<string|null>(null)

  const EMPTY = { description: '', amount: '', currency: 'AUD', kid_id: '', category_id: '', paid_by_user_id: '', date: new Date().toISOString().split('T')[0], split_pct: 50 }
  const [form, setForm] = useState(EMPTY)
  const F = (k: Partial<typeof EMPTY>) => setForm(p => ({ ...p, ...k }))

  const SETTLE_EMPTY = { amount: '', note: '', settlement_date: new Date().toISOString().split('T')[0] }
  const [settleForm, setSettleForm] = useState(SETTLE_EMPTY)

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  const loadData = useCallback(async () => {
    if (!ctx) return
    setPageLoad(true)
    try {
      const [e, k, c, u, r] = await Promise.all([
        supabase.from('expenses')
          .select('id,description,amount,currency,date,created_at,split_pct,paid_by_user_id,created_by,receipt_url,archived,settlement_status,settled_amount,settled_at,settlement_note,kid:kids(id,name,color),category:categories(id,name,color)')
          .eq('household_id', ctx.household_id)
          .eq('archived', false)
          .order('created_at', { ascending: false }),
        supabase.from('kids').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
        supabase.from('categories').select('id,name,color').eq('household_id', ctx.household_id).order('name'),
        supabase.rpc('get_my_usage'),
        supabase.from('split_rules').select('category_id,split_pct,is_optional').eq('household_id', ctx.household_id),
      ])
      setExpenses((e.data ?? []) as unknown as Expense[])
      setKids(k.data ?? [])
      setCats(c.data ?? [])
      if (!u.error && u.data) setUsage(u.data as Usage)
      const rulesMap: Record<string, { split_pct: number; is_optional: boolean }> = {}
      ;(r.data ?? []).forEach((rule: any) => { rulesMap[rule.category_id] = { split_pct: rule.split_pct, is_optional: rule.is_optional } })
      setSplitRules(rulesMap)
    } catch (err) {
      console.error('loadData error:', err)
    }
    setPageLoad(false)
  }, [ctx])

  // Run loadData when ctx first becomes available (not on every ctx change)
  const ctxIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (ctx && ctx.household_id !== ctxIdRef.current) {
      ctxIdRef.current = ctx.household_id
      loadData()
    }
  }, [ctx, loadData])

  // ── Add / Edit expense ─────────────────────────────────────────
  function openAdd() {
    // Only block if we definitively know plan is free AND over limit
    if (usage && usage.plan === 'free' && usage.can_add === false) {
      setSaveErr('Free plan limit reached (10 expenses). Upgrade to Premium to add more.'); return
    }
    setEditingId(null); setForm(EMPTY); setReceiptFile(null); setReceiptPreview(null); setSaveErr(''); setExpenseModal(true)
  }
  function openEdit(exp: Expense) {
    setEditingId(exp.id)
    setForm({ description: exp.description, amount: String(exp.amount), currency: exp.currency, kid_id: exp.kid?.id ?? '', category_id: exp.category?.id ?? '', paid_by_user_id: exp.paid_by_user_id ?? '', date: exp.date, split_pct: exp.split_pct })
    setReceiptFile(null); setReceiptPreview(null); setSaveErr(''); setExpenseModal(true)
  }

  function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) { setSaveErr('File must be under 10 MB'); return }
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

    let receipt_url: string | null | undefined = undefined
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop() ?? 'jpg'
      const path = `${ctx.household_id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, receiptFile, { upsert: true })
      if (upErr) { setSaveErr('Receipt upload failed: ' + upErr.message); setSaving(false); return }
      const { data: ud } = supabase.storage.from('receipts').getPublicUrl(path)
      receipt_url = ud?.publicUrl ?? null
    }

    const payload: any = { description: form.description.trim(), amount: parseFloat(form.amount), currency: form.currency, kid_id: form.kid_id, category_id: form.category_id, paid_by_user_id: form.paid_by_user_id || null, date: form.date, split_pct: form.split_pct }
    if (receipt_url !== undefined) payload.receipt_url = receipt_url

    let error: any
    if (editingId) {
      ;({ error } = await supabase.from('expenses').update(payload).eq('id', editingId))
    } else {
      payload.household_id = ctx.household_id; payload.created_by = ctx.myUserId
      ;({ error } = await supabase.from('expenses').insert(payload))
    }
    setSaving(false)
    if (error) { setSaveErr(error.message); return }

    const kidName = kids.find(k => k.id === form.kid_id)?.name ?? ''
    await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: me?.display_name ?? 'Unknown', action: editingId ? 'expense.edit' : 'expense.add', entity: form.description.trim(), detail: `${form.currency} ${parseFloat(form.amount).toFixed(2)} · ${kidName}` })
    setExpenseModal(false); loadData()
  }

  async function removeExpense(id: string, receiptUrl: string | null) {
    if (!confirm('Delete this expense?')) return
    if (receiptUrl) { const path = receiptUrl.split('/receipts/')[1]; if (path) await supabase.storage.from('receipts').remove([decodeURIComponent(path)]) }
    const exp = expenses.find(e => e.id === id)
    await supabase.from('expenses').delete().eq('id', id)
    if (exp && ctx && me) await logAudit({ household_id: ctx.household_id, user_id: ctx.myUserId, actor_name: me.display_name, action: 'expense.delete', entity: exp.description, detail: `${exp.currency} ${Number(exp.amount).toFixed(2)}` })
    loadData()
  }

  // ── Settlement ─────────────────────────────────────────────────
  function openSettle(exp: Expense) {
    // Pre-fill with what's still owed
    const owed = expenseOwed(exp)
    const remaining = owed - Number(exp.settled_amount ?? 0)
    setSettleForm({ amount: remaining.toFixed(2), note: '', settlement_date: new Date().toISOString().split('T')[0] })
    setSettleModal(exp)
  }

  function expenseOwed(exp: Expense): number {
    // How much does the other party owe on this expense?
    // If I created it: co-parent owes me their share (100 - split_pct)%
    // If co-parent created it: I owe them my share (split_pct)%
    const isMine = exp.created_by === ctx?.myUserId
    return Number(exp.amount) * (isMine ? (100 - exp.split_pct) : exp.split_pct) / 100
  }

  async function submitSettlement() {
    if (!settleModal || !ctx) return
    const amt = parseFloat(settleForm.amount)
    if (isNaN(amt) || amt <= 0) return
    setSettling(true)

    // Who pays whom: the one who didn't pay the expense pays the other
    const payer    = settleModal.created_by === ctx.myUserId ? co?.user_id : ctx.myUserId
    const receiver = settleModal.created_by === ctx.myUserId ? ctx.myUserId : co?.user_id

    if (!payer || !receiver) { setSettling(false); return }

    const { error } = await supabase.rpc('record_settlement', {
      hh_id:       ctx.household_id,
      paid_by_uid: payer,
      recv_by_uid: receiver,
      amt,
      curr:        settleModal.currency,
      note_text:   settleForm.note || null,
      settle_date: settleForm.settlement_date,
      exp_id:      settleModal.id,
      month_yr:    null,
    })

    setSettling(false)
    if (error) { alert(error.message); return }
    setSettleModal(null)
    loadData()
  }

  async function markMonthSettled(monthYear: string) {
    if (!ctx || !me || !co) return
    if (!confirm(`Mark all outstanding expenses in ${monthYear} as settled?`)) return

    await supabase.rpc('record_settlement', {
      hh_id:       ctx.household_id,
      paid_by_uid: co.user_id,
      recv_by_uid: me.user_id,
      amt:         stats.balance,
      curr:        currency,
      note_text:   `Monthly settlement ${monthYear}`,
      settle_date: new Date().toISOString().split('T')[0],
      exp_id:      null,
      month_yr:    monthYear,
    })
    loadData()
  }

  // ── Export ─────────────────────────────────────────────────────
  function exportCSV() {
    if (usage?.plan !== 'premium') return
    const rows = [
      ['Date','Added','Description','Child','Category','Amount','Currency','Split%','PaidBy','Status','SettledAmt'],
      ...filtered.map(e => [e.date, new Date(e.created_at).toLocaleDateString('en-AU'), e.description, e.kid?.name ?? '', e.category?.name ?? '', e.amount, e.currency, e.split_pct, ctx?.members.find(m => m.user_id === e.paid_by_user_id)?.display_name ?? '', e.settlement_status, e.settled_amount ?? 0])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `coparent-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  // ── Data derivations ───────────────────────────────────────────
  const cs = sym(currency)
  const filtered = useMemo(() => {
    const now = new Date()
    return expenses
      .filter(e => e.currency === currency)
      .filter(e => {
        if (period === 'all') return true
        const d = new Date(e.date), diff = (now.getTime() - d.getTime()) / 86400000
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (period === '90') return diff <= 90
        if (period === 'year') return d.getFullYear() === now.getFullYear()
        return true
      })
      .filter(e => statusFilter === 'all' ? true : e.settlement_status === statusFilter)
  }, [expenses, currency, period, statusFilter])

  const stats = useMemo(() => {
    const all = expenses.filter(e => e.currency === currency)
    const periodExp = filtered

    const total = periodExp.reduce((s, e) => s + Number(e.amount), 0)
    let mine = 0
    periodExp.forEach(e => { mine += Number(e.amount) * (e.created_by === ctx?.myUserId ? e.split_pct : 100 - e.split_pct) / 100 })
    const theirs = total - mine
    const mePaid = me ? periodExp.filter(e => e.paid_by_user_id === me.user_id).reduce((s, e) => s + Number(e.amount), 0) : 0
    const coPaid = co ? periodExp.filter(e => e.paid_by_user_id === co.user_id).reduce((s, e) => s + Number(e.amount), 0) : 0
    const balance = mePaid - mine  // positive → co owes me

    // Settlement breakdown (using ALL expenses for period, regardless of status filter)
    const allPeriod = expenses.filter(e => e.currency === currency).filter(e => {
      if (period === 'all') return true
      const d = new Date(e.date), diff = (new Date().getTime() - d.getTime()) / 86400000
      if (period === 'month') return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()
      if (period === '90') return diff <= 90
      if (period === 'year') return d.getFullYear() === new Date().getFullYear()
      return true
    })

    const outstandingTotal = allPeriod.filter(e => e.settlement_status === 'outstanding').reduce((s, e) => s + Number(e.amount), 0)
    const partialTotal     = allPeriod.filter(e => e.settlement_status === 'partial').reduce((s, e) => s + Number(e.amount), 0)
    const settledTotal     = allPeriod.filter(e => e.settlement_status === 'settled').reduce((s, e) => s + Number(e.amount), 0)
    const outstandingCount = allPeriod.filter(e => e.settlement_status === 'outstanding').length
    const partialCount     = allPeriod.filter(e => e.settlement_status === 'partial').length
    const settledCount     = allPeriod.filter(e => e.settlement_status === 'settled').length

    // By category
    const byCatMap: Record<string, { name: string; color: string; amount: number }> = {}
    periodExp.forEach(e => { if (!e.category?.id) return; if (!byCatMap[e.category.id]) byCatMap[e.category.id] = { name: e.category.name, color: cats.find(c => c.id === e.category?.id)?.color ?? '#374151', amount: 0 }; byCatMap[e.category.id].amount += Number(e.amount) })

    // By kid
    const byKidMap: Record<string, { name: string; color: string; amount: number; count: number }> = {}
    periodExp.forEach(e => { if (!e.kid?.id) return; if (!byKidMap[e.kid.id]) byKidMap[e.kid.id] = { name: e.kid.name, color: e.kid.color, amount: 0, count: 0 }; byKidMap[e.kid.id].amount += Number(e.amount); byKidMap[e.kid.id].count++ })

    // By owner
    const byOwnerMap: Record<string, { name: string; color: string; amount: number }> = {}
    periodExp.forEach(e => { const m = ctx?.members.find(m => m.user_id === e.created_by); if (!m) return; if (!byOwnerMap[m.user_id]) byOwnerMap[m.user_id] = { name: m.display_name, color: m.color, amount: 0 }; byOwnerMap[m.user_id].amount += Number(e.amount) })

    const splitData = me && co ? [{ name: me.display_name, value: parseFloat(mine.toFixed(2)), color: me.color }, { name: co.display_name, value: parseFloat(theirs.toFixed(2)), color: co.color }] : []

    return { total, mine, theirs, mePaid, coPaid, balance, count: periodExp.length, outstandingTotal, partialTotal, settledTotal, outstandingCount, partialCount, settledCount, byCat: Object.values(byCatMap).sort((a, b) => b.amount - a.amount), byKid: Object.values(byKidMap).sort((a, b) => b.amount - a.amount), byOwner: Object.values(byOwnerMap), splitData }
  }, [filtered, expenses, me, co, ctx, cats, currency, period])

  const isPremium = usage?.plan === 'premium'
  const atLimit   = usage ? !usage.can_add : false

  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  // Brand new user — household still being created by the trigger
  // Show a friendly setup screen instead of an error
  if (!ctxLoading && !ctx && !ctxError) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite', marginBottom: 20 }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Setting up your account…</div>
        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 320 }}>
          We&apos;re creating your household and default categories. This takes just a moment.
        </div>
      </div>
    </Shell>
  )

  if (ctxLoading) return <Shell><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>
  if (ctxError)   return <Shell><div style={{ padding: 24, textAlign: 'center' }}><p style={{ color: '#dc2626', marginBottom: 12 }}>{ctxError}</p><button onClick={reloadCtx} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button></div></Shell>

  return (
    <Shell>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Dashboard</h1>
              {isPremium && <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#d97706' }}><StarIcon style={{ width: 10, height: 10 }}/> Premium</span>}
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{co ? `Shared with ${co.display_name}` : 'Your household'}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isPremium && <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><ArrowDownTrayIcon style={{ width: 13, height: 13 }}/> CSV</button>}
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#fff', color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
          </div>
        </div>

        {/* Free plan bar */}
        {usage && !isPremium && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Free plan · {usage.count} / 10 expenses</span>
                {atLimit && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Limit reached</span>}
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((usage.count / 10) * 100, 100)}%`, background: atLimit ? '#dc2626' : '#0f172a' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── SETTLEMENT STATUS CARDS ─────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {(['outstanding','partial','settled'] as SettlementStatus[]).map(status => {
            const cfg = STATUS_CONFIG[status]
            const count = status === 'outstanding' ? stats.outstandingCount : status === 'partial' ? stats.partialCount : stats.settledCount
            const total = status === 'outstanding' ? stats.outstandingTotal : status === 'partial' ? stats.partialTotal : stats.settledTotal
            const isActive = statusFilter === status
            return (
              <button key={status} onClick={() => setStatusFilter(isActive ? 'all' : status)}
                style={{ background: isActive ? cfg.bg : '#fff', border: `${isActive ? '2px' : '1px'} solid ${isActive ? cfg.color : '#e2e8f0'}`, borderRadius: 14, padding: '12px 10px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <cfg.Icon style={{ width: 13, height: 13, color: cfg.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{cs}{total.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{count} expense{count !== 1 ? 's' : ''}</div>
              </button>
            )
          })}
        </div>

        {/* Settlement summary / balance */}
        {me && co && Math.abs(stats.balance) > 0.01 && (
          <div style={{ background: stats.balance >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${stats.balance >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: stats.balance >= 0 ? '#059669' : '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 3 }}>
                {stats.balance >= 0 ? `${co.display_name} owes ${me.display_name}` : `${me.display_name} owes ${co.display_name}`}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stats.balance >= 0 ? '#059669' : '#dc2626' }}>{cs}{Math.abs(stats.balance).toFixed(2)}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Based on {statusFilter === 'all' ? 'all' : statusFilter} expenses this {period}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => markMonthSettled(currentMonthYear)}
                style={{ padding: '8px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                ✓ Settle month
              </button>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Marks all as settled</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 3, marginBottom: 14, gap: 2 }}>
          {(['overview','analytics','expenses'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, background: tab === t ? '#0f172a' : 'transparent', color: tab === t ? '#fff' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' as const }}>{t === 'expenses' ? 'Expenses' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {/* Period pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' as const }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{ padding: '5px 12px', border: period === p.key ? '1.5px solid #0f172a' : '1px solid #e2e8f0', borderRadius: 99, background: period === p.key ? '#0f172a' : '#fff', color: period === p.key ? '#fff' : '#64748b', fontSize: 12, fontWeight: period === p.key ? 600 : 400, cursor: 'pointer' }}>{p.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {tab === 'overview' && (<>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Total',           value: `${cs}${stats.total.toFixed(2)}`,  sub: `${stats.count} expenses`, color: '#64748b' },
              { label: me?.display_name ?? 'Mine',   value: `${cs}${stats.mine.toFixed(2)}`,  sub: `${stats.total > 0 ? (stats.mine/stats.total*100).toFixed(0) : 0}%`, color: me?.color ?? '#059669' },
              { label: co?.display_name ?? 'Theirs', value: `${cs}${stats.theirs.toFixed(2)}`, sub: `${stats.total > 0 ? (stats.theirs/stats.total*100).toFixed(0) : 0}%`, color: co?.color ?? '#94a3b8' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '13px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Add button */}
          <button onClick={openAdd} disabled={atLimit}
            style={{ width: '100%', padding: 13, background: atLimit ? '#e2e8f0' : '#0f172a', color: atLimit ? '#94a3b8' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: atLimit ? 'not-allowed' : 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {atLimit ? <><LockClosedIcon style={{ width: 15, height: 15 }}/> Limit reached — upgrade to Premium</> : <><PlusIcon strokeWidth={2.5} style={{ width: 18, height: 18 }}/> Add expense</>}
          </button>

          {/* Status filter label */}
          {statusFilter !== 'all' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ ...STATUS_CONFIG[statusFilter as SettlementStatus], fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: STATUS_CONFIG[statusFilter as SettlementStatus].bg, color: STATUS_CONFIG[statusFilter as SettlementStatus].color, border: `1px solid ${STATUS_CONFIG[statusFilter as SettlementStatus].border}` }}>
                Showing: {STATUS_CONFIG[statusFilter as SettlementStatus].label} only
              </span>
              <button onClick={() => setStatusFilter('all')} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear filter</button>
            </div>
          )}

          {/* Expense list — sorted by recently added */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · most recent first
          </div>

          {pageLoad ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div> :
           filtered.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
              <BanknotesIcon style={{  margin: '0 auto 12px', display: 'block', width: 32, height: 32, color: "#cbd5e1" }}/>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {statusFilter !== 'all' ? `No ${statusFilter} expenses this period` : 'No expenses this period'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(exp => {
                const cfg     = STATUS_CONFIG[exp.settlement_status]
                const payer   = ctx?.members.find(m => m.user_id === exp.paid_by_user_id)
                const isOwner = exp.created_by === ctx?.myUserId
                const owed    = expenseOwed(exp)
                const remaining = owed - Number(exp.settled_amount ?? 0)
                const isExpanded = expandedId === exp.id

                return (
                  <div key={exp.id} style={{ background: '#fff', border: `1px solid ${isExpanded ? cfg.color + '44' : '#e2e8f0'}`, borderRadius: 13, overflow: 'hidden' }}>
                    {/* Main row */}
                    <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: exp.kid?.color ?? '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                        {exp.kid?.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{exp.description}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {exp.category?.name} · {new Date(exp.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          {payer ? ` · ${payer.display_name} paid` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{sym(exp.currency)}{Number(exp.amount).toFixed(2)}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{exp.split_pct}/{100 - exp.split_pct}</div>
                      </div>

                      {/* Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, background: cfg.bg, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
                        <cfg.Icon style={{ width: 11, height: 11, color: cfg.color }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {exp.receipt_url && (
                          <button onClick={() => setViewReceipt(exp.receipt_url)} style={{ padding: 5, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                            <PaperClipIcon style={{ width: 12, height: 12, color: "#374151" }}/>
                          </button>
                        )}
                        {isOwner && exp.settlement_status !== 'settled' && (
                          <button onClick={() => openEdit(exp)} style={{ padding: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', display: 'flex' }}>
                            <PencilIcon style={{ width: 12, height: 12, color: "#64748b" }}/>
                          </button>
                        )}
                        {/* Settle button */}
                        {exp.settlement_status !== 'settled' && (
                          <button onClick={() => openSettle(exp)} style={{ padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircleIcon style={{ width: 11, height: 11 }}/> Settle
                          </button>
                        )}
                        <button onClick={() => setExpandedId(isExpanded ? null : exp.id)} style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          {isExpanded ? <ChevronUpIcon style={{ width: 14, height: 14, color: "#94a3b8" }}/> : <ChevronDownIcon style={{ width: 14, height: 14, color: "#94a3b8" }}/>}
                        </button>
                        {isOwner && (
                          <button onClick={() => removeExpense(exp.id, exp.receipt_url)} style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', display: 'flex' }}>
                            <XMarkIcon style={{ width: 14, height: 14 }}/>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: '10px 14px 14px', background: cfg.bg, borderTop: `1px solid ${cfg.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: exp.settlement_note ? 10 : 0 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 2 }}>Total owed</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{sym(exp.currency)}{owed.toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 2 }}>Settled</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{sym(exp.currency)}{Number(exp.settled_amount ?? 0).toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: 2 }}>Remaining</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: remaining > 0 ? '#dc2626' : '#059669' }}>{sym(exp.currency)}{Math.max(remaining, 0).toFixed(2)}</div>
                          </div>
                        </div>
                        {exp.settlement_note && (
                          <div style={{ fontSize: 12, color: cfg.color, marginTop: 6, fontStyle: 'italic' }}>Note: {exp.settlement_note}</div>
                        )}
                        {exp.settled_at && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Settled {new Date(exp.settled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        )}
                        {/* Progress bar */}
                        {owed > 0 && (
                          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
                            <div style={{ height: '100%', width: `${Math.min((Number(exp.settled_amount ?? 0) / owed) * 100, 100)}%`, background: exp.settlement_status === 'settled' ? '#059669' : exp.settlement_status === 'partial' ? '#d97706' : '#dc2626', transition: 'width 0.3s' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>)}

        {/* ── ANALYTICS ───────────────────────────────────── */}
        {tab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Settlement state pie */}
            {stats.outstandingTotal + stats.partialTotal + stats.settledTotal > 0 && (
              <ChartCard title="Settlement breakdown">
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={[
                        { name: 'Outstanding', value: stats.outstandingTotal, color: '#dc2626' },
                        { name: 'Partial',     value: stats.partialTotal,     color: '#d97706' },
                        { name: 'Settled',     value: stats.settledTotal,     color: '#059669' },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={72} dataKey="value" labelLine={false} label={PieLabel}>
                        {[{color:'#dc2626'},{color:'#d97706'},{color:'#059669'}].map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${cs}${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([['outstanding', stats.outstandingTotal, stats.outstandingCount], ['partial', stats.partialTotal, stats.partialCount], ['settled', stats.settledTotal, stats.settledCount]] as [SettlementStatus, number, number][]).map(([status, total, count]) => {
                      const cfg = STATUS_CONFIG[status]
                      return (
                        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <cfg.Icon style={{ width: 14, height: 14, color: cfg.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{cfg.label}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{count} expenses · {cs}{total.toFixed(2)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </ChartCard>
            )}

            {/* Cost split pie */}
            {stats.splitData.length === 2 && stats.total > 0 && (
              <ChartCard title="Cost split">
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={stats.splitData} cx="50%" cy="50%" outerRadius={72} dataKey="value" labelLine={false} label={PieLabel}>
                        {stats.splitData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${cs}${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.splitData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{cs}{d.value.toFixed(2)} · {stats.total > 0 ? (d.value/stats.total*100).toFixed(0) : 0}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}

            {/* By parent pie */}
            {stats.byOwner.length > 0 && (
              <ChartCard title="By parent">
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={stats.byOwner} cx="50%" cy="50%" outerRadius={72} dataKey="amount" labelLine={false} label={PieLabel}>
                        {stats.byOwner.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${cs}${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.byOwner.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.name}</div><div style={{ fontSize: 11, color: '#64748b' }}>{cs}{d.amount.toFixed(2)} · {stats.total > 0 ? (d.amount/stats.total*100).toFixed(0) : 0}%</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}

            {/* By child pie */}
            {stats.byKid.length > 0 && (
              <ChartCard title="By child">
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={stats.byKid} cx="50%" cy="50%" outerRadius={72} dataKey="amount" labelLine={false} label={PieLabel}>
                        {stats.byKid.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${cs}${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                    {stats.byKid.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.name}</div><div style={{ fontSize: 11, color: '#64748b' }}>{cs}{d.amount.toFixed(2)} · {d.count} expenses</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}

            {/* By category pie */}
            {stats.byCat.length > 0 && (
              <ChartCard title="By category">
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={stats.byCat} cx="50%" cy="50%" outerRadius={72} dataKey="amount" labelLine={false} label={PieLabel}>
                        {stats.byCat.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${cs}${Number(v).toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                    {stats.byCat.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.name}</div><div style={{ fontSize: 11, color: '#64748b' }}>{cs}{d.amount.toFixed(2)} · {stats.total > 0 ? (d.amount/stats.total*100).toFixed(0) : 0}%</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}
          </div>
        )}

        {/* ── EXPENSES TAB ─────────────────────────────────── */}
        {tab === 'expenses' && (
          <ExpensesTab
            expenses={filtered}
            ctx={ctx}
            cs={cs}
            STATUS_CONFIG={STATUS_CONFIG}
            onEdit={(exp) => { setEditingId(exp.id); setForm({ description: exp.description, amount: String(exp.amount), currency: exp.currency, date: exp.date, split_pct: exp.split_pct, kid_id: exp.kid?.id ?? '', category_id: exp.category?.id ?? '', paid_by_user_id: exp.paid_by_user_id ?? ctx?.myUserId ?? '' }); setExpenseModal(true) }}
            onSettle={(exp) => { setSettleModal(exp); setSettleForm({ amount: String((exp.amount - exp.settled_amount).toFixed(2)), settlement_date: new Date().toISOString().split('T')[0], note: '' }) }}
            onDelete={(id) => removeExpense(id, null)}
          />
        )}

      </div>

      {/* ── ADD/EDIT EXPENSE MODAL ────────────────────────── */}
      {expenseModal && (
        <div onClick={e => e.target === e.currentTarget && setExpenseModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{editingId ? 'Edit expense' : 'Add expense'}</h3>
              <button onClick={() => setExpenseModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XMarkIcon style={{ width: 16, height: 16, color: "#64748b" }}/></button>
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
              </div>
              <div>
                <label style={LBL}>Category *</label>
                <select value={form.category_id} onChange={e => {
                  const catId = e.target.value
                  const rule = splitRules[catId]
                  F({ category_id: catId, ...(rule && !rule.is_optional ? { split_pct: rule.split_pct } : {}) })
                }} style={{ ...INP, cursor: 'pointer', color: form.category_id ? '#0f172a' : '#94a3b8' }}>
                  <option value="">Select category…</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {form.category_id && splitRules[form.category_id] && (
                  <div style={{ marginTop: 4, fontSize: 11, color: splitRules[form.category_id].is_optional ? '#d97706' : '#059669' }}>
                    ⚡ {splitRules[form.category_id].is_optional ? 'Optional expense' : `Smart rule: ${splitRules[form.category_id].split_pct}/${100 - splitRules[form.category_id].split_pct}`}
                  </div>
                )}
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
                <label style={LBL}>Split — {me?.display_name ?? 'You'}: <strong>{form.split_pct}%</strong> · {co?.display_name ?? 'Co-parent'}: <strong>{100 - form.split_pct}%</strong></label>
                <input type="range" min="0" max="100" step="1" value={form.split_pct} onChange={e => F({ split_pct: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#0f172a' }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
                  {[0,25,50,75,100].map(v => (
                    <button key={v} type="button" onClick={() => F({ split_pct: v })}
                      style={{ padding: '4px 10px', border: form.split_pct === v ? '1.5px solid #0f172a' : '1px solid #e2e8f0', borderRadius: 6, background: form.split_pct === v ? '#0f172a' : '#f8fafc', color: form.split_pct === v ? '#fff' : '#64748b', fontSize: 12, fontWeight: form.split_pct === v ? 700 : 400, cursor: 'pointer' }}>{v}%</button>
                  ))}
                </div>
              </div>
              {!editingId && (
                <div>
                  <label style={LBL}>Receipt (optional)</label>
                  {!receiptPreview ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', border: '1.5px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', color: '#64748b', fontSize: 13 }}>
                      <PaperClipIcon style={{ width: 15, height: 15, color: "#94a3b8" }}/> Attach photo or PDF
                      <input type="file" accept="image/*,.pdf" onChange={handleReceipt} style={{ display: 'none' }} />
                    </label>
                  ) : (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />
                      <button onClick={() => { setReceiptFile(null); setReceiptPreview(null) }} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XMarkIcon style={{ width: 12, height: 12, color: "#fff" }}/></button>
                    </div>
                  )}
                </div>
              )}
              {saveErr && <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{saveErr}</div>}
              <button onClick={submitExpense} disabled={saving} style={{ padding: 13, background: saving ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTLE MODAL ─────────────────────────────────── */}
      {settleModal && (
        <div onClick={e => e.target === e.currentTarget && setSettleModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Record settlement</h3>
              <button onClick={() => setSettleModal(null)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XMarkIcon style={{ width: 16, height: 16, color: "#64748b" }}/></button>
            </div>

            {/* Expense summary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{settleModal.description}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                <span>Total: <strong style={{ color: '#0f172a' }}>{sym(settleModal.currency)}{Number(settleModal.amount).toFixed(2)}</strong></span>
                <span>Owed: <strong style={{ color: '#dc2626' }}>{sym(settleModal.currency)}{expenseOwed(settleModal).toFixed(2)}</strong></span>
                <span>Settled: <strong style={{ color: '#059669' }}>{sym(settleModal.currency)}{Number(settleModal.settled_amount ?? 0).toFixed(2)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={LBL}>Amount being settled</label><input type="number" value={settleForm.amount} onChange={e => setSettleForm(p => ({ ...p, amount: e.target.value }))} step="0.01" min="0.01" style={{ ...INP, fontVariantNumeric: 'tabular-nums' }} autoFocus /></div>
              <div><label style={LBL}>Settlement date</label><input type="date" value={settleForm.settlement_date} onChange={e => setSettleForm(p => ({ ...p, settlement_date: e.target.value }))} style={INP} /></div>
              <div><label style={LBL}>Note (optional)</label><input value={settleForm.note} onChange={e => setSettleForm(p => ({ ...p, note: e.target.value }))} placeholder="e.g. Bank transfer, cash" style={INP} /></div>
              <button onClick={submitSettlement} disabled={settling}
                style={{ padding: 13, background: settling ? '#6ee7b7' : '#059669', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: settling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <CheckCircleIcon style={{ width: 17, height: 17 }}/> {settling ? 'Saving…' : 'Record settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt viewer */}
      {viewReceipt && (
        <div onClick={() => setViewReceipt(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 760, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Receipt</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={viewReceipt} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}><EyeIcon style={{ width: 13, height: 13 }}/> Open</a>
                <button onClick={() => setViewReceipt(null)} style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XMarkIcon style={{ width: 15, height: 15, color: "#fff" }}/></button>
              </div>
            </div>
            <img src={viewReceipt} alt="Receipt" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12 }} />
          </div>
        </div>
      )}
    </Shell>
  )
}


// ── Expenses Tab ──────────────────────────────────────────────────
type GroupBy = 'date' | 'category' | 'payer'

function ExpensesTab({ expenses, ctx, cs, STATUS_CONFIG, onEdit, onSettle, onDelete }: {
  expenses: any[]
  ctx: any
  cs: string
  STATUS_CONFIG: any
  onEdit: (e: any) => void
  onSettle: (e: any) => void
  onDelete: (id: string) => void
}) {
  const [groupBy,  setGroupBy]  = React.useState<GroupBy>('date')
  const [sortAsc,  setSortAsc]  = React.useState(false)
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  // Sort all expenses by date
  const sorted = [...expenses].sort((a, b) => {
    const d = new Date(a.date).getTime() - new Date(b.date).getTime()
    return sortAsc ? d : -d
  })

  // Group by chosen key
  const groups: Record<string, { label: string; color: string; items: any[] }> = {}

  for (const exp of sorted) {
    let key = '', label = '', color = ''
    if (groupBy === 'date') {
      const d = new Date(exp.date)
      key = d.toISOString().slice(0, 7) // YYYY-MM
      label = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
      color = '#1a3a6b'
    } else if (groupBy === 'category') {
      key   = exp.category?.id ?? 'none'
      label = exp.category?.name ?? 'Uncategorised'
      color = exp.category?.color ?? '#94a3b8'
    } else {
      key   = exp.paid_by_user_id ?? 'unknown'
      const member = ctx?.members?.find((m: any) => m.user_id === key)
      label = member?.display_name ?? 'Unknown'
      color = member?.color ?? '#94a3b8'
    }
    if (!groups[key]) groups[key] = { label, color, items: [] }
    groups[key].items.push(exp)
  }

  const groupKeys = Object.keys(groups)

  const toggleGroup = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 9, padding: 2, gap: 1 }}>
          {(['date','category','payer'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              style={{ padding: '5px 11px', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: groupBy === g ? '#fff' : 'transparent', color: groupBy === g ? '#0f172a' : '#64748b', boxShadow: groupBy === g ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setSortAsc(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
          Date {sortAsc ? '↑ oldest' : '↓ newest'}
        </button>
      </div>

      {expenses.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No expenses for this period</div>
      )}

      {/* Groups */}
      {groupKeys.map(key => {
        const g = groups[key]
        const isOpen = expanded[key] !== false // default open
        const groupTotal = g.items.reduce((s, e) => s + e.amount, 0)
        return (
          <div key={key} style={{ marginBottom: 10 }}>
            {/* Group header */}
            <button onClick={() => toggleGroup(key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: isOpen ? '12px 12px 0 0' : 12, cursor: 'pointer', borderBottom: isOpen ? '1px solid #f1f5f9' : '1px solid #e2e8f0' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{g.label}</span>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{g.items.length} · {cs}{groupTotal.toFixed(2)}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expense rows */}
            {isOpen && (
              <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 0, padding: '6px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Description', 'Payer', 'Date & time', 'Amount', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
                  ))}
                </div>

                {g.items.map((exp, idx) => {
                  const cfg    = STATUS_CONFIG[exp.settlement_status as keyof typeof STATUS_CONFIG]
                  const payer  = ctx?.members?.find((m: any) => m.user_id === exp.paid_by_user_id)
                  const isLast = idx === g.items.length - 1
                  const dt     = new Date(exp.created_at ?? exp.date)
                  const dateStr = new Date(exp.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                  const timeStr = dt.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                  const isOwner = exp.created_by === ctx?.myUserId

                  return (
                    <div key={exp.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fff', borderBottom: isLast ? 'none' : '1px solid #f8fafc' }}>

                      {/* Description + category + kid */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.description}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {exp.category && <span style={{ background: (exp.category.color ?? '#94a3b8') + '20', color: exp.category.color ?? '#94a3b8', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>{exp.category.name}</span>}
                          {exp.kid && <span style={{ background: (exp.kid.color ?? '#94a3b8') + '20', color: exp.kid.color ?? '#94a3b8', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>{exp.kid.name}</span>}
                        </div>
                      </div>

                      {/* Payer */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {payer ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                            <div style={{ width: 22, height: 22, borderRadius: 7, background: payer.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>
                              {payer.display_name?.[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{payer.display_name?.split(' ')[0]}</span>
                          </div>
                        ) : <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>}
                      </div>

                      {/* Date & time */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{dateStr}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeStr}</div>
                      </div>

                      {/* Amount + split + status */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{cs}{exp.amount.toFixed(2)}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{exp.split_pct}/{100 - exp.split_pct}</div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, marginTop: 2 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, display: 'inline-block' }}></span>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, justifyContent: 'flex-end' }}>
                        {exp.settlement_status !== 'settled' && (
                          <button onClick={() => onSettle(exp)} title="Settle"
                            style={{ width: 28, height: 28, border: '1px solid #bbf7d0', borderRadius: 7, background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</button>
                        )}
                        {isOwner && (
                          <>
                            <button onClick={() => onEdit(exp)} title="Edit"
                              style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✎</button>
                            <button onClick={() => { if (confirm('Delete this expense?')) onDelete(exp.id) }} title="Delete"
                              style={{ width: 28, height: 28, border: '1px solid #fecaca', borderRadius: 7, background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#dc2626' }}>✕</button>
                          </>
                        )}
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}
