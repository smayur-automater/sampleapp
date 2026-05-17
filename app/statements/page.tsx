'use client'
import React from 'react'
import {
  ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon,
  DocumentTextIcon, LockClosedIcon, UserGroupIcon,
  CalendarIcon, ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useMemo } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { useHousehold } from '@/lib/household'
import { CURRENCIES } from '@/components/CurrencySelect'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CHART_COLORS = ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2','#374151','#db2777','#0891b2','#4f46e5']
const sym = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol ?? '$'

type ViewMode = 'monthly' | 'yearly' | 'by_kid'
type ChartType = 'bar' | 'pie' | 'line'
type ChartMetric = 'category' | 'kid' | 'member' | 'month' | 'status'

interface MonthlySummary {
  year: number; month: number; total: number
  by_currency: { currency: string; total: number; count: number }[] | null
  by_member:   { user_id: string; display_name: string; color: string; paid: number; owed: number }[] | null
  by_category: { name: string; color: string; total: number; count: number }[] | null
  by_kid:      { kid_id: string; kid_name: string; color: string; total: number; count: number }[] | null
  expenses:    {
    id: string; description: string; amount: number; currency: string
    date: string; split_pct: number; settlement_status: string
    kid_name: string; category_name: string; paid_by_name: string; created_by_name: string
  }[] | null
}
interface YearlySummary {
  year: number; total: number
  by_month:    { month_num: number; count: number; total: number; settled: number }[] | null
  by_category: { name: string; color: string; count: number; total: number }[] | null
  by_kid:      { kid_name: string; color: string; count: number; total: number }[] | null
  by_member:   { user_id: string; display_name: string; color: string; paid: number }[] | null
  expenses:    { id: string; description: string; amount: number; currency: string; date: string; split_pct: number; settlement_status: string; kid_name: string; category_name: string; paid_by_name: string }[] | null
}
interface KidSummary {
  kid: { id: string; name: string; color: string; dob: string | null } | null
  total: number
  by_category: { name: string; color: string; count: number; total: number }[] | null
  by_month:    { yr: number; mo: number; count: number; total: number }[] | null
  expenses:    { id: string; description: string; amount: number; currency: string; date: string; split_pct: number; settlement_status: string; category_name: string; paid_by_name: string }[] | null
}
interface Kid { id: string; name: string; color: string }
interface Usage { plan: 'free'|'premium'; trial_days_left?: number; trial_expired?: boolean }

