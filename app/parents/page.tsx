'use client'
import { useEffect, useState, useCallback } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import {
  Pencil, X, UserMinus, Copy, Mail, MessageCircle, Phone,
  Check, RefreshCw, AlertTriangle, Plus, Link as LinkIcon,
} from 'lucide-react'
import { logAudit } from '@/lib/audit'

interface Member { user_id: string; display_name: string; color: string; role: string }
interface Invite  { id: string; code: string; invited_email: string; expires_at: string; accepted: boolean }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#374151','#db2777']

const INP: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0',
  borderRadius: 12, fontSize: 15, background: '#f8fafc',
  outline: 'none', color: '#0f172a', boxSizing: 'border-box',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
  marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' as const,
}

export default function ParentsPage() {
  const [me,        setMe]        = useState<{ id: string; email: string } | null>(null)
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null)
  const [members,   setMembers]   = useState<Member[]>([])
  const [invites,   setInvites]   = useState<Invite[]>([])
  const [loading,   setLoading]   = useState(true)
  const [err,       setErr]       = useState('')

  // Invite flow
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating,    setCreating]    = useState(false)
  const [created,     setCreated]     = useState<Invite | null>(null)
  const [inviteErr,   setInviteErr]   = useState('')
  const [copied,      setCopied]      = useState(false)

  // Edit profile
  const [editModal, setEditModal] = useState(false)
  const [myForm,    setMyForm]    = useState({ display_name: '', color: '#2563eb' })
  const [saving,    setSaving]    = useState(false)

  // Remove
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing,     setRemoving]     = useState(false)

  // Toast
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      // Use getUser() — validates with server, no race on page load
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
        supabase.from('households').select('id, name').eq('id', mb.household_id).single(),
        supabase.from('household_members').select('user_id, display_name, color, role').eq('household_id', mb.household_id),
        supabase.from('invites').select('id, code, invited_email, expires_at, accepted')
          .eq('household_id', mb.household_id).eq('accepted', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ])

      if (hhRes.error)   { setErr(hhRes.error.message); setLoading(false); return }
      if (memsRes.error) { setErr(memsRes.error.message); setLoading(false); return }

      setHousehold(hhRes.data)
      setMembers(memsRes.data ?? [])
      setInvites((invsRes.data ?? []) as Invite[])

      const mine = memsRes.data?.find(m => m.user_id === userId)
      if (mine) setMyForm({ display_name: mine.display_name, color: mine.color })
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Generate invite ─────────────────────────────────────────────
  async function createInvite() {
    if (!household || !me) return
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteErr('Enter a valid email address'); return
    }
    setCreating(true); setInviteErr('')

    // Generate a safe 8-char uppercase alphanumeric code (no special chars that break URLs)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars like 0/O, 1/I
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    const code = Array.from(bytes).map(b => chars[b % chars.length]).join('')

    const { data: inv, error } = await supabase
      .from('invites')
      .insert({
        household_id: household.id,
        invited_by:   me.id,
        invited_email: inviteEmail.trim().toLowerCase(),
        code,
        // expires_at defaults to now() + 7 days in DB
      })
      .select()
      .single()

    setCreating(false)

    if (error) {
      // Surface the real error clearly
      if (error.code === '23505') {
        setInviteErr('An invite for this email already exists. Cancel it first.')
      } else if (error.code === '42501') {
        setInviteErr('Permission denied. Make sure you are part of a household.')
      } else {
        setInviteErr(`Error: ${error.message}`)
      }
      return
    }

    setCreated(inv as Invite)
    await logAudit({
      household_id: household.id, user_id: me.id,
      actor_name: me.email.split('@')[0],
      action: 'parent.invite', entity: inviteEmail.trim(),
    })
    load()
  }

  // ── Link helpers ────────────────────────────────────────────────
  function inviteLink(code: string) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/invite/${code}`
  }

  async function copyLink(code: string) {
    const link = inviteLink(code)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
      showToast('Link copied to clipboard!')
    } catch {
      // Fallback for browsers that block clipboard
      const el = document.createElement('textarea')
      el.value = link; document.body.appendChild(el)
      el.select(); document.execCommand('copy')
      document.body.removeChild(el)
      showToast('Link copied!')
    }
  }

  function shareEmail(inv: Invite) {
    const name = me?.email?.split('@')[0] ?? 'Your co-parent'
    const link = inviteLink(inv.code)
    const subject = encodeURIComponent('You have been invited to CoParent Pay')
    const body = encodeURIComponent(
      `Hi,\n\n${name} has invited you to join CoParent Pay — a shared expense tracker for co-parents.\n\nClick the link below to accept:\n${link}\n\nThe link expires in 7 days.\n\nSee you there!`
    )
    window.open(`mailto:${inv.invited_email}?subject=${subject}&body=${body}`)
  }

  function shareWhatsApp(inv: Invite) {
    const text = encodeURIComponent(
      `Hi! I've invited you to CoParent Pay so we can track our shared children's expenses together. Join here: ${inviteLink(inv.code)}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function shareSMS(inv: Invite) {
    const text = encodeURIComponent(`Join me on CoParent Pay: ${inviteLink(inv.code)}`)
    window.location.href = `sms:?&body=${text}`
  }

  function shareNative(inv: Invite) {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator.share({
        title: 'Join CoParent Pay',
        text: 'Track our shared expenses together',
        url: inviteLink(inv.code),
      }).catch(() => {})
    }
  }

  const canShareNative = typeof navigator !== 'undefined' && 'share' in navigator

  async function cancelInvite(id: string) {
    await supabase.from('invites').delete().eq('id', id)
    load()
  }

  function closeInviteModal() {
    setInviteModal(false); setCreated(null)
    setInviteEmail(''); setInviteErr(''); setCopied(false)
  }

  function openInviteModal() {
    setCreated(null); setInviteEmail(''); setInviteErr(''); setCopied(false)
    setInviteModal(true)
  }

  // ── Remove ──────────────────────────────────────────────────────
  async function removeParent() {
    if (!removeTarget || !household || !me) return
    setRemoving(true)
    const { error } = await supabase.from('household_members')
      .delete().eq('user_id', removeTarget.user_id).eq('household_id', household.id)
    setRemoving(false)
    if (error) { alert(error.message); return }
    await logAudit({
      household_id: household.id, user_id: me.id,
      actor_name: me.email.split('@')[0],
      action: 'parent.remove', entity: removeTarget.display_name,
    })
    setRemoveTarget(null); load()
  }

  // ── Edit profile ────────────────────────────────────────────────
  async function saveMe() {
    if (!me || !household) return
    setSaving(true)
    const { error } = await supabase.from('household_members')
      .update({ display_name: myForm.display_name, color: myForm.color })
      .eq('user_id', me.id).eq('household_id', household.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    await logAudit({
      household_id: household.id, user_id: me.id,
      actor_name: myForm.display_name,
      action: 'profile.edit', entity: myForm.display_name,
    })
    setEditModal(false); load()
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const myInfo   = members.find(m => m.user_id === me?.id)
  const coParent = members.find(m => m.user_id !== me?.id)

  // ── Loading / error states ──────────────────────────────────────
  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#1a3a6b', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </Shell>
  )

  if (err) return (
    <Shell>
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: 12 }}>{err}</p>
        <button onClick={load} style={{ padding: '8px 20px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px', fontFamily: 'system-ui, sans-serif' }}>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Household</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>{household?.name ?? '—'}</p>

        {/* ── YOU ── */}
        {myInfo && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>You</div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: myInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
                {myInfo.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{myInfo.display_name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me?.email}</div>
              </div>
              <button onClick={() => setEditModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                <Pencil size={13} /> Edit
              </button>
            </div>
          </section>
        )}

        {/* ── CO-PARENT ── */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>Co-parent</div>

          {coParent ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: coParent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
                {coParent.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{coParent.display_name}</div>
                <div style={{ fontSize: 12, color: '#059669', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} /> Connected
                </div>
              </div>
              <button onClick={() => setRemoveTarget(coParent)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                <UserMinus size={13} /> Remove
              </button>
            </div>
          ) : (
            <>
              {/* Invite button */}
              <button onClick={openInviteModal}
                style={{ width: '100%', textAlign: 'left', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginBottom: invites.length ? 10 : 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={24} color="#94a3b8" strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#334155' }}>Invite co-parent</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Generate a link and share however you like</div>
                </div>
              </button>

              {/* Pending invites */}
              {invites.map(inv => (
                <div key={inv.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <RefreshCw size={14} color="#b45309" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.invited_email}</div>
                    <div style={{ fontSize: 11, color: '#78350f', marginTop: 1 }}>
                      Pending · expires {new Date(inv.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <button onClick={() => { setCreated(inv); setInviteModal(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', background: '#fff', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                    <LinkIcon size={11} /> Share
                  </button>
                  <button onClick={() => cancelInvite(inv.id)}
                    style={{ padding: '6px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                    Cancel
                  </button>
                </div>
              ))}
            </>
          )}
        </section>

        {/* Info */}
        <div style={{ padding: '13px 15px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 13, fontSize: 13, color: '#1e40af', lineHeight: 1.65 }}>
          Both parents see all expenses, children and categories. Only the parent who added an entry can edit or delete it.
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <Check size={14} color="#4ade80" /> {toast}
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {inviteModal && (
        <div onClick={e => e.target === e.currentTarget && closeInviteModal()}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 520 }}>

            {/* Handle */}
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {created ? 'Share invite link' : 'Invite co-parent'}
              </h3>
              <button onClick={closeInviteModal}
                style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: '16px 22px 0' }}>
              {!created ? (
                /* ── Step 1: Enter email ── */
                <>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: 18, lineHeight: 1.6, margin: '0 0 18px' }}>
                    Enter their email to generate a private invite link. You&apos;ll choose how to send it.
                  </p>
                  <div style={{ marginBottom: 14 }}>
                    <label style={LBL}>Co-parent&apos;s email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => { setInviteEmail(e.target.value); setInviteErr('') }}
                      onKeyDown={e => e.key === 'Enter' && createInvite()}
                      placeholder="their@email.com"
                      style={INP}
                      autoFocus
                    />
                  </div>
                  {inviteErr && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {inviteErr}
                    </div>
                  )}
                  <button onClick={createInvite} disabled={creating || !inviteEmail.trim()}
                    style={{ width: '100%', padding: 14, background: creating || !inviteEmail.trim() ? '#93c5fd' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: creating || !inviteEmail.trim() ? 'not-allowed' : 'pointer' }}>
                    {creating ? 'Generating…' : 'Generate invite link →'}
                  </button>
                </>
              ) : (
                /* ── Step 2: Share the link ── */
                <>
                  {/* Success banner */}
                  <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Check size={16} color="#059669" style={{ marginTop: 1, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.5 }}>
                      Link created for <strong>{created.invited_email}</strong>. Valid for 7 days. Choose how to send it:
                    </div>
                  </div>

                  {/* ── BIG COPY BUTTON — most important action ── */}
                  <button onClick={() => copyLink(created.code)}
                    style={{ width: '100%', padding: '14px 16px', background: copied ? '#f0fdf4' : '#1a3a6b', color: copied ? '#059669' : '#fff', border: copied ? '1.5px solid #bbf7d0' : 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 16, transition: 'all .2s' }}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied!' : 'Copy invite link'}
                  </button>

                  {/* Link preview */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 13px', marginBottom: 16, fontSize: 11, color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {inviteLink(created.code)}
                  </div>

                  {/* Share via apps */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>Or send via</div>
                  <div style={{ display: 'grid', gridTemplateColumns: canShareNative ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
                    {[
                      { label: 'Email',     icon: <Mail size={20} color="#2563eb" />,     bg: '#eff6ff', action: () => shareEmail(created)    },
                      { label: 'WhatsApp',  icon: <MessageCircle size={20} color="#25D366" />, bg: '#f0fdf4', action: () => shareWhatsApp(created) },
                      { label: 'SMS',       icon: <Phone size={20} color="#64748b" />,    bg: '#f8fafc', action: () => shareSMS(created)      },
                      ...(canShareNative ? [{ label: 'More', icon: <LinkIcon size={20} color="#7c3aed" />, bg: '#f5f3ff', action: () => shareNative(created) }] : []),
                    ].map(b => (
                      <button key={b.label} onClick={b.action}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px 8px', background: b.bg, border: '1px solid #e2e8f0', borderRadius: 13, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        {b.icon}{b.label}
                      </button>
                    ))}
                  </div>

                  <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.55, marginBottom: 16 }}>
                    Your co-parent will create their own account when they click the link. Once they join, you&apos;ll both see all shared expenses.
                  </p>

                  <button onClick={closeInviteModal}
                    style={{ width: '100%', padding: 13, background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE MODAL ── */}
      {editModal && (
        <div onClick={e => e.target === e.currentTarget && setEditModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 480 }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Your profile</h3>
              <button onClick={() => setEditModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ padding: '18px 22px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 70, height: 70, borderRadius: 22, background: myForm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 28 }}>
                  {myForm.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={LBL}>Your name</label>
                  <input value={myForm.display_name}
                    onChange={e => setMyForm(p => ({ ...p, display_name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveMe()}
                    placeholder="Display name" style={INP} autoFocus />
                </div>
                <div>
                  <label style={LBL}>Colour</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setMyForm(p => ({ ...p, color: c }))}
                        style={{ width: 38, height: 38, borderRadius: 11, background: c, border: myForm.color === c ? '3px solid #0f172a' : '2.5px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                <button onClick={saveMe} disabled={saving || !myForm.display_name.trim()}
                  style={{ padding: 14, background: saving || !myForm.display_name.trim() ? '#93c5fd' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: saving || !myForm.display_name.trim() ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE MODAL ── */}
      {removeTarget && (
        <div onClick={e => e.target === e.currentTarget && setRemoveTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '0 0 32px', width: '100%', maxWidth: 480 }}>
            <div style={{ width: 36, height: 4, background: '#e2e8f0', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Remove co-parent?</h3>
              <button onClick={() => setRemoveTarget(null)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ padding: '16px 22px 0' }}>
              <div style={{ display: 'flex', gap: 10, padding: '13px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 13, marginBottom: 18 }}>
                <AlertTriangle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6, margin: 0 }}>
                  <strong>{removeTarget.display_name}</strong> will lose access to all shared data. Their account is not deleted — you can re-invite them at any time.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRemoveTarget(null)}
                  style={{ flex: 1, padding: 13, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
                <button onClick={removeParent} disabled={removing}
                  style={{ flex: 1, padding: 13, background: removing ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: removing ? 'not-allowed' : 'pointer' }}>
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
