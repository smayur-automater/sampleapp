'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Users, Home, Baby, DollarSign, TrendingUp, Trash2,
  UserMinus, Search, X, ChevronRight, ChevronDown,
  RefreshCw, AlertTriangle, Shield, LogOut, ArrowUpRight,
  ArrowDownRight, Activity, Clock, Mail, Calendar
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface Stats {
  total_users: number; total_households: number; total_kids: number
  total_expenses: number; total_spend: number; linked_households: number
  pending_invites: number; new_users_7d: number; new_expenses_7d: number
  expenses_by_day: { day: string; count: number; amount: number }[]
}
interface Household {
  id: string; name: string; created_at: string; member_count: number
  kid_count: number; expense_count: number; total_spend: number
  last_expense_at: string | null
  members: { user_id: string; display_name: string; color: string; role: string; joined_at: string }[]
}
interface User {
  id: string; email: string; created_at: string; last_sign_in_at: string | null
  email_confirmed_at: string | null; display_name: string | null
  color: string | null; role: string | null; household_id: string | null
  household_name: string | null; expense_count: number; total_spend: number
}
interface HouseholdDetail {
  household: { id: string; name: string; created_at: string }
  members: { user_id: string; display_name: string; color: string; role: string; joined_at: string; email: string }[]
  kids: { id: string; name: string; dob: string | null; color: string }[] | null
  expenses: { id: string; description: string; amount: number; currency: string; date: string; kid_name: string; category_name: string; creator_email: string }[] | null
  invites: { id: string; invited_email: string; accepted: boolean; expires_at: string }[] | null
}