function PL({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null
  const R = Math.PI/180, r = innerRadius + (outerRadius-innerRadius)*0.5
  return <text x={cx+r*Math.cos(-midAngle*R)} y={cy+r*Math.sin(-midAngle*R)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>
}

const LBL: React.CSSProperties = { display:'block', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }
const CARD: React.CSSProperties = { background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, padding:'14px 16px', marginBottom:12 }

export default function StatementsPage() {
  const { ctx, loading: ctxLoading } = useHousehold()
  const [view,      setView]      = useState<ViewMode>('monthly')
  const [usage,     setUsage]     = useState<Usage|null>(null)
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState('')

  // Monthly
  const now = new Date()
  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth()+1)
  const [monthly, setMonthly] = useState<MonthlySummary|null>(null)

  // Yearly
  const [yrYear,  setYrYear]  = useState(now.getFullYear())
  const [yearly,  setYearly]  = useState<YearlySummary|null>(null)

  // By kid
  const [kids,    setKids]    = useState<Kid[]>([])
  const [kidId,   setKidId]   = useState<string>('')
  const [kidData, setKidData] = useState<KidSummary|null>(null)

  // Custom analytics builder
  const [custChart,  setCustChart]  = useState<ChartType>('bar')
  const [custMetric, setCustMetric] = useState<ChartMetric>('category')
  const [custPeriod, setCustPeriod] = useState<'month'|'year'|'all'>('month')

  const me = ctx?.members.find(m => m.user_id === ctx.myUserId)
  const co = ctx?.members.find(m => m.user_id !== ctx.myUserId)

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    if (!ctx) return
    supabase.rpc('get_my_usage').then(({data}) => { if(data) setUsage(data as Usage) })
    supabase.from('kids').select('id,name,color').eq('household_id', ctx.household_id).order('name')
      .then(({data}) => { if(data) { setKids(data); if(data.length>0) setKidId(data[0].id) } })
  }, [ctx])

  useEffect(() => {
    if (ctx && isPremium && view==='monthly') loadMonthly()
  }, [ctx, year, month, view]) // eslint-disable-line

  useEffect(() => {
    if (ctx && isPremium && view==='yearly') loadYearly()
  }, [ctx, yrYear, view]) // eslint-disable-line

  useEffect(() => {
    if (ctx && isPremium && view==='by_kid' && kidId) loadKid()
  }, [ctx, kidId, view]) // eslint-disable-line

  async function loadMonthly() {
    if (!ctx) return; setLoading(true)
    const { data } = await supabase.rpc('get_monthly_summary', { hh_id: ctx.household_id, yr: year, mo: month })
    setMonthly(data as MonthlySummary|null); setLoading(false)
  }
  async function loadYearly() {
    if (!ctx) return; setLoading(true)
    const { data } = await supabase.rpc('get_yearly_summary', { hh_id: ctx.household_id, yr: yrYear })
    setYearly(data as YearlySummary|null); setLoading(false)
  }
  async function loadKid() {
    if (!ctx||!kidId) return; setLoading(true)
    const { data } = await supabase.rpc('get_kid_summary', { hh_id: ctx.household_id, kid_id: kidId })
    setKidData(data as KidSummary|null); setLoading(false)
  }

  function prevMonth() { if(month===1){setYear(y=>y-1);setMonth(12)}else setMonth(m=>m-1) }
  function nextMonth() {
    const n=new Date(),ny=n.getFullYear(),nm=n.getMonth()+1
    if(year>ny||(year===ny&&month>=nm)) return
    if(month===12){setYear(y=>y+1);setMonth(1)}else setMonth(m=>m+1)
  }

  const isPremium = usage?.plan==='premium'
  const trialExpired = usage?.trial_expired ?? false

  // ── PDF Export ──────────────────────────────────────────────
  function buildPDF(title: string, html: string) {
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
  body{color:#111;background:#fff;padding:36px 48px;font-size:12px;line-height:1.6;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #e5e7eb;margin-bottom:20px;}
  .brand{font-size:18px;font-weight:800;}brand span{color:#0f766e;}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin:20px 0 8px;}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
  .kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;}
  .kpi-l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin-bottom:4px;}
  .kpi-v{font-size:18px;font-weight:700;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:1px solid #e5e7eb;}
  td{padding:7px 10px;font-size:11px;border-bottom:1px solid #f3f4f6;}
  .bal{border-left:3px solid;border-radius:4px;padding:12px 16px;margin-bottom:16px;}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;}
  @media print{body{padding:0;}}
</style></head><body>${html}
<div class="footer">CoParent Pay · ${new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})} · Confidential</div>
</body></html>`)
    w.document.close(); w.print()
    showToast('PDF ready — use Print → Save as PDF')
  }

  function exportMonthlyPDF() {
    if (!monthly) return
    const s = monthly; const exps = s.expenses??[]; const cats = s.by_category??[]; const members = s.by_member??[]
    const bal = members.length>=2 ? members[0].paid - members[0].owed : 0
    const cs = '$'
    buildPDF(`CoParent Statement — ${MONTH_NAMES[month-1]} ${year}`, `
<div class="hdr">
  <div><div class="brand">CoParent<span>Pay</span></div><div style="color:#6b7280;font-size:11px;margin-top:3px;">Monthly Statement · ${MONTH_NAMES[month-1]} ${year}</div></div>
  <div style="text-align:right;"><div style="font-size:15px;font-weight:700;">${me?.display_name??''} &amp; ${co?.display_name??''}</div></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-l">Total spend</div><div class="kpi-v">${cs}${Number(s.total).toFixed(2)}</div></div>
  <div class="kpi"><div class="kpi-l">Expenses</div><div class="kpi-v">${exps.length}</div></div>
  <div class="kpi"><div class="kpi-l">Categories</div><div class="kpi-v">${cats.length}</div></div>
  <div class="kpi"><div class="kpi-l">Settled</div><div class="kpi-v">${exps.filter(e=>e.settlement_status==='settled').length}</div></div>
