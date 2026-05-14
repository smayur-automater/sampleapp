'use client'
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  LockClosedIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useMemo } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

import { CURRENCIES } from '@/components/CurrencySelect'

interface MonthlySummary {
  year: number; month: number; total: number
  by_currency: { currency: string; total: number; count: number }[] | null
  by_member:   { user_id: string; display_name: string; color: string; paid: number; owed: number }[] | null
  by_category: { name: string; color: string; total: number; count: number }[] | null
  expenses:    {
    id: string; description: string; amount: number; currency: string; date: string
    split_pct: number; kid_name: string; category_name: string
    paid_by_name: string; created_by_name: string
  }[] | null
}
interface Usage { plan: 'free' | 'premium' }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CHART_COLORS = ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2','#374151','#db2777']
const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  return <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>
}

export default function StatementsPage() {
  const { ctx, loading: ctxLoading } = useHousehold()
  const [summary,   setSummary]   = useState<MonthlySummary | null>(null)
  const [usage,     setUsage]     = useState<Usage | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [sending,   setSending]   = useState(false)
  const [toast,     setToast]     = useState('')

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  useEffect(() => { if (ctx) loadUsage() }, [ctx])
  useEffect(() => { if (ctx && usage?.plan === 'premium') loadSummary() }, [ctx, year, month, usage])

  async function loadUsage() {
    const { data } = await supabase.rpc('get_my_usage')
    setUsage(data)
  }

  async function loadSummary() {
    if (!ctx) return
    setLoading(true)
    const { data } = await supabase.rpc('get_monthly_summary', { hh_id: ctx.household_id, yr: year, mo: month })
    setSummary(data)
    setLoading(false)
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const n = new Date(); const ny = n.getFullYear(); const nm = n.getMonth() + 1
    if (year > ny || (year === ny && month >= nm)) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // PDF export — print a clean statement
  function exportPDF() {
    if (!summary || !isPremium) return
    const w = window.open('', '_blank')!
    const members = summary.by_member ?? []
    const cats    = summary.by_category ?? []
    const exps    = summary.expenses ?? []
    const balance = members.length === 2 ? members[0].paid - members[0].owed : 0
    const hhName  = `${me?.display_name ?? ''} & ${co?.display_name ?? ''}`

    w.document.write(`<!DOCTYPE html><html><head>
<title>CoParent Statement — ${MONTH_NAMES[month-1]} ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
  body { color: #0f172a; background: #fff; padding: 40px 48px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin: 24px 0 10px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-box { width: 32px; height: 32px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 12px; }
  .app-name { font-weight: 700; font-size: 16px; }
  .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .kpi-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
  .kpi-val { font-size: 20px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  .settlement { background: ${balance >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${balance >= 0 ? '#bbf7d0' : '#fecaca'}; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
  .settlement-label { font-size: 10px; font-weight: 700; color: ${balance >= 0 ? '#059669' : '#dc2626'}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .settlement-amount { font-size: 22px; font-weight: 700; color: ${balance >= 0 ? '#059669' : '#dc2626'}; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="logo"><div class="logo-box">CP</div><span class="app-name">CoParent</span></div>
    <div style="color:#64748b;margin-top:4px;font-size:12px;">Monthly Statement</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:700">${MONTH_NAMES[month-1]} ${year}</div>
    <div style="color:#64748b;font-size:12px;margin-top:2px">${hhName}</div>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi"><div class="kpi-label">Total spend</div><div class="kpi-val">${sym('AUD')}${Number(summary.total).toFixed(2)}</div></div>
  <div class="kpi"><div class="kpi-label">Expenses</div><div class="kpi-val">${exps.length}</div></div>
  <div class="kpi"><div class="kpi-label">Categories</div><div class="kpi-val">${cats.length}</div></div>
</div>

${members.length > 0 ? `
<h2>Who paid what</h2>
<table><thead><tr><th>Parent</th><th>Paid</th><th>Owes</th><th>Net</th></tr></thead><tbody>
${members.map(m => `<tr><td><strong>${m.display_name}</strong></td><td>$${Number(m.paid).toFixed(2)}</td><td>$${Number(m.owed).toFixed(2)}</td><td style="font-weight:700;color:${m.paid - m.owed >= 0 ? '#059669' : '#dc2626'}">$${Math.abs(m.paid - m.owed).toFixed(2)} ${m.paid - m.owed >= 0 ? 'to receive' : 'to pay'}</td></tr>`).join('')}
</tbody></table>` : ''}

${Math.abs(balance) > 0.01 ? `
<div class="settlement" style="margin-top:16px">
  <div class="settlement-label">${balance >= 0 ? `${co?.display_name} owes ${me?.display_name}` : `${me?.display_name} owes ${co?.display_name}`}</div>
  <div class="settlement-amount">$${Math.abs(balance).toFixed(2)}</div>
</div>` : ''}

${cats.length > 0 ? `
<h2>By category</h2>
<table><thead><tr><th>Category</th><th>Expenses</th><th>Total</th><th>% of spend</th></tr></thead><tbody>
${cats.map(c => `<tr><td>${c.name}</td><td>${c.count}</td><td>$${Number(c.total).toFixed(2)}</td><td>${summary.total > 0 ? (Number(c.total)/summary.total*100).toFixed(0) : 0}%</td></tr>`).join('')}
</tbody></table>` : ''}

<h2>All expenses</h2>
<table><thead><tr><th>Date</th><th>Description</th><th>Child</th><th>Category</th><th>Amount</th><th>Split</th><th>Paid by</th></tr></thead><tbody>
${exps.map(e => `<tr><td>${new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td><td>${e.description}</td><td>${e.kid_name??''}</td><td>${e.category_name??''}</td><td>$${Number(e.amount).toFixed(2)}</td><td>${e.split_pct}/${100-e.split_pct}</td><td>${e.paid_by_name??'—'}</td></tr>`).join('')}
</tbody></table>

<div class="footer">Generated by CoParent · ${new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})}</div>
</body></html>`)
    w.document.close()
    w.print()
    showToast('PDF ready — use Print → Save as PDF')
  }

  function exportCSV() {
    if (!summary || !isPremium) return
    const exps = summary.expenses ?? []
    const rows = [
      ['Date','Description','Child','Category','Amount','Currency','Split %','Paid By','Added By'],
      ...exps.map(e => [e.date, e.description, e.kid_name, e.category_name, e.amount, e.currency, e.split_pct, e.paid_by_name, e.created_by_name]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url
    a.download = `coparent-${year}-${String(month).padStart(2,'0')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  async function emailSummary() {
    if (!isPremium || !summary || !ctx) return
    setSending(true)
    // Record that statement was sent
    await supabase.from('monthly_statements').upsert({
      household_id: ctx.household_id, year, month, emailed: true, emailed_at: new Date().toISOString(),
    }, { onConflict: 'household_id,year,month' })
    setSending(false)
    showToast('Statement marked as sent — configure Resend to enable email delivery')
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const isPremium = usage?.plan === 'premium'
  const cats = summary?.by_category ?? []
  const members = summary?.by_member ?? []
  const exps = summary?.expenses ?? []
  const primaryCurrency = summary?.by_currency?.[0]?.currency ?? 'AUD'
  const cs = sym(primaryCurrency)

  // Settlement
  const meData = members.find(m => m.user_id === ctx?.myUserId)
  const coData = members.find(m => m.user_id !== ctx?.myUserId)
  const balance = meData ? meData.paid - meData.owed : 0

  if (ctxLoading) return (
    <Shell><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div></Shell>
  )

  return (
    <Shell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DocumentTextIcon style={{ width: 20, height: 20, color: "#2563eb" }}/>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Monthly Statement</h1>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#d97706' }}>
                <StarIcon style={{ width: 10, height: 10 }}/> Premium
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Full breakdown of your shared household expenses</p>
          </div>
          {isPremium && summary && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ArrowDownTrayIcon style={{ width: 13, height: 13 }}/> CSV
              </button>
              <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ArrowDownTrayIcon style={{ width: 13, height: 13 }}/> PDF
              </button>
              <button onClick={emailSummary} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
                <EnvelopeIcon style={{ width: 13, height: 13 }}/> {sending ? 'Sending…' : 'Email'}
              </button>
            </div>
          )}
        </div>

        {/* Premium gate */}
        {!isPremium ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '20px 18px', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <LockClosedIcon style={{  marginTop: 2, flexShrink: 0, width: 18, height: 18, color: "#d97706" }}/>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e', marginBottom: 6 }}>Premium feature</div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>
                  Monthly statements include:
                  <ul style={{ margin: '6px 0 0 16px' }}>
                    <li>Total spend with currency breakdown</li>
                    <li>Who paid what and who owes who</li>
                    <li>Settlement amount</li>
                    <li>Category breakdown with chart</li>
                    <li>Full expense list</li>
                    <li>Downloadable PDF + CSV</li>
                    <li>Email summary to both parents</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Month navigator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', marginBottom: 20 }}>
              <button onClick={prevMonth} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <ChevronLeftIcon style={{ width: 18, height: 18, color: "#64748b" }}/>
              </button>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', minWidth: 180, textAlign: 'center' }}>
                {MONTH_NAMES[month - 1]} {year}
              </div>
              <button onClick={nextMonth} disabled={isCurrentMonth} style={{ padding: 6, background: 'none', border: 'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', display: 'flex', opacity: isCurrentMonth ? 0.3 : 1 }}>
                <ChevronRightIcon style={{ width: 18, height: 18, color: "#64748b" }}/>
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : !summary || exps.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
                <ArrowTrendingUpIcon style={{  margin: '0 auto 12px', display: 'block', width: 32, height: 32, color: "#cbd5e1" }}/>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#334155', marginBottom: 6 }}>No expenses in {MONTH_NAMES[month - 1]} {year}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Total spend',  value: `${cs}${Number(summary.total).toFixed(2)}`, color: '#2563eb' },
                    { label: 'Expenses',     value: String(exps.length), color: '#059669' },
                    { label: 'Categories',   value: String(cats.length), color: '#d97706' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Settlement banner */}
                {Math.abs(balance) > 0.01 && (
                  <div style={{ background: balance >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${balance >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: balance >= 0 ? '#059669' : '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                        {balance >= 0 ? `${coData?.display_name} owes ${meData?.display_name}` : `${meData?.display_name} owes ${coData?.display_name}`}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: balance >= 0 ? '#059669' : '#dc2626' }}>
                        {cs}{Math.abs(balance).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                      {meData && <div>{meData.display_name} paid {cs}{Number(meData.paid).toFixed(2)}</div>}
                      {coData && <div>{coData.display_name} paid {cs}{Number(coData.paid).toFixed(2)}</div>}
                    </div>
                  </div>
                )}

                {/* Who paid */}
                {members.length > 0 && (
                  <Card title="Who paid what">
                    {members.map(m => {
                      const net = m.paid - m.owed
                      return (
                        <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                            {m.display_name[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{m.display_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Paid {cs}{Number(m.paid).toFixed(2)} · Share {cs}{Number(m.owed).toFixed(2)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: net >= 0 ? '#059669' : '#dc2626' }}>
                              {net >= 0 ? '+' : ''}{cs}{net.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{net >= 0 ? 'to receive' : 'to pay'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </Card>
                )}

                {/* Category breakdown */}
                {cats.length > 0 && (
                  <Card title="Spending by category">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'center' }}>
                      <div>
                        {cats.map((c, i) => {
                          const pct = summary.total > 0 ? Number(c.total) / summary.total * 100 : 0
                          return (
                            <div key={c.name} style={{ marginBottom: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.name}</span>
                                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.count} expenses</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{cs}{Number(c.total).toFixed(2)}</span>
                                  <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 5 }}>{pct.toFixed(0)}%</span>
                                </div>
                              </div>
                              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: c.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={cats.map(c => ({ name: c.name, value: Number(c.total), color: c.color }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={PieLabel}>
                            {cats.map((c, i) => <Cell key={i} fill={c.color ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => `${cs}${Number(v).toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* Expense table */}
                <Card title={`All expenses (${exps.length})`}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Date','Description','Child','Category','Amount','Split','Paid by'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exps.map(e => (
                          <tr key={e.id}>
                            <td style={{ padding: '9px 10px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc', whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</td>
                            <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f8fafc' }}>{e.description}</td>
                            <td style={{ padding: '9px 10px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc' }}>{e.kid_name ?? '—'}</td>
                            <td style={{ padding: '9px 10px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc' }}>{e.category_name ?? '—'}</td>
                            <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f8fafc', whiteSpace: 'nowrap' }}>{sym(e.currency)}{Number(e.amount).toFixed(2)}</td>
                            <td style={{ padding: '9px 10px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc' }}>{e.split_pct}/{100 - e.split_pct}</td>
                            <td style={{ padding: '9px 10px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f8fafc' }}>{e.paid_by_name ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </Shell>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}
