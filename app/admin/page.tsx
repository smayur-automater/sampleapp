'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  plan: string | null; plan_assigned_at: string | null
}
interface HouseholdDetail {
  household: { id: string; name: string; created_at: string }
  members: { user_id: string; display_name: string; color: string; role: string; joined_at: string; email: string }[]
  kids: { id: string; name: string; dob: string | null; color: string }[] | null
  expenses: { id: string; description: string; amount: number; currency: string; date: string; kid_name: string; category_name: string; creator_email: string }[] | null
  invites: { id: string; invited_email: string; accepted: boolean; expires_at: string }[] | null
}

type View = 'dashboard' | 'users' | 'households' | 'plans'

// ── Styles ─────────────────────────────────────────────────────────
const S = {
  page:    { minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui,-apple-system,sans-serif', color: '#e2e8f0', display: 'flex' } as React.CSSProperties,
  sidebar: { position: 'fixed' as const, top: 0, left: 0, bottom: 0, width: 224, background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' as const, zIndex: 100 },
  main:    { marginLeft: 224, flex: 1, padding: '28px 32px', minHeight: '100vh' } as React.CSSProperties,
  card:    { background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 20 } as React.CSSProperties,
  inp:     { width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 9, fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' as const },
  th:      { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase' as const, textAlign: 'left' as const, borderBottom: '1px solid #334155' },
  td:      { padding: '11px 14px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' as const },
  badge:   (color: string) => ({ padding: '2px 8px', borderRadius: 99, background: color + '22', color, fontSize: 11, fontWeight: 600, display: 'inline-block' as const }),
}

const fmt  = (n: number, d = 0) => `$${n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
const fmtN = (n: number)       => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtAgo  = (d: string | null) => {
  if (!d) return 'never'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30)  return `${days}d ago`
  return fmtDate(d)
}

export default function AdminPage() {
  const router = useRouter()
  const [authed,        setAuthed]        = useState<boolean | null>(null)
  const [adminEmail,    setAdminEmail]    = useState('')
  const [view,          setView]          = useState<View>('dashboard')
  const [stats,         setStats]         = useState<Stats | null>(null)
  const [households,    setHouseholds]    = useState<Household[]>([])
  const [users,         setUsers]         = useState<User[]>([])
  const [loading,       setLoading]       = useState(false)
  const [search,        setSearch]        = useState('')
  const [planFilter,    setPlanFilter]    = useState<'all'|'free'|'premium'>('all')
  const [detail,        setDetail]        = useState<HouseholdDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirm,       setConfirm]       = useState<{ msg: string; action: () => void } | null>(null)
  const [toast,         setToast]         = useState('')
  const [expandedUser,  setExpandedUser]  = useState<string | null>(null)

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/admin-login'); return }
      const { data } = await supabase.rpc('is_admin')
      if (!data) { router.replace('/admin-login'); return }
      setAdminEmail(user.email ?? '')
      setAuthed(true)
    })
  }, [router])

  useEffect(() => { if (authed) loadView() }, [authed, view]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadView() {
    setLoading(true)
    try {
      if (view === 'dashboard' || view === 'plans') {
        const [statsRes, usersRes] = await Promise.all([
          supabase.rpc('admin_get_stats'),
          supabase.rpc('admin_get_users'),
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data ?? [])
      } else if (view === 'households') {
        const { data } = await supabase.rpc('admin_get_households')
        setHouseholds(data ?? [])
      } else if (view === 'users') {
        const { data } = await supabase.rpc('admin_get_users')
        setUsers(data ?? [])
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function loadDetail(hhId: string) {
    setDetailLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_get_household_detail', { hh_id: hhId })
      if (error) { console.error('loadDetail error:', error); setDetailLoading(false); return }
      // Ensure all arrays exist to prevent .map() crashes
      if (data) {
        data.members  = data.members  ?? []
        data.kids     = data.kids     ?? []
        data.expenses = data.expenses ?? []
        data.invites  = data.invites  ?? []
      }
      setDetail(data)
    } catch(e) { console.error('loadDetail exception:', e) }
    setDetailLoading(false)
  }

  function ask(msg: string, action: () => void) { setConfirm({ msg, action }) }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function setPlan(uid: string, plan: 'free' | 'premium', name: string) {
    ask(`Set ${name} to ${plan.toUpperCase()} plan?`, async () => {
      const { error } = await supabase.rpc('admin_set_plan', { uid, new_plan: plan })
      if (error) { showToast('Error: ' + error.message); return }
      loadView(); showToast(`${name} → ${plan} plan ✓`)
    })
  }

  async function deleteUser(uid: string, email: string) {
    ask(`Permanently delete user "${email}" and all their data? This cannot be undone.`, async () => {
      const { error } = await supabase.rpc('admin_delete_user', { uid })
      if (error) { showToast('Error: ' + error.message); return }
      loadView(); showToast('User deleted')
    })
  }

  async function deleteHousehold(id: string, name: string) {
    ask(`Delete household "${name}" and ALL its data (kids, expenses, categories)?`, async () => {
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

  async function deleteExpense(expId: string, desc: string, hhId: string) {
    ask(`Delete expense "${desc}"?`, async () => {
      await supabase.rpc('admin_delete_expense', { expense_id: expId })
      loadDetail(hhId); showToast('Expense deleted')
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/admin-login')
  }

  // ── Filtered data ─────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = users
    if (planFilter !== 'all') list = list.filter(u => (u.plan ?? 'free') === planFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.household_name ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [users, search, planFilter])

  const filteredHouseholds = useMemo(() => {
    if (!search.trim()) return households
    const q = search.toLowerCase()
    return households.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.members.some(m => m.display_name.toLowerCase().includes(q))
    )
  }, [households, search])

  const premiumCount = users.filter(u => u.plan === 'premium').length
  const freeCount    = users.filter(u => (u.plan ?? 'free') === 'free').length

  if (authed === null) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const NAV: { id: View; icon: string; label: string }[] = [
    { id: 'dashboard',  icon: '▦',  label: 'Dashboard'   },
    { id: 'users',      icon: '👤', label: 'Users'        },
    { id: 'households', icon: '🏠', label: 'Households'   },
    { id: 'plans',      icon: '⭐', label: 'Plan Manager' },
  ]

  return (
    <div style={S.page}>

      {/* ── SIDEBAR ── */}
      <div style={S.sidebar}>
        {/* Brand */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>
            CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Admin Console</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); setSearch(''); setDetail(null) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 2, border: 'none', borderRadius: 9, background: view === n.id ? '#2563eb22' : 'transparent', color: view === n.id ? '#60a5fa' : '#94a3b8', fontSize: 13, fontWeight: view === n.id ? 700 : 400, cursor: 'pointer', textAlign: 'left' as const }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Admin info + sign out */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>Signed in as</div>
          <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 10 }}>{adminEmail}</div>
          <button onClick={signOut}
            style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#64748b', cursor: 'pointer', textAlign: 'center' as const }}>
            Sign out
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={S.main}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
              {view === 'dashboard' ? 'Dashboard' : view === 'users' ? 'Users' : view === 'households' ? 'Households' : 'Plan Manager'}
            </h1>
            <p style={{ fontSize: 13, color: '#475569', margin: '3px 0 0' }}>
              {view === 'plans' ? `${premiumCount} premium · ${freeCount} free` : 'CoParent Pay admin console'}
            </p>
          </div>
          <button onClick={loadView}
            style={{ padding: '8px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 9, fontSize: 13, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            ↻ Refresh
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 13, marginBottom: 20 }}>
            <div style={{ width: 16, height: 16, border: '2px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading…
          </div>
        )}

        {/* ════ DASHBOARD ════ */}
        {view === 'dashboard' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {[
                { label: 'Total users',      value: fmtN(stats.total_users),      sub: `+${stats.new_users_7d} this week`,  color: '#60a5fa' },
                { label: 'Households',       value: fmtN(stats.total_households), sub: `${stats.linked_households} linked`, color: '#34d399' },
                { label: 'Total expenses',   value: fmtN(stats.total_expenses),   sub: `+${stats.new_expenses_7d} this week`, color: '#a78bfa' },
                { label: 'Total spend',      value: fmt(stats.total_spend),       sub: 'across all households', color: '#fb923c' },
              ].map(k => (
                <div key={k.label} style={{ ...S.card }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: k.color, letterSpacing: '-0.5px' }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Plan breakdown + recent activity row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Plan breakdown */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Plan breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Free plan',    count: freeCount,    color: '#64748b', pct: users.length ? Math.round(freeCount/users.length*100) : 0 },
                    { label: 'Premium plan', count: premiumCount, color: '#f59e0b', pct: users.length ? Math.round(premiumCount/users.length*100) : 0 },
                  ].map(p => (
                    <div key={p.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        <span>{p.label}</span>
                        <span style={{ color: p.color, fontWeight: 700 }}>{p.count} users ({p.pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f172a', borderRadius: 10 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{premiumCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Premium</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#0f172a', borderRadius: 10 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#64748b' }}>{freeCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Free</div>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Platform overview</div>
                {[
                  { label: 'Total children tracked', value: fmtN(stats.total_kids) },
                  { label: 'Linked households',       value: fmtN(stats.linked_households) },
                  { label: 'Pending invitations',     value: fmtN(stats.pending_invites) },
                  { label: 'New users (7 days)',       value: `+${stats.new_users_7d}` },
                  { label: 'New expenses (7 days)',    value: `+${stats.new_expenses_7d}` },
                  { label: 'Avg spend / household',   value: stats.total_households > 0 ? fmt(stats.total_spend / stats.total_households) : '$0' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent expense activity chart */}
            {stats.expenses_by_day?.length > 0 && (
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Expense activity (last 30 days)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                  {stats.expenses_by_day.slice(-30).map((d, i) => {
                    const max = Math.max(...stats.expenses_by_day.map(x => x.count), 1)
                    const h = Math.max(3, (d.count / max) * 72)
                    return (
                      <div key={i} title={`${d.day}: ${d.count} expenses, ${fmt(d.amount)}`}
                        style={{ flex: 1, height: h, background: '#3b82f6', borderRadius: '2px 2px 0 0', opacity: 0.7, cursor: 'default', transition: 'opacity .15s' }} />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ PLAN MANAGER ════ */}
        {view === 'plans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {[
                { label: 'Total users',     value: fmtN(users.length), color: '#60a5fa' },
                { label: 'Premium users',   value: fmtN(premiumCount), color: '#f59e0b' },
                { label: 'Free users',      value: fmtN(freeCount),    color: '#64748b' },
              ].map(k => (
                <div key={k.label} style={{ ...S.card, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…" style={{ ...S.inp, maxWidth: 320 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all','free','premium'] as const).map(p => (
                  <button key={p} onClick={() => setPlanFilter(p)}
                    style={{ padding: '7px 14px', border: '1px solid #334155', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: planFilter === p ? '#2563eb' : 'transparent', color: planFilter === p ? '#fff' : '#64748b' }}>
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Users plan table */}
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>User</th>
                    <th style={S.th}>Household</th>
                    <th style={S.th}>Current plan</th>
                    <th style={S.th}>Expenses</th>
                    <th style={S.th}>Total spend</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const isPremium = u.plan === 'premium'
                    return (
                      <tr key={u.id} style={{ cursor: 'default' }}>
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: u.color ?? '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {(u.display_name ?? u.email)?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{u.display_name ?? '—'}</div>
                              <div style={{ fontSize: 11, color: '#475569' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}>{u.household_name ?? <span style={{ color: '#334155' }}>No household</span>}</td>
                        <td style={S.td}>
                          <span style={S.badge(isPremium ? '#f59e0b' : '#64748b')}>
                            {isPremium ? '★ Premium' : 'Free'}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' as const }}>{fmtN(u.expense_count)}</td>
                        <td style={{ ...S.td, textAlign: 'right' as const }}>{fmt(u.total_spend)}</td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isPremium ? (
                              <button onClick={() => setPlan(u.id, 'free', u.display_name ?? u.email)}
                                style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #f59e0b', borderRadius: 7, fontSize: 12, color: '#f59e0b', cursor: 'pointer', fontWeight: 700 }}>
                                ↓ Downgrade
                              </button>
                            ) : (
                              <button onClick={() => setPlan(u.id, 'premium', u.display_name ?? u.email)}
                                style={{ padding: '5px 12px', background: '#064e3b', border: '1px solid #34d399', borderRadius: 7, fontSize: 12, color: '#34d399', cursor: 'pointer', fontWeight: 700 }}>
                                ↑ Upgrade to Premium
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: 32 }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ USERS ════ */}
        {view === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or household…" style={{ ...S.inp, maxWidth: 400 }} />

            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>User</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Plan</th>
                    <th style={S.th}>Household</th>
                    <th style={S.th}>Expenses</th>
                    <th style={S.th}>Last active</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const isPremium = u.plan === 'premium'
                    const isOpen    = expandedUser === u.id
                    return (
                      <tr key={u.id} onClick={() => setExpandedUser(isOpen ? null : u.id)}
                        style={{ cursor: 'pointer', background: isOpen ? '#1e293b' : 'transparent' }}>
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: u.color ?? '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {(u.display_name ?? u.email)?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{u.display_name ?? '—'}</div>
                              <div style={{ fontSize: 11, color: '#475569' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(u.email_confirmed_at ? '#34d399' : '#f59e0b')}>
                            {u.email_confirmed_at ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(isPremium ? '#f59e0b' : '#64748b')}>
                            {isPremium ? '★ Premium' : 'Free'}
                          </span>
                        </td>
                        <td style={{ ...S.td, color: u.household_name ? '#cbd5e1' : '#334155' }}>
                          {u.household_name ?? 'None'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' as const }}>
                          <div>{fmtN(u.expense_count)}</div>
                          <div style={{ fontSize: 11, color: '#475569' }}>{fmt(u.total_spend)}</div>
                        </td>
                        <td style={{ ...S.td, color: '#475569' }}>{fmtAgo(u.last_sign_in_at)}</td>
                        <td style={S.td} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 5, flexDirection: 'column' }}>
                            {isPremium ? (
                              <button onClick={() => setPlan(u.id, 'free', u.display_name ?? u.email)}
                                style={{ padding: '3px 9px', border: '1px solid #f59e0b', borderRadius: 6, background: 'transparent', color: '#f59e0b', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ↓ Downgrade
                              </button>
                            ) : (
                              <button onClick={() => setPlan(u.id, 'premium', u.display_name ?? u.email)}
                                style={{ padding: '3px 9px', border: '1px solid #34d399', borderRadius: 6, background: '#064e3b', color: '#34d399', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ↑ Upgrade
                              </button>
                            )}
                            <button onClick={() => deleteUser(u.id, u.email)}
                              style={{ padding: '3px 9px', border: '1px solid #7f1d1d', borderRadius: 6, background: '#450a0a', color: '#fca5a5', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: 32 }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ HOUSEHOLDS ════ */}
        {view === 'households' && (
          <div style={{ display: 'flex', gap: 20 }}>
            {/* List */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search households or members…" style={{ ...S.inp, marginBottom: 14 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredHouseholds.map(h => (
                  <div key={h.id}
                    onClick={() => loadDetail(h.id)}
                    style={{ ...S.card, cursor: 'pointer', border: detail?.household.id === h.id ? '1px solid #3b82f6' : '1px solid #334155', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{fmtDate(h.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                      <span>👤 {h.member_count} members</span>
                      <span>👶 {h.kid_count} kids</span>
                      <span>📋 {h.expense_count} expenses</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{fmt(h.total_spend)}</span>
                    </div>
                    {h.members.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        {h.members.map(m => (
                          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: '#0f172a', borderRadius: 99 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: m.color }} />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{m.display_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {filteredHouseholds.length === 0 && (
                  <div style={{ color: '#475569', fontSize: 13, padding: 24, textAlign: 'center' }}>No households found</div>
                )}
              </div>
            </div>

            {/* Detail panel */}
            {(detail || detailLoading) && (
              <div style={{ width: 420, flexShrink: 0 }}>
                <div style={{ ...S.card, position: 'sticky' as const, top: 24 }}>
                  {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading…</div>
                  ) : detail ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{detail?.household?.name ?? ''}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => deleteHousehold(detail?.household?.id, detail?.household?.name ?? '')}
                            style={{ padding: '5px 10px', border: '1px solid #7f1d1d', borderRadius: 7, background: '#450a0a', color: '#fca5a5', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                            Delete household
                          </button>
                          <button onClick={() => setDetail(null)}
                            style={{ width: 28, height: 28, background: '#334155', border: 'none', borderRadius: 7, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Members */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Members</div>
                      {(detail?.members ?? []).map(m => (
                        <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #334155' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {m.display_name?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#f1f5f9' }}>{m.display_name}</div>
                            <div style={{ fontSize: 11, color: '#475569' }}>{m.email}</div>
                          </div>
                          <button onClick={() => removeMember(detail?.household?.id, m.user_id, m.display_name)}
                            style={{ padding: '3px 8px', border: '1px solid #334155', borderRadius: 6, background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      ))}

                      {/* Recent expenses */}
                      {(detail?.expenses?.length ?? 0) > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '16px 0 8px' }}>Recent expenses</div>
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {(detail?.expenses ?? []).slice(0, 20).map(e => (
                              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1e293b' }}>
                                <div>
                                  <div style={{ fontSize: 12, color: '#cbd5e1' }}>{e.description}</div>
                                  <div style={{ fontSize: 11, color: '#475569' }}>{e.category_name} · {e.date}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>{e.currency} {fmt(e.amount)}</span>
                                  <button onClick={() => deleteExpense(e.id, e.description, detail?.household?.id)}
                                    style={{ width: 22, height: 22, background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 5, color: '#fca5a5', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── CONFIRM MODAL ── */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#450a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
              </div>
              <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>{confirm.msg}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirm(null)}
                style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #334155', borderRadius: 9, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => { confirm.action(); setConfirm(null) }}
                style={{ padding: '9px 18px', background: '#dc2626', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 600, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '11px 18px', fontSize: 13, color: '#f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#34d399' }}>✓</span> {toast}
        </div>
      )}
    </div>
  )
}