</div>
${Math.abs(bal)>0.01?`<div class="bal" style="border-color:${bal>=0?'#059669':'#dc2626'};background:${bal>=0?'#f0fdf4':'#fef2f2'}">
  <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:${bal>=0?'#059669':'#dc2626'};margin-bottom:3px;">${bal>=0?`${co?.display_name} owes ${me?.display_name}`:`${me?.display_name} owes ${co?.display_name}`}</div>
  <div style="font-size:20px;font-weight:700;color:${bal>=0?'#059669':'#dc2626'};">${cs}${Math.abs(bal).toFixed(2)}</div>
</div>`:''}
<h2>Who paid what</h2>
<table><thead><tr><th>Parent</th><th>Paid</th><th>Share owed</th><th>Net</th></tr></thead><tbody>
${members.map(m=>`<tr><td><strong>${m.display_name}</strong></td><td>${cs}${Number(m.paid).toFixed(2)}</td><td>${cs}${Number(m.owed).toFixed(2)}</td><td style="font-weight:700;color:${m.paid-m.owed>=0?'#059669':'#dc2626'}">${cs}${Math.abs(m.paid-m.owed).toFixed(2)} ${m.paid-m.owed>=0?'to receive':'to pay'}</td></tr>`).join('')}
</tbody></table>
${cats.length?`<h2>By category</h2><table><thead><tr><th>Category</th><th>Count</th><th>Total</th><th>% of spend</th></tr></thead><tbody>
${cats.map(c=>`<tr><td>${c.name}</td><td>${c.count}</td><td>${cs}${Number(c.total).toFixed(2)}</td><td>${s.total>0?(Number(c.total)/s.total*100).toFixed(0):0}%</td></tr>`).join('')}</tbody></table>`:''}
<h2>All expenses</h2>
<table><thead><tr><th>Date</th><th>Description</th><th>Child</th><th>Category</th><th>Amount</th><th>Split</th><th>Paid by</th><th>Status</th></tr></thead><tbody>
${exps.map(e=>`<tr><td>${new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td><td>${e.description}</td><td>${e.kid_name}</td><td>${e.category_name}</td><td>${cs}${Number(e.amount).toFixed(2)}</td><td>${e.split_pct}/${100-e.split_pct}</td><td>${e.paid_by_name}</td><td>${e.settlement_status}</td></tr>`).join('')}
</tbody></table>`)
  }

  function exportYearlyPDF() {
    if (!yearly) return
    const s = yearly; const exps = s.expenses??[]; const months = s.by_month??[]
    const cs = '$'
    buildPDF(`CoParent Annual Statement — ${yrYear}`, `
<div class="hdr">
  <div><div class="brand">CoParentPay</div><div style="color:#6b7280;font-size:11px;margin-top:3px;">Annual Statement · ${yrYear}</div></div>
  <div style="text-align:right;"><div style="font-size:15px;font-weight:700;">${me?.display_name??''} &amp; ${co?.display_name??''}</div></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-l">Total spend</div><div class="kpi-v">${cs}${Number(s.total).toFixed(2)}</div></div>
  <div class="kpi"><div class="kpi-l">Expenses</div><div class="kpi-v">${exps.length}</div></div>
  <div class="kpi"><div class="kpi-l">Avg/month</div><div class="kpi-v">${cs}${months.length>0?(s.total/months.length).toFixed(0):'0'}</div></div>
  <div class="kpi"><div class="kpi-l">Settled</div><div class="kpi-v">${cs}${months.reduce((a,m)=>a+Number(m.settled??0),0).toFixed(2)}</div></div>
</div>
<h2>Monthly breakdown</h2>
<table><thead><tr><th>Month</th><th>Expenses</th><th>Total</th><th>Settled</th></tr></thead><tbody>
${months.map(m=>`<tr><td>${MONTH_NAMES[m.month_num-1]}</td><td>${m.count}</td><td>${cs}${Number(m.total).toFixed(2)}</td><td>${cs}${Number(m.settled??0).toFixed(2)}</td></tr>`).join('')}
</tbody></table>
${(s.by_category??[]).length?`<h2>By category</h2><table><thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead><tbody>
${(s.by_category??[]).map(c=>`<tr><td>${c.name}</td><td>${c.count}</td><td>${cs}${Number(c.total).toFixed(2)}</td></tr>`).join('')}</tbody></table>`:''}
<h2>All expenses</h2>
<table><thead><tr><th>Date</th><th>Description</th><th>Child</th><th>Category</th><th>Amount</th><th>Paid by</th><th>Status</th></tr></thead><tbody>
${exps.map(e=>`<tr><td>${new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td><td>${e.description}</td><td>${e.kid_name}</td><td>${e.category_name}</td><td>${cs}${Number(e.amount).toFixed(2)}</td><td>${e.paid_by_name}</td><td>${e.settlement_status}</td></tr>`).join('')}
</tbody></table>`)
  }

  function exportKidPDF() {
    if (!kidData) return
    const s = kidData; const exps = s.expenses??[]; const kid = s.kid
    buildPDF(`CoParent Statement — ${kid?.name??'Child'}`, `
<div class="hdr">
  <div><div class="brand">CoParentPay</div><div style="color:#6b7280;font-size:11px;margin-top:3px;">Statement by Child · ${kid?.name??''}</div></div>
  <div style="text-align:right;"><div style="font-size:15px;font-weight:700;">All time</div></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-l">Total spend</div><div class="kpi-v">$${Number(s.total).toFixed(2)}</div></div>
  <div class="kpi"><div class="kpi-l">Expenses</div><div class="kpi-v">${exps.length}</div></div>