// ── Styles ─────────────────────────────────────────────────────────
const S = {
  page:   { minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e2e8f0' } as React.CSSProperties,
  sidebar:{ position: 'fixed' as const, top: 0, left: 0, bottom: 0, width: 220, background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' as const, zIndex: 100 },
  main:   { marginLeft: 220, minHeight: '100vh', padding: '28px 32px' },
  card:   { background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 20 } as React.CSSProperties,
  inp:    { width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 9, fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' as const },
  btn:    { padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  danger: { padding: '6px 12px', background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  badge:  (color: string) => ({ padding: '2px 8px', borderRadius: 99, background: color + '22', color, fontSize: 11, fontWeight: 600, display: 'inline-block' as const }),
  th:     { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' as const, textAlign: 'left' as const, borderBottom: '1px solid #334155' },
  td:     { padding: '11px 14px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' as const },
}

type View = 'dashboard' | 'households' | 'users' | 'activity'

export default function AdminPage() {
  const router = useRouter()
  const [authed,   setAuthed]   = useState<boolean | null>(null)
  const [view,     setView]     = useState<View>('dashboard')
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [households, setHouseholds] = useState<Household[]>([])
  const [users,    setUsers]    = useState<User[]>([])
  const [loading,  setLoading]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [detail,   setDetail]   = useState<HouseholdDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirm,  setConfirm]  = useState<{ msg: string; action: () => void } | null>(null)
  const [toast,    setToast]    = useState('')

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      const { data } = await supabase.rpc('is_admin')
      if (!data) { router.replace('/dashboard'); return }
      setAuthed(true)
    })
  }, [router])

  useEffect(() => {
    if (authed) loadView()
  }, [authed, view])

  async function loadView() {
    setLoading(true)
    if (view === 'dashboard') {
      const { data } = await supabase.rpc('admin_get_stats')
      setStats(data)
    } else if (view === 'households') {
      const { data } = await supabase.rpc('admin_get_households')
      setHouseholds(data ?? [])
    } else if (view === 'users') {
      const { data } = await supabase.rpc('admin_get_users')
      setUsers(data ?? [])
    }
    setLoading(false)
  }

  async function loadDetail(hhId: string) {
    setDetailLoading(true)
    const { data } = await supabase.rpc('admin_get_household_detail', { hh_id: hhId })
    setDetail(data)
    setDetailLoading(false)
  }

  function ask(msg: string, action: () => void) { setConfirm({ msg, action }) }

  async function deleteHousehold(id: string, name: string) {
    ask(`Permanently delete household "${name}" and ALL its data (kids, expenses, categories)?`, async () => {
      await supabase.rpc('admin_delete_household', { hh_id: id })
      setDetail(null); loadView(); showToast('Household deleted')
    })
  }

  async function removeMember(hhId: string, uid: string, name: string) {
    ask(`Remove ${name} from this household?`, async () => {
      await supabase.rpc('admin_remove_member', { hh_id: hhId, uid })
      loadDetail(hhId); loadView(); showToast('Member removed')
    })
  }

  async function deleteKid(kidId: string, name: string, hhId: string) {
    ask(`Delete child "${name}"? Their expenses will also be removed.`, async () => {
      await supabase.rpc('admin_delete_kid', { kid_id: kidId })
      loadDetail(hhId); showToast('Child deleted')
    })
  }

  async function deleteExpense(expId: string, desc: string, hhId: string) {
    ask(`Delete expense "${desc}"?`, async () => {
      await supabase.rpc('admin_delete_expense', { expense_id: expId })
      loadDetail(hhId); showToast('Expense deleted')
    })
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function fmt(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }
  function fmtDate(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) }
  function fmtDateTime(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

  const filteredHouseholds = useMemo(() => {
    if (!search.trim()) return households
    const q = search.toLowerCase()
    return households.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.members?.some(m => m.display_name?.toLowerCase().includes(q))
    )
  }, [households, search])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.household_name?.toLowerCase().includes(q)
    )
  }, [users, search])

  if (authed === null) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const navItems: { id: View; label: string; Icon: React.ElementType }[] = [
    { id: 'dashboard',  label: 'Dashboard',  Icon: Activity },
    { id: 'households', label: 'Households', Icon: Home },
    { id: 'users',      label: 'Users',      Icon: Users },
  ]

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, background: '#2563eb', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>CoParent</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Admin Panel</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => { setView(id); setSearch(''); setDetail(null) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 'none', borderRadius: 9, background: view === id ? '#2563eb22' : 'transparent', color: view === id ? '#60a5fa' : '#94a3b8', fontSize: 13, fontWeight: view === id ? 600 : 400, cursor: 'pointer', marginBottom: 2 }}>
              <Icon size={16} strokeWidth={view === id ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid #334155' }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none', borderRadius: 9, background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            <ArrowUpRight size={14} /> Back to App
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none', borderRadius: 9, background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>

        {/* ── DASHBOARD ───────────────────────────────────── */}
        {view === 'dashboard' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.4px' }}>Dashboard</h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Platform overview</p>
            </div>

            {loading || !stats ? (
              <Spinner />
            ) : (
              <>
                {/* KPI grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { label: 'Total users',       value: stats.total_users,       sub: `+${stats.new_users_7d} this week`,    Icon: Users,      color: '#60a5fa' },
                    { label: 'Households',         value: stats.total_households,  sub: `${stats.linked_households} linked`,   Icon: Home,       color: '#34d399' },
                    { label: 'Total expenses',     value: stats.total_expenses,    sub: `+${stats.new_expenses_7d} this week`, Icon: DollarSign, color: '#a78bfa' },
                    { label: 'Total spend',        value: fmt(stats.total_spend),  sub: `${stats.total_kids} children tracked`,Icon: TrendingUp,  color: '#fb923c' },
                  ].map(({ label, value, sub, Icon, color }) => (
                    <div key={label} style={{ ...S.card }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</span>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={15} color={color} strokeWidth={2} />
                        </div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>{value}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Second row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                  <div style={S.card}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Household status</div>
                    {[
                      { label: 'Linked (2 parents)', value: stats.linked_households, color: '#34d399' },
                      { label: 'Solo (1 parent)',     value: stats.total_households - stats.linked_households, color: '#fb923c' },
                      { label: 'Pending invites',     value: stats.pending_invites,   color: '#a78bfa' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                          <span style={{ fontSize: 13, color: '#cbd5e1' }}>{row.label}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={S.card}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>This week</div>
                    {[
                      { label: 'New users',    value: stats.new_users_7d,    Icon: Users,      color: '#60a5fa' },
                      { label: 'New expenses', value: stats.new_expenses_7d, Icon: DollarSign, color: '#34d399' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #334155' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: row.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <row.Icon size={15} color={row.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{row.value}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{row.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={S.card}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Platform totals</div>
                    {[
                      { label: 'Children tracked', value: stats.total_kids },
                      { label: 'Avg expenses / household', value: stats.total_households > 0 ? (stats.total_expenses / stats.total_households).toFixed(1) : '0' },
                      { label: 'Avg spend / household', value: stats.total_households > 0 ? fmt(stats.total_spend / stats.total_households) : '$0' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #334155' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{row.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity chart */}
                {stats.expenses_by_day && stats.expenses_by_day.length > 0 && (
                  <div style={S.card}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 18 }}>Expenses — last 30 days</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                      {(() => {
                        const max = Math.max(...stats.expenses_by_day.map(d => d.count), 1)
                        return stats.expenses_by_day.map(d => (
                          <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${fmtDate(d.day)}: ${d.count} expenses`}>
                            <div style={{ width: '100%', height: `${Math.max((d.count / max) * 70, 3)}px`, background: '#2563eb', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                          </div>
                        ))
                      })()}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: '#475569' }}>{fmtDate(stats.expenses_by_day[0]?.day)}</span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{fmtDate(stats.expenses_by_day[stats.expenses_by_day.length - 1]?.day)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── HOUSEHOLDS ──────────────────────────────────── */}
        {view === 'households' && !detail && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Households</h1>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{filteredHouseholds.length} of {households.length}</p>
              </div>
              <button onClick={loadView} style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={14} color="#475569" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by household or parent name…" style={{ ...S.inp, paddingLeft: 34 }} />
            </div>

            {loading ? <Spinner /> : (
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      <th style={S.th}>Household</th>
                      <th style={S.th}>Parents</th>
                      <th style={S.th}>Kids</th>
                      <th style={S.th}>Expenses</th>
                      <th style={S.th}>Total spend</th>
                      <th style={S.th}>Last activity</th>
                      <th style={S.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouseholds.map(hh => (
                      <tr key={hh.id} style={{ cursor: 'pointer' }} onClick={() => loadDetail(hh.id)}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{hh.name}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{fmtDate(hh.created_at)}</div>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(hh.members ?? []).map(m => (
                              <div key={m.user_id} style={{ width: 26, height: 26, borderRadius: 8, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }} title={m.display_name}>
                                {m.display_name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{hh.member_count === 2 ? '2 parents' : hh.member_count === 1 ? 'Solo' : `${hh.member_count} members`}</div>
                        </td>
                        <td style={S.td}><span style={S.badge('#a78bfa')}>{hh.kid_count}</span></td>
                        <td style={S.td}><span style={S.badge('#34d399')}>{hh.expense_count}</span></td>
                        <td style={{ ...S.td, fontWeight: 600, color: '#f1f5f9' }}>{fmt(hh.total_spend)}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{hh.last_expense_at ? fmtDate(hh.last_expense_at) : <span style={{ color: '#475569' }}>No expenses</span>}</td>
                        <td style={S.td} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => loadDetail(hh.id)} style={{ padding: '5px 10px', background: '#1e40af22', border: '1px solid #1e40af55', borderRadius: 7, color: '#60a5fa', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                              View
                            </button>
                            <button onClick={() => deleteHousehold(hh.id, hh.name)} style={S.danger}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredHouseholds.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No households found</div>}
              </div>
            )}
          </>
        )}

        {/* ── HOUSEHOLD DETAIL ────────────────────────────── */}
        {view === 'households' && detail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setDetail(null)} style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                ← Back
              </button>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{detail.household.name}</h1>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Created {fmtDate(detail.household.created_at)} · ID: {detail.household.id.slice(0, 8)}…</p>
              </div>
              <button onClick={() => deleteHousehold(detail.household.id, detail.household.name)} style={{ ...S.danger, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={12} /> Delete household
              </button>
            </div>

            {detailLoading ? <Spinner /> : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Members */}
                <div style={S.card}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Parents / Members</div>
                  {(detail.members ?? []).map(m => (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #334155' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {m.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{m.display_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Joined {fmtDate(m.joined_at)} · {m.role}</div>
                      </div>
                      <button onClick={() => removeMember(detail.household.id, m.user_id, m.display_name)} style={S.danger}>
                        <UserMinus size={11} />
                      </button>
                    </div>
                  ))}
                  {(!detail.members || detail.members.length === 0) && <p style={{ color: '#475569', fontSize: 13 }}>No members</p>}
                </div>

                {/* Kids */}
                <div style={S.card}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Children ({detail.kids?.length ?? 0})</div>
                  {(detail.kids ?? []).map(k => (
                    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #334155' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                        {k.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{k.name}</div>
                        {k.dob && <div style={{ fontSize: 11, color: '#64748b' }}>DOB: {fmtDate(k.dob)}</div>}
                      </div>
                      <button onClick={() => deleteKid(k.id, k.name, detail.household.id)} style={S.danger}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {(!detail.kids || detail.kids.length === 0) && <p style={{ color: '#475569', fontSize: 13 }}>No children added</p>}
                </div>

                {/* Invites */}
                {detail.invites && detail.invites.length > 0 && (
                  <div style={S.card}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>Invites ({detail.invites.length})</div>
                    {detail.invites.map(inv => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #334155' }}>
                        <Mail size={14} color={inv.accepted ? '#34d399' : '#fb923c'} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: '#cbd5e1' }}>{inv.invited_email}</div>
                          <div style={{ fontSize: 11, color: '#475569' }}>Expires {fmtDate(inv.expires_at)}</div>
                        </div>
                        <span style={S.badge(inv.accepted ? '#34d399' : '#fb923c')}>{inv.accepted ? 'Accepted' : 'Pending'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expenses */}
                <div style={{ ...S.card, gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
                    Recent expenses ({detail.expenses?.length ?? 0})
                  </div>
                  {detail.expenses && detail.expenses.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={S.th}>Description</th>
                            <th style={S.th}>Child</th>
                            <th style={S.th}>Category</th>
                            <th style={S.th}>Amount</th>
                            <th style={S.th}>Date</th>
                            <th style={S.th}>Added by</th>
                            <th style={S.th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.expenses.map(e => (
                            <tr key={e.id}>
                              <td style={S.td}><span style={{ fontWeight: 500, color: '#f1f5f9' }}>{e.description}</span></td>
                              <td style={S.td}>{e.kid_name}</td>
                              <td style={S.td}>{e.category_name}</td>
                              <td style={{ ...S.td, fontWeight: 600, color: '#34d399' }}>{e.currency} {Number(e.amount).toFixed(2)}</td>
                              <td style={{ ...S.td, fontSize: 12 }}>{fmtDate(e.date)}</td>
                              <td style={{ ...S.td, fontSize: 11, color: '#64748b' }}>{e.creator_email}</td>
                              <td style={S.td}>
                                <button onClick={() => deleteExpense(e.id, e.description, detail.household.id)} style={S.danger}>
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p style={{ color: '#475569', fontSize: 13 }}>No expenses</p>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── USERS ───────────────────────────────────────── */}
        {view === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Users</h1>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{filteredUsers.length} of {users.length} total</p>
              </div>
              <button onClick={loadView} style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={14} color="#475569" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, name, or household…" style={{ ...S.inp, paddingLeft: 34 }} />
            </div>

            {loading ? <Spinner /> : (
              <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      <th style={S.th}>User</th>
                      <th style={S.th}>Household</th>
                      <th style={S.th}>Role</th>
                      <th style={S.th}>Expenses</th>
                      <th style={S.th}>Total spent</th>
                      <th style={S.th}>Joined</th>
                      <th style={S.th}>Last seen</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ cursor: u.household_id ? 'pointer' : 'default' }}
                        onClick={() => { if (u.household_id) { setView('households'); loadDetail(u.household_id) } }}>
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 9, background: u.color ?? '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                              {(u.display_name ?? u.email)?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{u.display_name ?? '—'}</div>
                              <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}>
                          {u.household_name ? (
                            <span style={{ fontSize: 13, color: '#cbd5e1' }}>{u.household_name}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>No household</span>
                          )}
                        </td>
                        <td style={S.td}>
                          {u.role ? <span style={S.badge(u.role === 'parent' ? '#60a5fa' : '#fb923c')}>{u.role}</span> : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={S.td}><span style={S.badge('#a78bfa')}>{u.expense_count}</span></td>
                        <td style={{ ...S.td, fontWeight: 600, color: '#f1f5f9' }}>{fmt(u.total_spend)}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{fmtDateTime(u.last_sign_in_at)}</td>
                        <td style={S.td}>
                          <span style={S.badge(u.email_confirmed_at ? '#34d399' : '#fb923c')}>
                            {u.email_confirmed_at ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No users found</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* CONFIRM DIALOG */}
      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{confirm.msg}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirm(null)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#cbd5e1', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => { confirm.action(); setConfirm(null) }}
                style={{ padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 600, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '11px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} /> {toast}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
