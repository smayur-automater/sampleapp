'use client'
import {
  BellAlertIcon,
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
  const [panel,   setPanel]   = useState<'profile' | 'upgrade' | null>(null)

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
              CoParent<span style={{ color: '#2ec4a0' }}> Pay</span>
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
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
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
      <main style={{ paddingTop: 90 }}>{children}</main>

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
                  <StarIcon style={{ width: 13, height: 13 }} /> {isPremium ? 'Premium' : 'Upgrade'}
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
                  <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#1a3a6b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26 }}>
                    {profile.initials}
                  </div>
                </div>

                {/* Plan badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  {isPremium
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, fontSize: 12, fontWeight: 700, color: '#d97706' }}>★ Premium plan</span>
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
                  {saveOk  && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, fontSize: 13, color: '#059669' }}>✓ {saveOk}</div>}
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
                        {pwOk  && <div style={{ padding: '9px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, fontSize: 13, color: '#059669' }}>✓ {pwOk}</div>}
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
              <div style={{ padding: '20px 22px 0' }}>

                {isPremium ? (
                  /* Already premium */
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>You&apos;re on Premium!</h2>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>You have access to all premium features.</p>
                  </div>
                ) : (
                  <>
                    {/* Free vs Premium comparison */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Upgrade to Premium</h2>
                      <p style={{ fontSize: 14, color: '#64748b' }}>Unlock unlimited expenses and advanced features</p>
                    </div>

                    {/* Free tier */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Free Plan</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>$0 <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>/ forever</span></div>
                        </div>
                        <span style={{ padding: '4px 10px', background: '#e2e8f0', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#64748b' }}>Current</span>
                      </div>
                      {[
                        'Up to 10 shared expenses',
                        'Basic expense tracking',
                        'Co-parent invitations',
                        'Kids and categories management',
                      ].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <CheckCircleIcon style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#64748b' }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Premium tier */}
                    <div style={{ background: '#1a3a6b', border: '2px solid #1a3a6b', borderRadius: 14, padding: 18, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', background: '#2ec4a0', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#fff' }}>
                        RECOMMENDED
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Premium Plan</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                          $4.99 <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>/ month</span>
                        </div>
                      </div>
                      {[
                        { text: 'Unlimited shared expenses',     star: true  },
                        { text: 'Smart expense split rules',     star: true  },
                        { text: 'Monthly statements & reports',  star: true  },
                        { text: 'Receipt photo attachments',     star: true  },
                        { text: 'Expense history & analytics',   star: true  },
                        { text: 'Priority email support',        star: true  },
                        { text: 'All Free plan features',        star: false },
                      ].map(f => (
                        <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <CheckCircleIcon style={{ width: 16, height: 16, color: '#2ec4a0', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#fff' }}>{f.text}</span>
                          {f.star && <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginLeft: 'auto', background: 'rgba(251,191,36,0.15)', padding: '1px 6px', borderRadius: 99 }}>PREMIUM</span>}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                      <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                        <strong>To upgrade:</strong> Contact your admin at{' '}
                        <strong>xfiniti.com.au</strong> or ask your administrator to upgrade your account from the admin panel.
                      </p>
                    </div>

                    <button onClick={() => {
                      const subject = encodeURIComponent('CoParent Pay — Premium Upgrade Request')
                      const body = encodeURIComponent(`Hi,\n\nI would like to upgrade my CoParent Pay account to Premium.\n\nMy email: ${profile?.email}\n\nPlease activate Premium on my account.\n\nThank you`)
                      window.open(`mailto:info@xfiniti.com.au?subject=${subject}&body=${body}`)
                    }}
                      style={{ width: '100%', padding: 14, background: '#d97706', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                      ✉️ Request Premium upgrade
                    </button>
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
