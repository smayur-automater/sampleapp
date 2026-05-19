'use client'
import React from 'react'
import {
  BellAlertIcon,
  DocumentTextIcon,
  ArrowLeftStartOnRectangleIcon,
  UserCircleIcon,
  XMarkIcon,
  StarIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AuditPanel from '@/components/AuditPanel'

const TABS = [
  { path: '/dashboard',  label: 'Home'          },
  { path: '/kids',       label: 'Kids'          },
  { path: '/parents',    label: 'Parents'       },
  { path: '/categories', label: 'Categories'    },
  { path: '/rules',      label: 'Expense Rules' },
  { path: '/statements', label: 'Statements'    },
  { path: '/plan',       label: 'Plan'          },
  { path: '/about',      label: 'About'      },
  { path: '/support',    label: 'Support'       },
]

const FOOTER_LINKS = [
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/terms',   label: 'Terms of Service' },
  { path: '/refund',  label: 'Refund Policy'  },
]

interface Profile {
  firstName: string
  lastName:  string
  email:     string
  phone:     string
  plan:      string
  initials:  string
  color:     string
}

const INP: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: 14, color: '#0f172a', background: '#f8fafc',
  outline: 'none', boxSizing: 'border-box',
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const routerRef = useRef(router)
  routerRef.current = router

  const [audit,   setAudit]   = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [panel,   setPanel]   = useState<'profile' | 'upgrade' | 'billing' | null>(null)

  // Profile edit state
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveOk,    setSaveOk]    = useState('')
  const [saveErr,   setSaveErr]   = useState('')

  // Password change state
  const [changePw,  setChangePw]  = useState(false)
  const [pw,        setPw]        = useState('')
  const [pw2,       setPw2]       = useState('')
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwOk,      setPwOk]      = useState('')
  const [pwErr,     setPwErr]     = useState('')

  // Billing state
  const [billing,  setBilling]  = useState<{id:string;date:string;description:string;amount:number;currency:string;status:string}[]>([])
  const [billLoad, setBillLoad] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') routerRef.current.replace('/')
    })
    loadProfile()
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const meta  = user.user_metadata ?? {}
    const fn    = meta.first_name ?? ''
    const ln    = meta.last_name  ?? ''
    const ph    = meta.phone      ?? ''
    const name  = fn || ln ? `${fn} ${ln}`.trim() : user.email?.split('@')[0] ?? ''
    const inits = fn && ln ? `${fn[0]}${ln[0]}`.toUpperCase()
               : name[0]?.toUpperCase() ?? '?'

    // Get plan from household_members
    const { data: hm } = await supabase
      .from('household_members')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()

    setProfile({
      firstName: fn,
      lastName:  ln,
      email:     user.email ?? '',
      phone:     ph,
      plan:      hm?.plan ?? 'free',
      initials:  inits,
      color:     '#1a3a6b',
    })
    setFirstName(fn)
    setLastName(ln)
    setPhone(ph)
  }

  async function loadBilling() {
    setBillLoad(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBillLoad(false); return }
    const { data: member } = await supabase
      .from('household_members')
      .select('plan, plan_assigned_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (member?.plan === 'premium' && member.plan_assigned_at) {
      const records: typeof billing = []
      const start = new Date(member.plan_assigned_at)
      const now   = new Date()
      let cur = new Date(start.getFullYear(), start.getMonth(), 1)
      let idx = 0
      while (cur <= now && idx < 24) {
        records.push({
          id: `inv-${idx}`,
          date: cur.toISOString(),
          description: 'KidExpense Premium — Monthly subscription',
          amount: 7.00,
          currency: 'AUD',
          status: 'paid',
        })
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
        idx++
      }
      setBilling(records.reverse())
    } else {
      setBilling([])
    }
    setBillLoad(false)
  }

  async function saveProfile() {
    setSaving(true); setSaveOk(''); setSaveErr('')
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim(),
        full_name:  `${firstName.trim()} ${lastName.trim()}`,
      },
    })
    setSaving(false)
    if (error) { setSaveErr(error.message); return }
    // Also update display_name in household_members
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('household_members')
        .update({ display_name: `${firstName.trim()} ${lastName.trim()}`.trim() })
        .eq('user_id', user.id)
    }
    setSaveOk('Profile saved!')
    loadProfile()
    setTimeout(() => setSaveOk(''), 2500)
  }

  async function changePassword() {
    if (!pw) { setPwErr('Enter a new password'); return }
    if (pw.length < 6) { setPwErr('Must be at least 6 characters'); return }
    if (pw !== pw2) { setPwErr('Passwords do not match'); return }
    setPwSaving(true); setPwOk(''); setPwErr('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwSaving(false)
    if (error) { setPwErr(error.message); return }
    setPwOk('Password updated!'); setPw(''); setPw2('')
    setChangePw(false)
    setTimeout(() => setPwOk(''), 3000)
  }

  const isPremium = profile?.plan === 'premium'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`.tab-wrap::-webkit-scrollbar{display:none}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1a3a6b' }}>
              Kid<span style={{ color: '#2ec4a0' }}>Expense</span>
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Activity */}
            <button onClick={() => setAudit(a => !a)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', border: `1px solid ${audit ? '#0f172a' : '#e2e8f0'}`, borderRadius: 8, background: audit ? '#0f172a' : '#fff', fontSize: 12, fontWeight: 600, color: audit ? '#fff' : '#64748b', cursor: 'pointer' }}>
              <BellAlertIcon style={{ width: 14, height: 14 }} /> Activity
            </button>

            {/* Profile avatar button */}
            {profile && (
              <button onClick={() => { setPanel('profile'); setSaveOk(''); setSaveErr(''); setPwOk(''); setPwErr(''); setChangePw(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', border: '1px solid #e2e8f0', borderRadius: 99, background: '#fff', cursor: 'pointer' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {profile.initials}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.firstName || profile.email.split('@')[0]}
                </span>
                {isPremium && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>★</span>}
              </button>
            )}

            {/* Sign out */}
            <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
              title="Sign out"
              style={{ display: 'flex', alignItems: 'center', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer' }}>
              <ArrowLeftStartOnRectangleIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-wrap" style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid #f1f5f9' } as React.CSSProperties}>
          {TABS.map(({ path, label }) => {
            const on = pathname === path
            return (
              <button key={path} onClick={() => router.push(path)}
                style={{ flexShrink: 0, padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? '#1a3a6b' : '#64748b', whiteSpace: 'nowrap', borderBottom: on ? '2.5px solid #1a3a6b' : '2.5px solid transparent' }}>
                {label}
              </button>
            )
          })}
        </div>
      </header>

      <AuditPanel open={audit} onClose={() => setAudit(false)} />
      <main style={{ paddingTop: 90, paddingBottom: 56 }}>{children}</main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #e5e7eb', background: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        {FOOTER_LINKS.map(({ path, label }, i) => (
          <React.Fragment key={path}>
            {i > 0 && <span style={{ fontSize: 12, color: '#e5e7eb' }}>·</span>}
            <button onClick={() => router.push(path)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#9ca3af', padding: 0 }}>
              {label}
            </button>
          </React.Fragment>
        ))}
        <span style={{ fontSize: 12, color: '#e5e7eb' }}>·</span>
        <span style={{ fontSize: 12, color: '#d1d5db' }}>&copy; {new Date().getFullYear()} KidExpense</span>
      </footer>

      {/* ── PROFILE / UPGRADE PANEL ── */}
      {panel && (
        <div onClick={e => e.target === e.currentTarget && setPanel(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', paddingBottom: 32 }}>

            {/* Handle */}
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />

            {/* Header with tabs */}
            <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
                <button onClick={() => setPanel('profile')}
                  style={{ padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: panel === 'profile' ? 700 : 500, background: panel === 'profile' ? '#fff' : 'transparent', color: panel === 'profile' ? '#0f172a' : '#64748b', boxShadow: panel === 'profile' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  My Profile
                </button>
                <button onClick={() => setPanel('upgrade')}
                  style={{ padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: panel === 'upgrade' ? 700 : 500, background: panel === 'upgrade' ? '#fff' : 'transparent', color: panel === 'upgrade' ? '#d97706' : '#64748b', boxShadow: panel === 'upgrade' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isPremium ? 'Premium' : 'Upgrade'}
                </button>
                <button onClick={() => { setPanel('billing'); loadBilling() }}
                  style={{ padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: panel === 'billing' ? 700 : 500, background: panel === 'billing' ? '#fff' : 'transparent', color: panel === 'billing' ? '#0f172a' : '#64748b', boxShadow: panel === 'billing' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  Billing
                </button>
              </div>
              <button onClick={() => setPanel(null)}
                style={{ width: 30, height: 30, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 15, height: 15, color: '#64748b' }} />
              </button>
            </div>

            {/* ── PROFILE TAB ── */}
            {panel === 'profile' && profile && (
              <div style={{ padding: '20px 22px 0' }}>

                {/* Avatar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26 }}>
                    {profile.initials}
                  </div>
                </div>

                {/* Plan badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  {isPremium
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, fontSize: 12, fontWeight: 700, color: '#d97706' }}>Premium plan</span>
                    : <button onClick={() => setPanel('upgrade')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Free plan · <span style={{ color: '#1a3a6b', fontWeight: 700 }}>Upgrade →</span></button>
                  }
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>First name</label>
                      <input value={firstName} onChange={e => setFirstName(e.target.value)} style={INP} placeholder="First name" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last name</label>
                      <input value={lastName} onChange={e => setLastName(e.target.value)} style={INP} placeholder="Last name" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email address</label>
                    <input value={profile.email} readOnly style={{ ...INP, background: '#f1f5f9', color: '#94a3b8' }} />
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Email cannot be changed here</p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone number</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} style={INP} placeholder="+61 400 000 000" />
                  </div>

                  {/* Save feedback */}
                  {saveOk  && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, fontSize: 13, color: '#059669' }}>{saveOk}</div>}
                  {saveErr && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>{saveErr}</div>}

                  <button onClick={saveProfile} disabled={saving}
                    style={{ padding: 13, background: saving ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>

                  {/* Change password */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                    <button onClick={() => { setChangePw(c => !c); setPwOk(''); setPwErr('') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#1a3a6b', fontWeight: 600, padding: 0 }}>
                      <LockClosedIcon style={{ width: 15, height: 15 }} />
                      {changePw ? 'Cancel password change' : 'Change password'}
                    </button>

                    {changePw && (
                      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New password</label>
                          <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwErr('') }} placeholder="At least 6 characters" style={INP} autoFocus />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirm new password</label>
                          <input type="password" value={pw2} onChange={e => { setPw2(e.target.value); setPwErr('') }} placeholder="Re-enter password" style={INP} />
                        </div>
                        {pwErr && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, fontSize: 13, color: '#dc2626' }}>{pwErr}</div>}
                        {pwOk  && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, fontSize: 13, color: '#059669' }}>{pwOk}</div>}
                        <button onClick={changePassword} disabled={pwSaving}
                          style={{ padding: 13, background: pwSaving ? '#94a3b8' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: pwSaving ? 'not-allowed' : 'pointer' }}>
                          {pwSaving ? 'Updating…' : 'Update password'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sign out */}
                  <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
                    style={{ padding: 13, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ArrowLeftStartOnRectangleIcon style={{ width: 16, height: 16 }} /> Sign out
                  </button>
                </div>
              </div>
            )}

            {/* ── UPGRADE TAB ── */}
            {panel === 'upgrade' && (
              <div style={{ padding: '20px 22px 8px' }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  {isPremium ? 'Premium plan active' : 'Upgrade to Premium'}
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
                  {isPremium
                    ? 'Thank you for being a Premium member. To cancel, send us a request below — your access continues until the end of your billing period.'
                    : 'Unlock unlimited expenses, statements, analytics, split rules, and more.'}
                </p>

                {!isPremium && (
                  <>
                    <div style={{ background: '#0f172a', borderRadius: 6, padding: '16px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 3 }}>Premium</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12 }}>$7.00 <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>AUD / month</span></div>
                      {['Unlimited expenses', 'Smart split rules', 'Monthly statements (PDF + CSV)', 'Analytics and custom charts', 'Receipt attachments', 'Priority support'].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                          <CheckCircleIcon style={{ width: 13, height: 13, color: '#4ade80', flexShrink: 0 }}/>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) return
                      const subject = encodeURIComponent('KidExpense — Premium Upgrade Request')
                      const body = encodeURIComponent(`Hi,

I would like to upgrade my KidExpense account to Premium (AUD $7.00/month).

My account email: ${user.email}

Please activate Premium on my account.

Thank you`)
                      try {
                        const res  = await fetch('/api/stripe/checkout', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: user.id, email: user.email }),
                        })
                        const data = await res.json()
                        if (data.url) window.location.href = data.url
                        else alert('Could not start checkout — ' + (data.error ?? 'please try again'))
                      } catch { alert('Could not connect — please try again') }
                    }}
                      style={{ width: '100%', padding: 12, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                      Upgrade to Premium — $7.00/month
                    </button>
                    <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' as const, lineHeight: 1.6, margin: 0 }}>
                      Secured by Stripe. Cancel anytime.
                    </p>
                  </>
                )}

                {isPremium && (
                  <button onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    try {
                      const res  = await fetch('/api/stripe/portal', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id }),
                      })
                      const data = await res.json()
                      if (data.url) window.location.href = data.url
                      else alert(data.error ?? 'Could not open billing portal')
                    } catch { alert('Could not connect — please email info@xfiniti.com.au') }
                  }}
                    style={{ width: '100%', padding: 11, background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                    Manage billing / Cancel subscription
                  </button>
                )}
              </div>
            )}
            {/* ── BILLING TAB ── */}
            {panel === 'billing' && (
              <div style={{ padding: '20px 22px 8px' }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Billing &amp; Invoices</h2>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
                  {isPremium ? 'Your Premium subscription history.' : 'No active subscription. Upgrade to Premium to see billing history.'}
                </p>

                {!isPremium && (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ width: 44, height: 44, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <DocumentTextIcon style={{ width: 20, height: 20, color: '#94a3b8' }} />
                    </div>
                    <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 14 }}>No billing history yet</p>
                    <button onClick={() => setPanel('upgrade')} style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      View Premium plans
                    </button>
                  </div>
                )}

                {isPremium && billLoad && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
                )}

                {isPremium && !billLoad && (
                  <>
                    {/* Summary card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, padding: '14px 16px', marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>KidExpense Premium</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>AUD $7.00 per month</div>
                        </div>
                        <span style={{ padding: '3px 9px', background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: 3, fontSize: 11, fontWeight: 700, color: '#059669' }}>Active</span>
                      </div>
                      <div style={{ height: 1, background: '#e5e7eb', margin: '10px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                        <span>Total paid to date</span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>AUD ${(billing.length * 7).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Transactions */}
                    {billing.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>No transactions yet</p>
                    ) : (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                          Transaction history ({billing.length})
                        </div>
                        {billing.map((b, i) => (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < billing.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <CheckCircleIcon style={{ width: 15, height: 15, color: '#059669' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{b.description}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                                {new Date(b.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                {' · '}
                                <span style={{ color: '#059669', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Paid</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>A${b.amount.toFixed(2)}</div>
                              <div style={{ fontSize: 10, color: '#9ca3af' }}>{b.currency}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Invoice request note */}
                    <div style={{ marginTop: 20, padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4 }}>
                      <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                        Need a formal invoice or GST receipt? Email <a href="mailto:info@xfiniti.com.au" style={{ color: '#92400e', fontWeight: 700 }}>info@xfiniti.com.au</a> with your account email and billing month. We will send a PDF invoice within 24 hours.
                      </p>
                    </div>

                    <div style={{ marginTop: 14, textAlign: 'center' }}>
                      <button onClick={() => setPanel('upgrade')} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Manage or cancel subscription
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}


          </div>
        </div>
      )}
    </div>
  )
}