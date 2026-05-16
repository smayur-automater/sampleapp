'use client'
import {
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  UserMinusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

interface Member {
  user_id: string
  display_name: string
  first_name?: string
  last_name?: string
  color: string
  role: string
  relationship: string
}
interface Invite { id: string; code: string; invited_email: string; expires_at: string; accepted: boolean }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#374151','#db2777']
const RELATIONSHIPS = ['Father','Mother','Guardian','Stepfather','Stepmother','Grandparent','Other']

const RELATIONSHIP_ICON: Record<string, string> = {
  Father: '👨', Mother: '👩', Guardian: '🧑', Stepfather: '👨‍👦',
  Stepmother: '👩‍👦', Grandparent: '🧓', Other: '👤',
}

const INP: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 15, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const SEL: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 15, background: '#f8fafc', outline: 'none', color: '#0f172a', appearance: 'auto' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' as const }

export default function ParentsPage() {
  const [me,        setMe]        = useState<{ id: string; email: string } | null>(null)
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null)
  const [members,   setMembers]   = useState<Member[]>([])
  const [invites,   setInvites]   = useState<Invite[]>([])
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState('')

  // Invite
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating,    setCreating]    = useState(false)
  const [created,     setCreated]     = useState<Invite | null>(null)
  const [inviteErr,   setInviteErr]   = useState('')
  const [copied,      setCopied]      = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle'|'sending'|'sent'|'failed'>('idle')
  const [emailErr,    setEmailErr]    = useState('')

  // Edit profile
  const [editModal, setEditModal] = useState(false)
  const [myForm,    setMyForm]    = useState({ first_name: '', last_name: '', relationship: 'Parent', color: '#2563eb' })
  const [saving,    setSaving]    = useState(false)

  // Remove
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing,     setRemoving]     = useState(false)

  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) { setErr('Not signed in'); setLoading(false); return }

      const userId = user.id
      setMe({ id: userId, email: user.email ?? '' })

      const { data: mb, error: mbErr } = await supabase
        .from('household_members').select('household_id')
        .eq('user_id', userId).maybeSingle()

      if (mbErr) { setErr(mbErr.message); setLoading(false); return }
      if (!mb?.household_id) { setLoading(false); return }

      const [hhRes, memsRes, invsRes] = await Promise.all([
        supabase.from('households').select('id, name').eq('id', mb.household_id).maybeSingle(),
        supabase.from('household_members')
          .select('user_id, display_name, color, role')
          .eq('household_id', mb.household_id),
        supabase.from('invites').select('id, code, invited_email, expires_at, accepted')
          .eq('household_id', mb.household_id).eq('accepted', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ])

      if (hhRes.error)   { setErr(hhRes.error.message); setLoading(false); return }
      if (!hhRes.data)    { setErr('Household not found'); setLoading(false); return }
      if (memsRes.error) { setErr(memsRes.error.message); setLoading(false); return }

      setHousehold(hhRes.data)

      // Parse first/last from display_name if no explicit fields
      const mems = (memsRes.data ?? []).map((m: any) => {
        const parts = (m.display_name ?? '').trim().split(' ')
        return {
          ...m,
          relationship: (m as any).relationship ?? 'Parent',
          first_name: parts[0] ?? '',
          last_name: parts.slice(1).join(' ') ?? '',
        }
      })
      setMembers(mems)
      setInvites((invsRes.data ?? []) as Invite[])

      const mine = mems.find(m => m.user_id === userId)
      if (mine) {
        setMyForm({
          first_name:   mine.first_name ?? '',
          last_name:    mine.last_name ?? '',
          relationship: mine.relationship ?? 'Parent',
          color:        mine.color,
        })
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Full display name from first + last
  function fullName(m: Member) {
    const fn = m.first_name?.trim() ?? ''
    const ln = m.last_name?.trim() ?? ''
    if (fn && ln) return `${fn} ${ln}`
    if (fn) return fn
    return m.display_name ?? 'Unknown'
  }

  function initials(m: Member) {
    const fn = m.first_name?.trim()
    const ln = m.last_name?.trim()
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase()
    if (fn) return fn[0]?.toUpperCase() ?? '?'
    return (m.display_name?.[0] ?? '?').toUpperCase()
  }

  // ── Invite ────────────────────────────────────────────────────────
  async function createInvite() {
    if (!household || !me) return
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { setInviteErr('Enter a valid email address'); return }
    setCreating(true); setInviteErr('')

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    const code = Array.from(bytes).map(b => chars[b % chars.length]).join('')

    const { data: inv, error } = await supabase.from('invites')
      .insert({ household_id: household.id, invited_by: me.id, invited_email: inviteEmail.trim().toLowerCase(), code })
      .select().maybeSingle()

    setCreating(false)
    if (error) {
      setInviteErr(error.code === '23505' ? 'An invite for this email already exists. Cancel it first.' : `Error: ${error.message}`)
      return
    }

    if (!inv) { setInviteErr('Failed to create invite — please try again'); return }
    const newInvite = inv as Invite
    setCreated(newInvite)
    setEmailStatus('sending'); setEmailErr('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-invite', {
        body: { invite_id: newInvite.id, invite_code: newInvite.code, to_email: inviteEmail.trim().toLowerCase() },
      })
      if (fnErr) { setEmailStatus('failed'); setEmailErr('Copy the link below and share manually') }
      else if (data?.ok) setEmailStatus('sent')
      else { setEmailStatus('failed'); setEmailErr(data?.error ?? 'Email service error') }
    } catch { setEmailStatus('failed'); setEmailErr('Copy the link below and share manually') }

    await logAudit({ household_id: household.id, user_id: me.id, actor_name: me.email.split('@')[0], action: 'parent.invite', entity: inviteEmail.trim() })
    load()
  }

  function inviteLink(code: string) { return typeof window === 'undefined' ? '' : `${window.location.origin}/invite/${code}` }

  async function copyLink(code: string) {
    try { await navigator.clipboard.writeText(inviteLink(code)); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast('Link copied!') }
    catch { const el = document.createElement('textarea'); el.value = inviteLink(code); document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); showToast('Link copied!') }
  }

  function shareEmail(inv: Invite) { const link = inviteLink(inv.code); window.open(`mailto:${inv.invited_email}?subject=${encodeURIComponent('You have been invited to CoParent Pay')}&body=${encodeURIComponent(`Hi,\n\nClick the link below to join CoParent Pay:\n${link}\n\nExpires in 7 days.`)}`) }
  function shareWhatsApp(inv: Invite) { window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on CoParent Pay: ${inviteLink(inv.code)}`)}`, '_blank') }
  function shareSMS(inv: Invite) { window.location.href = `sms:?&body=${encodeURIComponent(`Join me on CoParent Pay: ${inviteLink(inv.code)}`)}` }
  function shareNative(inv: Invite) { if ('share' in navigator) navigator.share({ title: 'Join CoParent Pay', url: inviteLink(inv.code) }).catch(() => {}) }
  const canShareNative = typeof navigator !== 'undefined' && 'share' in navigator

  async function cancelInvite(id: string) { await supabase.from('invites').delete().eq('id', id); load() }

  function closeInviteModal() { setInviteModal(false); setCreated(null); setInviteEmail(''); setInviteErr(''); setCopied(false); setEmailStatus('idle'); setEmailErr('') }
  function openInviteModal() { setCreated(null); setInviteEmail(''); setInviteErr(''); setCopied(false); setInviteModal(true) }

  // ── Remove ─────────────────────────────────────────────────────────
  async function removeParent() {
    if (!removeTarget || !household || !me) return
    setRemoving(true)
    const { error } = await supabase.from('household_members').delete().eq('user_id', removeTarget.user_id).eq('household_id', household.id)
    setRemoving(false)
    if (error) { alert(error.message); return }
    setRemoveTarget(null); load()
  }

  // ── Edit profile ──────────────────────────────────────────────────
  async function saveMe() {
    if (!me || !household) return
    setSaving(true)
    const fullDisplayName = [myForm.first_name.trim(), myForm.last_name.trim()].filter(Boolean).join(' ')
    const { error } = await supabase.from('household_members')
      .update({ display_name: fullDisplayName, color: myForm.color, relationship: myForm.relationship })
      .eq('user_id', me.id).eq('household_id', household.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setEditModal(false); load()
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const myInfo    = members.find(m => m.user_id === me?.id)
  const otherMems = members.filter(m => m.user_id !== me?.id)

  if (loading) return <Shell><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}><div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>
  if (err) return <Shell><div style={{ padding: 24, textAlign: 'center' }}><p style={{ color: '#dc2626', marginBottom: 12 }}>{err}</p><button onClick={load} style={{ padding: '8px 20px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Retry</button></div></Shell>

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px', fontFamily: 'system-ui, sans-serif' }}>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Household</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>{household?.name ?? '—'}</p>

        {/* ── YOUR CARD ── */}
        {myInfo && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>You</div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: myInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                {initials(myInfo)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{fullName(myInfo)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 16 }}>{RELATIONSHIP_ICON[myInfo.relationship] ?? '👤'}</span>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{myInfo.relationship || 'Parent'}</span>
                </div>
              </div>
              <button onClick={() => setEditModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                <PencilIcon style={{ width: 13, height: 13 }} /> Edit
              </button>
            </div>
          </section>
        )}

        {/* ── OTHER MEMBERS ── */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {otherMems.length > 0 ? `Co-parent${otherMems.length > 1 ? 's' : ''}` : 'Co-parent'}
          </div>

          {otherMems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {otherMems.map(m => (
                <div key={m.user_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 15, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                    {initials(m)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{fullName(m)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16 }}>{RELATIONSHIP_ICON[m.relationship] ?? '👤'}</span>
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{m.relationship || 'Parent'}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} /> Connected
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setRemoveTarget(m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#dc2626', fontWeight: 600, flexShrink: 0 }}>
                    <UserMinusIcon style={{ width: 13, height: 13 }} /> Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Invite button — always show if fewer than 2 total members */}
          {members.length < 2 && (
            <div style={{ marginTop: otherMems.length > 0 ? 10 : 0 }}>
              <button onClick={openInviteModal}
                style={{ width: '100%', textAlign: 'left', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginBottom: invites.length ? 10 : 0 }}>
                <div style={{ width: 54, height: 54, borderRadius: 15, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlusIcon strokeWidth={1.8} style={{ width: 24, height: 24, color: '#94a3b8' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#334155' }}>Invite co-parent</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Generate a link and share however you like</div>
                </div>
              </button>

              {invites.map(inv => (
                <div key={inv.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <ArrowPathIcon style={{ flexShrink: 0, width: 14, height: 14, color: '#b45309' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.invited_email}</div>
                    <div style={{ fontSize: 11, color: '#78350f', marginTop: 1 }}>Pending · expires {new Date(inv.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <button onClick={() => { setCreated(inv); setInviteModal(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#fff', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                    <LinkIcon style={{ width: 11, height: 11 }} /> Share
                  </button>
                  <button onClick={() => cancelInvite(inv.id)}
                    style={{ padding: '6px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ padding: '13px 15px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 13, fontSize: 13, color: '#1e40af', lineHeight: 1.65 }}>
          Both parents see all expenses, children and categories. Only the parent who added an entry can edit or delete it.
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <CheckIcon style={{ width: 14, height: 14, color: '#4ade80' }} /> {toast}
        </div>
      )}

      {/* INVITE MODAL */}
      {inviteModal && (
        <div onClick={e => e.target === e.currentTarget && closeInviteModal()}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 520 }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{created ? 'Share invite link' : 'Invite co-parent'}</h3>
              <button onClick={closeInviteModal} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: '#64748b' }} />
              </button>
            </div>
            <div style={{ padding: '16px 22px 0' }}>
              {!created ? (
                <>
                  <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>Enter their email to generate a private invite link.</p>
                  <div style={{ marginBottom: 14 }}>
                    <label style={LBL}>Co-parent&apos;s email</label>
                    <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteErr('') }} onKeyDown={e => e.key === 'Enter' && createInvite()} placeholder="their@email.com" style={INP} autoFocus />
                  </div>
                  {inviteErr && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}><ExclamationTriangleIcon style={{ flexShrink: 0, marginTop: 1, width: 15, height: 15 }} /> {inviteErr}</div>}
                  <button onClick={createInvite} disabled={creating || !inviteEmail.trim()} style={{ width: '100%', padding: 14, background: creating || !inviteEmail.trim() ? '#93c5fd' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: creating || !inviteEmail.trim() ? 'not-allowed' : 'pointer' }}>
                    {creating ? 'Generating…' : 'Generate invite link →'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <CheckIcon style={{ marginTop: 1, flexShrink: 0, width: 16, height: 16, color: '#059669' }} />
                    <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.5 }}>Invite link created for <strong>{created.invited_email}</strong>. Valid for 7 days.</div>
                  </div>
                  {emailStatus === 'sending' && <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 12, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, border: '2px solid #93c5fd', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>Sending email…</div>}
                  {emailStatus === 'sent' && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 12, fontSize: 13, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}><CheckIcon style={{ width: 14, height: 14, flexShrink: 0 }} />Email sent to <strong style={{ marginLeft: 3 }}>{created?.invited_email}</strong></div>}
                  {emailStatus === 'failed' && (
                    <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 12, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                      <strong>Auto-email unavailable</strong> — use the Email button below to send via your email app.
                      <div style={{ marginTop: 6 }}>
                        <button onClick={() => shareEmail(created)} style={{ padding: '5px 12px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                          Open email app →
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => copyLink(created.code)} style={{ width: '100%', padding: '14px 16px', background: copied ? '#f0fdf4' : '#1a3a6b', color: copied ? '#059669' : '#fff', border: copied ? '1.5px solid #bbf7d0' : 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 12, transition: 'all .2s' }}>
                    {copied ? <CheckIcon style={{ width: 18, height: 18 }} /> : <ClipboardDocumentIcon style={{ width: 18, height: 18 }} />}
                    {copied ? 'Copied!' : 'Copy invite link'}
                  </button>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', marginBottom: 14, fontSize: 11, color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all' }}>{inviteLink(created.code)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>Or send via</div>
                  <div style={{ display: 'grid', gridTemplateColumns: canShareNative ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: 'Email', icon: <EnvelopeIcon style={{ width: 20, height: 20, color: '#2563eb' }} />, bg: '#eff6ff', action: () => shareEmail(created) },
                      { label: 'WhatsApp', icon: <ChatBubbleLeftIcon style={{ width: 20, height: 20, color: '#25D366' }} />, bg: '#f0fdf4', action: () => shareWhatsApp(created) },
                      { label: 'SMS', icon: <PhoneIcon style={{ width: 20, height: 20, color: '#64748b' }} />, bg: '#f8fafc', action: () => shareSMS(created) },
                      ...(canShareNative ? [{ label: 'More', icon: <LinkIcon style={{ width: 20, height: 20, color: '#7c3aed' }} />, bg: '#f5f3ff', action: () => shareNative(created) }] : []),
                    ].map(b => (
                      <button key={b.label} onClick={b.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px 8px', background: b.bg, border: '1px solid #e2e8f0', borderRadius: 13, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        {b.icon}{b.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={closeInviteModal} style={{ width: '100%', padding: 13, background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Done</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editModal && (
        <div onClick={e => e.target === e.currentTarget && setEditModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 480 }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Your profile</h3>
              <button onClick={() => setEditModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: '#64748b' }} />
              </button>
            </div>
            <div style={{ padding: '18px 22px 0' }}>
              {/* Avatar preview */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 70, height: 70, borderRadius: 22, background: myForm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26 }}>
                  {[myForm.first_name?.[0], myForm.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* First + Last name side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={LBL}>First name</label>
                    <input value={myForm.first_name} onChange={e => setMyForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Sarah" style={INP} autoFocus />
                  </div>
                  <div>
                    <label style={LBL}>Last name</label>
                    <input value={myForm.last_name} onChange={e => setMyForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Smith" style={INP} />
                  </div>
                </div>
                {/* Relationship */}
                <div>
                  <label style={LBL}>Relationship to children</label>
                  <select value={myForm.relationship} onChange={e => setMyForm(p => ({ ...p, relationship: e.target.value }))} style={SEL}>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{RELATIONSHIP_ICON[r]} {r}</option>)}
                  </select>
                </div>
                {/* Colour */}
                <div>
                  <label style={LBL}>Colour</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setMyForm(p => ({ ...p, color: c }))}
                        style={{ width: 38, height: 38, borderRadius: 11, background: c, border: myForm.color === c ? '3px solid #0f172a' : '2.5px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                <button onClick={saveMe} disabled={saving || !myForm.first_name.trim()}
                  style={{ padding: 14, background: saving || !myForm.first_name.trim() ? '#93c5fd' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: saving || !myForm.first_name.trim() ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE MODAL */}
      {removeTarget && (
        <div onClick={e => e.target === e.currentTarget && setRemoveTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 480 }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Remove from household?</h3>
              <button onClick={() => setRemoveTarget(null)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XMarkIcon style={{ width: 16, height: 16, color: '#64748b' }} />
              </button>
            </div>
            <div style={{ padding: '16px 22px 0' }}>
              <div style={{ display: 'flex', gap: 10, padding: '13px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 13, marginBottom: 18 }}>
                <ExclamationTriangleIcon style={{ flexShrink: 0, marginTop: 1, width: 17, height: 17, color: '#dc2626' }} />
                <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6, margin: 0 }}>
                  <strong>{fullName(removeTarget)}</strong> will lose access to all shared data. You can re-invite them at any time.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRemoveTarget(null)} style={{ flex: 1, padding: 13, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>Cancel</button>
                <button onClick={removeParent} disabled={removing} style={{ flex: 1, padding: 13, background: removing ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: removing ? 'not-allowed' : 'pointer' }}>{removing ? 'Removing…' : 'Remove'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
