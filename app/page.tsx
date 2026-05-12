'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

interface Member { user_id: string; display_name: string; color: string; role: string }
interface Invite { id: string; code: string; invited_email: string; expires_at: string }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#475569']

export default function ParentsPage() {
  const [me, setMe] = useState<{ id: string; email: string } | null>(null)
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<Invite | null>(null)
  const [inviteErr, setInviteErr] = useState('')
  const [copyToast, setCopyToast] = useState('')

  const [editMe, setEditMe] = useState(false)
  const [myForm, setMyForm] = useState({ display_name: '', color: '#2563eb' })
  const [savingMe, setSavingMe] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMe({ id: user.id, email: user.email ?? '' })

    const { data: myMembership } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle()
    if (!myMembership?.household_id) { setLoading(false); return }

    const { data: hh } = await supabase.from('households').select('*').eq('id', myMembership.household_id).single()
    setHousehold(hh)

    const { data: mems } = await supabase.from('household_members').select('*').eq('household_id', myMembership.household_id)
    setMembers(mems ?? [])

    const { data: invs } = await supabase
      .from('invites').select('*')
      .eq('household_id', myMembership.household_id).eq('accepted', false)
      .order('created_at', { ascending: false })
    setInvites((invs ?? []) as Invite[])

    const my = mems?.find(m => m.user_id === user.id)
    if (my) setMyForm({ display_name: my.display_name, color: my.color })
    setLoading(false)
  }

  async function createInvite() {
    if (!household || !me) return
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteErr('Enter a valid email address')
      return
    }
    setCreating(true); setInviteErr('')

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({ household_id: household.id, invited_by: me.id, invited_email: inviteEmail.trim(), code })
      .select().single()

    setCreating(false)

    if (error) {
      setInviteErr('Could not create invite: ' + error.message)
      return
    }

    setCreated(invite as Invite)
    load()
  }

  async function deleteInvite(id: string) {
    await supabase.from('invites').delete().eq('id', id)
    load()
  }

  function inviteLink(code: string) {
    return `${window.location.origin}/invite/${code}`
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyToast('Copied!')
      setTimeout(() => setCopyToast(''), 2000)
    } catch {}
  }

  function openEmailClient(email: string, code: string) {
    const link = inviteLink(code)
    const myName = me?.email?.split('@')[0] ?? 'Your co-parent'
    const subject = encodeURIComponent(`Join me on CoParent — shared expense tracker`)
    const body = encodeURIComponent(
      `Hi,\n\n` +
      `${myName} invited you to join their CoParent household to track shared children expenses together.\n\n` +
      `Click this link to join:\n${link}\n\n` +
      `(This invite expires in 7 days)\n\n` +
      `Once you sign up or sign in, you'll be added automatically.`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  function openWhatsApp(code: string) {
    const link = inviteLink(code)
    const text = encodeURIComponent(`Join me on CoParent to track our shared children expenses: ${link}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function openSMS(code: string) {
    const link = inviteLink(code)
    const text = encodeURIComponent(`Join me on CoParent to track our shared children expenses: ${link}`)
    window.location.href = `sms:?body=${text}`
  }

  async function saveMe() {
    if (!me || !household) return
    setSavingMe(true)
    await supabase.from('household_members').update(myForm).eq('user_id', me.id).eq('household_id', household.id)
    setSavingMe(false); setEditMe(false); load()
  }

  function closeInviteModal() {
    setInviteModal(false); setCreated(null); setInviteEmail(''); setInviteErr('')
  }

  const myInfo = members.find(m => m.user_id === me?.id)
  const coParent = members.find(m => m.user_id !== me?.id)

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }
  const shareBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }

  return (
    <Shell>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.5px' }}>Household</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{household?.name ?? 'Loading…'}</p>
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>Loading…</div> : (
        <>
          {myInfo && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '8px', paddingLeft: '4px' }}>YOU</div>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: myInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '20px' }}>
                  {myInfo.display_name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{myInfo.display_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{me?.email}</div>
                </div>
                <button onClick={() => setEditMe(true)} style={{ padding: '7px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#374151', fontWeight: '500', cursor: 'pointer' }}>Edit</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '8px', paddingLeft: '4px' }}>CO-PARENT</div>
            {coParent ? (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: coParent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '20px' }}>
                  {coParent.display_name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{coParent.display_name}</div>
                  <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    Connected
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setInviteModal(true)} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '700', fontSize: '24px' }}>+</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>Invite co-parent</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Share invite link via email, WhatsApp or SMS</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            )}
          </div>

          {invites.length > 0 && !coParent && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '8px', paddingLeft: '4px' }}>PENDING INVITES</div>
              {invites.map(inv => (
                <div key={inv.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⏳</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.invited_email}</div>
                    <div style={{ fontSize: '11px', color: '#78350f', marginTop: '1px' }}>Waiting · expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => copyText(inviteLink(inv.code))} style={{ padding: '5px 10px', background: '#fff', border: '1px solid #fde68a', borderRadius: '7px', fontSize: '12px', color: '#92400e', cursor: 'pointer', fontWeight: '500' }}>Copy link</button>
                  <button onClick={() => deleteInvite(inv.id)} style={{ padding: '5px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', color: '#dc2626', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '14px 16px', background: '#eff6ff', borderRadius: '12px', fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
            💡 Both parents see all expenses, children, and categories. Only the parent who created an entry can edit or delete it.
          </div>
        </>
        )}
      </div>

      {/* COPY TOAST */}
      {copyToast && (
        <div style={{ position: 'fixed', bottom: '88px', left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '500' }}>
          {copyToast}
        </div>
      )}

      {/* INVITE MODAL */}
      {inviteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && closeInviteModal()}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Invite co-parent</h3>
              <button onClick={closeInviteModal} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {!created ? (
              <>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                  Enter your co-parent&apos;s email to generate an invite. You&apos;ll then send the join link via your preferred channel.
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>CO-PARENT EMAIL</label>
                  <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteErr('') }}
                    onKeyDown={e => e.key === 'Enter' && createInvite()}
                    placeholder="coparent@example.com" style={inp} autoFocus />
                </div>
                {inviteErr && (
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626', marginBottom: '14px' }}>{inviteErr}</div>
                )}
                <button onClick={createInvite} disabled={creating}
                  style={{ width: '100%', padding: '13px', background: creating ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? 'Creating…' : 'Generate invite link'}
                </button>
              </>
            ) : (
              <>
                <div style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <strong style={{ fontSize: '14px', color: '#059669' }}>Invite ready</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#065f46', lineHeight: 1.5 }}>
                    Send this link to <strong>{created.invited_email}</strong>. They&apos;ll click it, sign in or sign up, and join your household automatically.
                  </div>
                </div>

                {/* Share buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <button onClick={() => openEmailClient(created.invited_email, created.code)} style={shareBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    Email
                  </button>
                  <button onClick={() => openWhatsApp(created.code)} style={shareBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                    WhatsApp
                  </button>
                  <button onClick={() => openSMS(created.code)} style={shareBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    SMS
                  </button>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>OR COPY THE LINK</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inviteLink(created.code)}
                    </div>
                    <button onClick={() => copyText(inviteLink(created.code))} style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Copy</button>
                  </div>
                </div>

                <button onClick={closeInviteModal}
                  style={{ width: '100%', padding: '13px', background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT ME MODAL */}
      {editMe && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setEditMe(false)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Your profile</h3>
              <button onClick={() => setEditMe(false)} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: myForm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '28px' }}>
                  {myForm.display_name[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div><label style={lbl}>YOUR NAME</label><input value={myForm.display_name} onChange={e => setMyForm({ ...myForm, display_name: e.target.value })} placeholder="Your display name" style={inp} /></div>
              <div>
                <label style={lbl}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => <button key={c} type="button" onClick={() => setMyForm({ ...myForm, color: c })} style={{ width: '36px', height: '36px', borderRadius: '10px', background: c, border: myForm.color === c ? '3px solid #0f172a' : '3px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <button onClick={saveMe} disabled={savingMe || !myForm.display_name.trim()} style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: (savingMe || !myForm.display_name.trim()) ? 0.5 : 1 }}>
                {savingMe ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