</div>
${(s.by_category??[]).length?`<h2>By category</h2><table><thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead><tbody>
${(s.by_category??[]).map(c=>`<tr><td>${c.name}</td><td>${c.count}</td><td>$${Number(c.total).toFixed(2)}</td></tr>`).join('')}</tbody></table>`:''}
<h2>All expenses</h2>
<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Paid by</th><th>Status</th></tr></thead><tbody>
${exps.map(e=>`<tr><td>${new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td><td>${e.description}</td><td>${e.category_name}</td><td>$${Number(e.amount).toFixed(2)}</td><td>${e.paid_by_name}</td><td>${e.settlement_status}</td></tr>`).join('')}
</tbody></table>`)
  }

  function exportCSV(data: any[], filename: string) {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const rows = [keys, ...data.map(r => keys.map(k => String(r[k]??'')))]
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = filename; a.click()
  }

  // ── Custom analytics data ────────────────────────────────────
  const custData = useMemo(() => {
    const src = view==='monthly' ? monthly : view==='yearly' ? yearly : kidData
    if (!src) return []
    if (custMetric==='category') return (src.by_category??[]).map(c => ({ name:c.name, value:Number(c.total??0), color:c.color }))
    if (custMetric==='kid')      return ((src as any).by_kid??[]).map((k:any) => ({ name:k.kid_name??k.name, value:Number(k.total??0), color:k.color }))
    if (custMetric==='member')   return ((src as any).by_member??[]).map((m:any) => ({ name:m.display_name, value:Number(m.paid??m.total??0), color:m.color }))
    if (custMetric==='month' && view==='yearly') return ((src as YearlySummary).by_month??[]).map(m => ({ name:MONTH_SHORT[m.month_num-1], value:Number(m.total), color:'#2563eb' }))
    if (custMetric==='status' && view==='monthly') {
      const exps = (src as MonthlySummary).expenses??[]
      const m: Record<string,number> = {}
      exps.forEach(e => { m[e.settlement_status] = (m[e.settlement_status]||0) + Number(e.amount) })
      return Object.entries(m).map(([k,v],i) => ({ name:k.replace('_',' '), value:v, color:CHART_COLORS[i] }))
    }
    return []
  }, [monthly, yearly, kidData, custMetric, view])

  if (ctxLoading) return <Shell><div style={{display:'flex',justifyContent:'center',padding:60}}><div style={{width:28,height:28,border:'2px solid #e5e7eb',borderTopColor:'#111',borderRadius:'50%',animation:'spin .7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>

  return (
    <Shell>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{maxWidth:760,margin:'0 auto',padding:'20px 16px 48px',fontFamily:'system-ui,sans-serif'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,gap:12}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:700,color:'#111',margin:'0 0 3px'}}>Statements</h1>
            <p style={{fontSize:13,color:'#9ca3af',margin:0}}>Download and review your shared expense history</p>
          </div>
          {isPremium && (
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>{ if(view==='monthly') exportMonthlyPDF(); else if(view==='yearly') exportYearlyPDF(); else exportKidPDF() }}
                style={{display:'flex',alignItems:'center',gap:5,padding:'7px 11px',border:'1px solid #e5e7eb',borderRadius:3,background:'#fff',color:'#374151',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                <ArrowDownTrayIcon style={{width:13,height:13}}/> PDF
              </button>
              <button onClick={()=>{
                const exps = view==='monthly'?(monthly?.expenses??[]):view==='yearly'?(yearly?.expenses??[]):(kidData?.expenses??[])
                exportCSV(exps, `coparent-${view}-${year}.csv`)
              }}
                style={{display:'flex',alignItems:'center',gap:5,padding:'7px 11px',border:'1px solid #e5e7eb',borderRadius:3,background:'#fff',color:'#374151',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                <ArrowDownTrayIcon style={{width:13,height:13}}/> CSV
              </button>
            </div>
          )}
        </div>

        {/* View selector */}
        <div style={{display:'flex',background:'#f3f4f6',borderRadius:4,padding:2,gap:1,marginBottom:18,maxWidth:420}}>
          {([
            {v:'monthly' as ViewMode, icon:CalendarIcon,   label:'Monthly'},
            {v:'yearly'  as ViewMode, icon:ChartBarIcon,   label:'Yearly'},
            {v:'by_kid'  as ViewMode, icon:UserGroupIcon,  label:'By Child'},
          ]).map(({v,icon:Icon,label})=>(
            <button key={v} onClick={()=>setView(v)}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'7px 0',border:'none',borderRadius:3,background:view===v?'#fff':'transparent',color:view===v?'#111':'#9ca3af',fontSize:12,fontWeight:view===v?700:500,cursor:'pointer',boxShadow:view===v?'0 1px 2px rgba(0,0,0,0.06)':'none'}}>
              <Icon style={{width:13,height:13}}/> {label}
            </button>
          ))}
        </div>

        {!isPremium && !trialExpired ? (
          // Trial user — show preview with lock
          <div style={{...CARD, borderLeft:'3px solid #e5e7eb'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <LockClosedIcon style={{width:18,height:18,color:'#9ca3af',flexShrink:0,marginTop:2}}/>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#111',marginBottom:4}}>Statements require Premium</div>
                <p style={{fontSize:13,color:'#6b7280',lineHeight:1.7,margin:'0 0 12px'}}>Download monthly, yearly, and per-child statements as PDF or CSV. Build custom charts by category, child, or parent.</p>
                <a href="/plan" style={{display:'inline-block',padding:'8px 16px',background:'#111',color:'#fff',textDecoration:'none',borderRadius:3,fontSize:13,fontWeight:600}}>Upgrade to Premium</a>
              </div>
            </div>
          </div>
        ) : !isPremium ? (
          <div style={{...CARD, borderLeft:'3px solid #dc2626'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#dc2626',marginBottom:4}}>Trial expired</div>
            <p style={{fontSize:13,color:'#6b7280',margin:'0 0 12px'}}>Upgrade to Premium to access statements.</p>
            <a href="/plan" style={{display:'inline-block',padding:'8px 16px',background:'#111',color:'#fff',textDecoration:'none',borderRadius:3,fontSize:13,fontWeight:600}}>Upgrade to Premium</a>
          </div>
        ) : (<>

          {/* ── MONTHLY VIEW ── */}
          {view==='monthly' && (<>
            {/* Month nav */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <button onClick={prevMonth} style={{width:32,height:32,border:'1px solid #e5e7eb',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronLeftIcon style={{width:14,height:14}}/>
              </button>
              <div style={{flex:1,textAlign:'center',fontSize:15,fontWeight:700,color:'#111'}}>
                {MONTH_NAMES[month-1]} {year}
              </div>
              <button onClick={nextMonth} style={{width:32,height:32,border:'1px solid #e5e7eb',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronLeftIcon style={{width:14,height:14,transform:'rotate(180deg)'}}/>
              </button>
            </div>

            {loading ? <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>Loading…</div>
            : !monthly || !monthly.expenses?.length ? (
              <div style={{...CARD,textAlign:'center',padding:'40px 24px'}}>
                <DocumentTextIcon style={{width:32,height:32,color:'#d1d5db',margin:'0 auto 12px',display:'block'}}/>
                <p style={{fontSize:14,color:'#9ca3af',margin:0}}>No expenses recorded for {MONTH_NAMES[month-1]} {year}.</p>
              </div>
            ) : (<>
              {/* KPIs */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                {[
                  {l:'Total spend',  v:`$${Number(monthly.total).toFixed(2)}`},
                  {l:'Expenses',     v:String(monthly.expenses?.length??0)},
                  {l:'Categories',   v:String(monthly.by_category?.length??0)},
                ].map(k=>(
                  <div key={k.l} style={{...CARD,marginBottom:0}}>
                    <div style={LBL}>{k.l}</div>
                    <div style={{fontSize:18,fontWeight:700,color:'#111'}}>{k.v}</div>
                  </div>
                ))}
              </div>

              {/* Balance */}
              {(monthly.by_member??[]).length>=2 && (() => {
                const me2 = monthly.by_member!.find(m=>m.user_id===ctx?.myUserId)
                const co2 = monthly.by_member!.find(m=>m.user_id!==ctx?.myUserId)
                const bal = me2 ? me2.paid - me2.owed : 0
                return Math.abs(bal)>0.01 ? (
                  <div style={{...CARD,borderLeft:`3px solid ${bal>=0?'#059669':'#dc2626'}`,marginBottom:12}}>
                    <div style={LBL}>{bal>=0?`${co2?.display_name} owes ${me2?.display_name}`:`${me2?.display_name} owes ${co2?.display_name}`}</div>
                    <div style={{fontSize:24,fontWeight:700,color:bal>=0?'#059669':'#dc2626'}}>${Math.abs(bal).toFixed(2)}</div>
                  </div>
                ) : null
              })()}

              {/* Who paid */}
              <div style={CARD}>
                <div style={LBL}>Who paid what</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {(monthly.by_member??[]).map(m=>(
                    <div key={m.user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:10,height:10,borderRadius:'50%',background:m.color||'#374151'}}/>
                        <span style={{fontSize:13,fontWeight:600,color:'#111'}}>{m.display_name}</span>
                      </div>
                      <div style={{display:'flex',gap:16,fontSize:13}}>
                        <span style={{color:'#6b7280'}}>Paid: <strong style={{color:'#111'}}>${Number(m.paid).toFixed(2)}</strong></span>
                        <span style={{color:'#6b7280'}}>Owes: <strong style={{color:'#111'}}>${Number(m.owed).toFixed(2)}</strong></span>
                        <span style={{fontWeight:700,color:m.paid-m.owed>=0?'#059669':'#dc2626'}}>
                          {m.paid-m.owed>=0?'+':''}{(m.paid-m.owed).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By category */}
              {(monthly.by_category??[]).length>0 && (
                <div style={CARD}>
                  <div style={LBL}>By category</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      {(monthly.by_category??[]).map(c=>(
                        <div key={c.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f3f4f6'}}>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <div style={{width:8,height:8,borderRadius:'50%',background:c.color||'#374151'}}/>
                            <span style={{fontSize:12,color:'#374151'}}>{c.name}</span>
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:'#111'}}>${Number(c.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={(monthly.by_category??[]).map(c=>({name:c.name,value:Number(c.total),color:c.color}))} cx="50%" cy="50%" outerRadius={58} dataKey="value" labelLine={false} label={PL}>
                          {(monthly.by_category??[]).map((c,i)=><Cell key={i} fill={c.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* By kid */}
              {(monthly.by_kid??[]).length>0 && (
                <div style={CARD}>
                  <div style={LBL}>By child</div>
                  {(monthly.by_kid??[]).map(k=>(
                    <div key={k.kid_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f3f4f6'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:28,height:28,borderRadius:6,background:k.color||'#374151',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12}}>
                          {k.kid_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{k.kid_name}</div>
                          <div style={{fontSize:10,color:'#9ca3af'}}>{k.count} expenses</div>
                        </div>
                      </div>
                      <span style={{fontSize:14,fontWeight:700,color:'#111'}}>${Number(k.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expense table */}
              <div style={CARD}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={LBL}>All expenses</div>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid #e5e7eb'}}>
                        {['Date','Description','Child','Category','Amount','Paid by','Status'].map(h=>(
                          <th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(monthly.expenses??[]).map(e=>(
                        <tr key={e.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280',whiteSpace:'nowrap'}}>{new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#111',fontWeight:500}}>{e.description}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280'}}>{e.kid_name}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280'}}>{e.category_name}</td>
                          <td style={{padding:'7px 8px',fontSize:12,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>${Number(e.amount).toFixed(2)}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280',whiteSpace:'nowrap'}}>{e.paid_by_name}</td>
                          <td style={{padding:'7px 8px'}}>
                            <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:3,background:e.settlement_status==='settled'?'#f0fdf4':e.settlement_status==='pending_approval'?'#f5f3ff':'#fef2f2',color:e.settlement_status==='settled'?'#059669':e.settlement_status==='pending_approval'?'#7c3aed':'#dc2626',border:`1px solid ${e.settlement_status==='settled'?'#d1fae5':e.settlement_status==='pending_approval'?'#ddd6fe':'#fecaca'}`}}>
                              {e.settlement_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>)}
          </>)}

          {/* ── YEARLY VIEW ── */}
          {view==='yearly' && (<>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <button onClick={()=>setYrYear(y=>y-1)} style={{width:32,height:32,border:'1px solid #e5e7eb',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronLeftIcon style={{width:14,height:14}}/></button>
              <div style={{flex:1,textAlign:'center',fontSize:15,fontWeight:700,color:'#111'}}>{yrYear}</div>
              <button onClick={()=>{ if(yrYear<now.getFullYear()) setYrYear(y=>y+1) }} style={{width:32,height:32,border:'1px solid #e5e7eb',borderRadius:3,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronLeftIcon style={{width:14,height:14,transform:'rotate(180deg)'}}/></button>
            </div>

            {loading ? <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>Loading…</div>
            : !yearly || !yearly.expenses?.length ? (
              <div style={{...CARD,textAlign:'center',padding:'40px 24px'}}><p style={{fontSize:14,color:'#9ca3af',margin:0}}>No expenses for {yrYear}.</p></div>
            ) : (<>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                {[
                  {l:'Total spend',   v:`$${Number(yearly.total).toFixed(2)}`},
                  {l:'Expenses',      v:String(yearly.expenses?.length??0)},
                  {l:'Avg / month',   v:`$${((yearly.by_month??[]).length>0?yearly.total/(yearly.by_month??[]).length:0).toFixed(0)}`},
                ].map(k=>(
                  <div key={k.l} style={{...CARD,marginBottom:0}}>
                    <div style={LBL}>{k.l}</div>
                    <div style={{fontSize:18,fontWeight:700,color:'#111'}}>{k.v}</div>
                  </div>
                ))}
              </div>

              {/* Monthly bar */}
              {(yearly.by_month??[]).length>0 && (
                <div style={CARD}>
                  <div style={LBL}>Monthly spend — {yrYear}</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={(yearly.by_month??[]).map(m=>({month:MONTH_SHORT[m.month_num-1],total:Number(m.total),settled:Number(m.settled??0),outstanding:Number(m.total)-Number(m.settled??0)}))} margin={{top:0,right:4,bottom:0,left:-10}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                      <XAxis dataKey="month" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                      <Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/>
                      <Bar dataKey="settled"     name="Settled"     fill="#d1fae5" radius={[2,2,0,0]} stackId="a"/>
                      <Bar dataKey="outstanding" name="Outstanding" fill="#fca5a5" radius={[2,2,0,0]} stackId="a"/>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:6}}>
                    {[{c:'#d1fae5',l:'Settled'},{c:'#fca5a5',l:'Outstanding'}].map(x=>(
                      <div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#9ca3af'}}><div style={{width:9,height:9,borderRadius:2,background:x.c}}/>{x.l}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category + kid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                {(yearly.by_category??[]).length>0 && (
                  <div style={{...CARD,marginBottom:0}}>
                    <div style={LBL}>By category</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart><Pie data={(yearly.by_category??[]).map(c=>({name:c.name,value:Number(c.total),color:c.color}))} cx="50%" cy="50%" outerRadius={54} dataKey="value" labelLine={false} label={PL}>
                        {(yearly.by_category??[]).map((c,i)=><Cell key={i} fill={c.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie><Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/></PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {(yearly.by_kid??[]).length>0 && (
                  <div style={{...CARD,marginBottom:0}}>
                    <div style={LBL}>By child</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart><Pie data={(yearly.by_kid??[]).map(k=>({name:k.kid_name,value:Number(k.total),color:k.color}))} cx="50%" cy="50%" outerRadius={54} dataKey="value" labelLine={false} label={PL}>
                        {(yearly.by_kid??[]).map((k,i)=><Cell key={i} fill={k.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie><Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/></PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Expense table */}
              <div style={CARD}>
                <div style={LBL}>All expenses ({yearly.expenses?.length??0})</div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr style={{borderBottom:'1px solid #e5e7eb'}}>
                      {['Date','Description','Child','Category','Amount','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(yearly.expenses??[]).map(e=>(
                        <tr key={e.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280',whiteSpace:'nowrap'}}>{new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#111'}}>{e.description}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280'}}>{e.kid_name}</td>
                          <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280'}}>{e.category_name}</td>
                          <td style={{padding:'7px 8px',fontSize:12,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>${Number(e.amount).toFixed(2)}</td>
                          <td style={{padding:'7px 8px'}}><span style={{fontSize:10,fontWeight:600,color:e.settlement_status==='settled'?'#059669':'#dc2626'}}>{e.settlement_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>)}
          </>)}

          {/* ── BY CHILD VIEW ── */}
          {view==='by_kid' && (<>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {kids.map(k=>(
                <button key={k.id} onClick={()=>setKidId(k.id)}
                  style={{display:'flex',alignItems:'center',gap:7,padding:'7px 14px',border:kidId===k.id?`1.5px solid ${k.color||'#111'}`:'1px solid #e5e7eb',borderRadius:3,background:kidId===k.id?(k.color||'#111')+'12':'#fff',cursor:'pointer',fontSize:13,fontWeight:kidId===k.id?700:500,color:kidId===k.id?(k.color||'#111'):'#374151'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:k.color||'#374151'}}/>
                  {k.name}
                </button>
              ))}
            </div>

            {loading ? <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>Loading…</div>
            : !kidData || !kidData.expenses?.length ? (
              <div style={{...CARD,textAlign:'center',padding:'40px 24px'}}><p style={{fontSize:14,color:'#9ca3af',margin:0}}>No expenses for this child.</p></div>
            ) : (<>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:12}}>
                <div style={{...CARD,marginBottom:0}}>
                  <div style={LBL}>Total spend</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#111'}}>${Number(kidData.total).toFixed(2)}</div>
                </div>
                <div style={{...CARD,marginBottom:0}}>
                  <div style={LBL}>Expenses</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#111'}}>{kidData.expenses?.length??0}</div>
                </div>
              </div>

              {/* Category breakdown */}
              {(kidData.by_category??[]).length>0 && (
                <div style={CARD}>
                  <div style={LBL}>By category</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      {(kidData.by_category??[]).map(c=>(
                        <div key={c.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f3f4f6'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:8,height:8,borderRadius:'50%',background:c.color||'#374151'}}/>
                            <span style={{fontSize:12,color:'#374151'}}>{c.name}</span>
                          </div>
                          <span style={{fontSize:12,fontWeight:600,color:'#111'}}>${Number(c.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart><Pie data={(kidData.by_category??[]).map(c=>({name:c.name,value:Number(c.total),color:c.color}))} cx="50%" cy="50%" outerRadius={54} dataKey="value" labelLine={false} label={PL}>
                        {(kidData.by_category??[]).map((c,i)=><Cell key={i} fill={c.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie><Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/></PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Monthly trend */}
              {(kidData.by_month??[]).length>1 && (
                <div style={CARD}>
                  <div style={LBL}>Monthly trend</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={(kidData.by_month??[]).map(m=>({name:`${MONTH_SHORT[m.mo-1]} ${m.yr}`,total:Number(m.total)}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                      <Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/>
                      <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{r:3,fill:'#2563eb'}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Expense table */}
              <div style={CARD}>
                <div style={LBL}>All expenses</div>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{borderBottom:'1px solid #e5e7eb'}}>
                    {['Date','Description','Category','Amount','Paid by','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(kidData.expenses??[]).map(e=>(
                      <tr key={e.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                        <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280',whiteSpace:'nowrap'}}>{new Date(e.date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</td>
                        <td style={{padding:'7px 8px',fontSize:12,color:'#111'}}>{e.description}</td>
                        <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280'}}>{e.category_name}</td>
                        <td style={{padding:'7px 8px',fontSize:12,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>${Number(e.amount).toFixed(2)}</td>
                        <td style={{padding:'7px 8px',fontSize:12,color:'#6b7280',whiteSpace:'nowrap'}}>{e.paid_by_name}</td>
                        <td style={{padding:'7px 8px'}}><span style={{fontSize:10,fontWeight:600,color:e.settlement_status==='settled'?'#059669':'#dc2626'}}>{e.settlement_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>)}
          </>)}

          {/* ── CUSTOM ANALYTICS BUILDER ── */}
          <div style={{...CARD, borderTop:'2px solid #f3f4f6', marginTop:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:2}}>Custom Chart Builder</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>Build your own chart from any data dimension</div>
              </div>
            </div>
            {/* Controls */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
              <div>
                <label style={LBL}>Chart type</label>
                <select value={custChart} onChange={e=>setCustChart(e.target.value as ChartType)}
                  style={{width:'100%',padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:3,fontSize:13,color:'#111',background:'#fff',outline:'none'}}>
                  <option value="bar">Bar chart</option>
                  <option value="pie">Pie chart</option>
                  <option value="line">Line chart</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Data dimension</label>
                <select value={custMetric} onChange={e=>setCustMetric(e.target.value as ChartMetric)}
                  style={{width:'100%',padding:'8px 10px',border:'1px solid #e5e7eb',borderRadius:3,fontSize:13,color:'#111',background:'#fff',outline:'none'}}>
                  <option value="category">By category</option>
                  <option value="kid">By child</option>
                  <option value="member">By parent</option>
                  {view==='yearly' && <option value="month">By month</option>}
                  {view==='monthly' && <option value="status">By status</option>}
                </select>
              </div>
              <div style={{display:'flex',alignItems:'flex-end'}}>
                <button onClick={()=>{
                  if(view==='monthly'&&!monthly) loadMonthly()
                  else if(view==='yearly'&&!yearly) loadYearly()
                  else if(view==='by_kid'&&!kidData) loadKid()
                }}
                  style={{width:'100%',padding:'8px',background:'#111',color:'#fff',border:'none',borderRadius:3,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  Refresh data
                </button>
              </div>
            </div>

            {/* Chart */}
            {custData.length === 0 ? (
              <div style={{textAlign:'center',padding:'32px 0',color:'#9ca3af',fontSize:13}}>
                No data available for this view. Load a statement above first.
              </div>
            ) : (
              <div>
                {custChart==='bar' && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={custData} margin={{top:0,right:4,bottom:0,left:-10}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                      <Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/>
                      <Bar dataKey="value" name="Amount" radius={[3,3,0,0]}>
                        {custData.map((d,i)=><Cell key={i} fill={d.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {custChart==='pie' && (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={custData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={PL}>
                        {custData.map((d,i)=><Cell key={i} fill={d.color||CHART_COLORS[i%CHART_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {custChart==='line' && (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={custData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                      <Tooltip formatter={(v:any)=>`$${Number(v).toFixed(2)}`}/>
                      <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                )}
                {/* Legend */}
                <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:10,justifyContent:'center'}}>
                  {custData.map((d,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#6b7280'}}>
                      <div style={{width:9,height:9,borderRadius:2,background:d.color||CHART_COLORS[i%CHART_COLORS.length]}}/>
                      {d.name}: ${d.value.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </>)}

      </div>

      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:500,background:'#111',color:'#fff',padding:'10px 18px',borderRadius:3,fontSize:13,fontWeight:500,boxShadow:'0 2px 8px rgba(0,0,0,0.15)',whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}
    </Shell>
  )
}
