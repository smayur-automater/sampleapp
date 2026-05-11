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

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<Invite | null>(null)
  const [inviteErr, setInviteErr] = useState('')

  // Edit me
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
      .eq('household_id', myMembership.household_id)
      .eq('accepted', false)
      .order('created_at', { ascending: false })
    setInvites((invs ?? []) as Invite[])

    const my = mems?.find(m => m.user_id === user.id)
    if (my) setMyForm({ display_name: my.display_name, color: my.color })

    setLoading(false)
  }

  async function sendInvite() {
    if (!household || !me) return
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteErr('Enter a valid email address')
      return
    }
    setSending(true); setInviteErr('')

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const link = `${window.location.origin}/invite/${code}`

    // Create invite record
    const { data: invite, error: invErr } = await supabase
      .from('invites')
      .insert({ household_id: household.id, invited_by: me.id, invited_email: inviteEmail.trim(), code })
      .select().single()

    if (invErr) {
      setInviteErr('Could not create invite: ' + invErr.message)
      setSending(false)
      return
    }

    // Send email via Supabase Auth's invite system
    // This uses Supabase's email template — make sure SMTP is configured!
    const { error: emailErr } = await supabase.auth.signInWithOtp({
      email: inviteEmail.trim(),
      options: {
        emailRedirectTo: link,
        shouldCreateUser: true,
      },
    })

    setSending(false)

    if (emailErr) {
      // Email failed but invite still exists — user can copy link manually
      setSent(invite as Invite)
      setInviteErr('Email send failed (' + emailErr.message + '). You can copy the link below and send it manually.')
    } else {
      setSent(invite as Invite)
      setInviteErr('')
    }
    load()
  }

  async function deleteInvite(id: string) {
    await supabase.from('invites').delete().eq('id', id)
    load()
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`)
    } catch {}
  }

  async function saveMe() {
    if (!me || !household) return
    setSavingMe(true)
    await supabase.from('household_members').update(myForm).eq('user_id', me.id).eq('household_id', household.id)
    setSavingMe(false)
    setEditMe(false)
    load()
  }

  function closeInviteModal() {
    setInviteModal(false)
    setSent(null)
    setInviteEmail('')
    setInviteErr('')
  }

  const myInfo = members.find(m => m.user_id === me?.id)
  const coParent = members.find(m => m.user_id !== me?.id)

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', background: '#f8fafc', outline: 'none' }
  const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '5px', display: 'block', letterSpacing: '0.05em' }

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
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>Invite co-parent by email</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Send them a link to join</div>
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
                    <div style={{ fontSize: '11px', color: '#78350f', marginTop: '1px' }}>Waiting to accept · expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => copyLink(inv.code)} style={{ padding: '5px 10px', background: '#fff', border: '1px solid #fde68a', borderRadius: '7px', fontSize: '12px', color: '#92400e', cursor: 'pointer', fontWeight: '500' }}>Copy link</button>
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

      {/* INVITE MODAL */}
      {inviteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && closeInviteModal()}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Invite co-parent</h3>
              <button onClick={closeInviteModal} style={{ width: '32px', height: '32px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {!sent ? (
              <>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                  Enter your co-parent&apos;s email. We&apos;ll send them a link to join your household.
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>EMAIL ADDRESS</label>
                  <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteErr('') }}
                    onKeyDown={e => e.key === 'Enter' && sendInvite()}
                    placeholder="coparent@example.com" style={inp} autoFocus />
                </div>
                {inviteErr && (
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626', marginBottom: '14px' }}>
                    {inviteErr}
                  </div>
                )}
                <button onClick={sendInvite} disabled={sending}
                  style={{ width: '100%', padding: '13px', background: sending ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: sending ? 'not-allowed' : 'pointer' }}>
                  {sending ? 'Sending invite…' : 'Send invite email'}
                </button>
              </>
            ) : (
              <>
                <div style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <strong style={{ fontSize: '14px', color: '#059669' }}>Invite sent!</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#065f46', lineHeight: 1.5 }}>
                    Email sent to <strong>{sent.invited_email}</strong>. They&apos;ll click the link in the email to join.
                  </div>
                </div>

                {inviteErr && (
                  <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#dc2626', marginBottom: '14px' }}>
                    {inviteErr}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>BACKUP — SHARE THIS LINK MANUALLY</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {`${window.location.origin}/invite/${sent.code}`}
                    </div>
                    <button onClick={() => copyLink(sent.code)} style={{ padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Copy</button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>In case the email doesn&apos;t arrive — you can send this link directly</div>
                </div>

                <button onClick={closeInviteModal}
                  style={{ width: '100%', padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
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
