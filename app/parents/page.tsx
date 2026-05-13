'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { Pencil, X, UserMinus, Copy, Mail, MessageCircle, Phone, Check, RefreshCw, AlertTriangle, Plus } from 'lucide-react'

interface Member { user_id: string; display_name: string; color: string; role: string }
interface Invite  { id: string; code: string; invited_email: string; expires_at: string }

const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#374151','#db2777']
const INP: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: '#f8fafc', outline: 'none', color: '#0f172a', boxSizing: 'border-box' }
const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' as const }

export default function ParentsPage() {
  const [me,        setMe]        = useState<{ id: string; email: string } | null>(null)
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null)
  const [members,   setMembers]   = useState<Member[]>([])
  const [invites,   setInvites]   = useState<Invite[]>([])
  const [loading,   setLoading]   = useState(true)
  const [err,       setErr]       = useState('')

  // Invite modal
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating,    setCreating]    = useState(false)
  const [created,     setCreated]     = useState<Invite | null>(null)
  const [inviteErr,   setInviteErr]   = useState('')

  // Edit me modal
  const [editModal, setEditModal] = useState(false)
  const [myForm,    setMyForm]    = useState({ display_name: '', color: '#2563eb' })
  const [saving,    setSaving]    = useState(false)

  // Remove modal
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing,     setRemoving]     = useState(false)

  // Toast
  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setErr('Not signed in'); setLoading(false); return }

      const userId = session.user.id
      setMe({ id: userId, email: session.user.email ?? '' })

      const { data: mb, error: mbErr } = await supabase
        .from('household_members').select('household_id').eq('user_id', userId).maybeSingle()
      if (mbErr) { setErr(mbErr.message); setLoading(false); return }
      if (!mb?.household_id) { setLoading(false); return }

      const [{ data: hh }, { data: mems }, { data: invs }] = await Promise.all([
        supabase.from('households').select('id, name').eq('id', mb.household_id).single(),
        supabase.from('household_members').select('user_id, display_name, color, role').eq('household_id', mb.household_id),
        supabase.from('invites').select('id, code, invited_email, expires_at').eq('household_id', mb.household_id).eq('accepted', false).order('created_at', { ascending: false }),
      ])

      setHousehold(hh)
      setMembers(mems ?? [])
      setInvites((invs ?? []) as Invite[])

      const mine = mems?.find(m => m.user_id === userId)
      if (mine) setMyForm({ display_name: mine.display_name, color: mine.color })
    } catch (e: any) {
      setErr(e.message)
    }
    setLoading(false)
  }

  // ── Invite ─────────────────────────────────────────────────────
  async function createInvite() {
    if (!household || !me) return
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { setInviteErr('Enter a valid email address'); return }
    setCreating(true); setInviteErr('')

    const code = Math.random().toString(36).substring(2, 9).toUpperCase()
    const { data: inv, error } = await supabase.from('invites')
      .insert({ household_id: household.id, invited_by: me.id, invited_email: inviteEmail.trim(), code })
      .select().single()

    setCreating(false)
    if (error) { setInviteErr(error.message); return }
    setCreated(inv as Invite)
    load()
  }

  function inviteLink(code: string) {
    if (typeof window === 'undefined') return `https://your-app.vercel.app/invite/${code}`
    return `${window.location.origin}/invite/${code}`
  }

  async function copyLink(code: string) {
    try { await navigator.clipboard.writeText(inviteLink(code)); showToast('Link copied') } catch {}
  }

  function sendEmail(email: string, code: string) {
    const name = me?.email?.split('@')[0] ?? 'Your co-parent'
    const link = inviteLink(code)
    const subject = encodeURIComponent('Join me on CoParent')
    const body = encodeURIComponent(`Hi,\n\n${name} has invited you to join CoParent — a shared expense tracker for your kids.\n\nClick to join: ${link}\n\nExpires in 7 days.`)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  function sendWhatsApp(code: string) {
    const text = encodeURIComponent(`Join me on CoParent to track our shared children's expenses: ${inviteLink(code)}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function sendSMS(code: string) {
    const text = encodeURIComponent(`Join me on CoParent: ${inviteLink(code)}`)
    window.location.href = `sms:?body=${text}`
  }

  async function cancelInvite(id: string) {
    await supabase.from('invites').delete().eq('id', id); load()
  }

  function closeInviteModal() { setInviteModal(false); setCreated(null); setInviteEmail(''); setInviteErr('') }

  // ── Remove parent ───────────────────────────────────────────────
  async function removeParent() {
    if (!removeTarget || !household) return
    setRemoving(true)
    const { error } = await supabase.from('household_members')
      .delete().eq('user_id', removeTarget.user_id).eq('household_id', household.id)
    setRemoving(false)
    if (error) { alert(error.message); return }
    setRemoveTarget(null); load()
  }

  // ── Edit me ─────────────────────────────────────────────────────
  async function saveMe() {
    if (!me || !household) return
    setSaving(true)
    const { error } = await supabase.from('household_members')
      .update({ display_name: myForm.display_name, color: myForm.color })
      .eq('user_id', me.id).eq('household_id', household.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setEditModal(false); load()
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const myInfo   = members.find(m => m.user_id === me?.id)
  const coParent = members.find(m => m.user_id !== me?.id)

  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </Shell>
  )

  if (err) return (
    <Shell>
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: 12 }}>{err}</p>
        <button onClick={load} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Retry</button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, sans-serif' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Household</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{household?.name ?? '—'}</p>
        </div>

        {/* YOU */}
        {myInfo && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>You</div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 15, background: myInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                {myInfo.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{myInfo.display_name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me?.email}</div>
              </div>
              <button onClick={() => setEditModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500, flexShrink: 0 }}>
                <Pencil size={12} /> Edit
              </button>
            </div>
          </div>
        )}

        {/* CO-PARENT */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Co-parent</div>
          {coParent ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 15, background: coParent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                {coParent.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{coParent.display_name}</div>
                <div style={{ fontSize: 12, color: '#059669', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} /> Connected
                </div>
              </div>
              <button onClick={() => setRemoveTarget(coParent)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 500, flexShrink: 0 }}>
                <UserMinus size={12} /> Remove
              </button>
            </div>
          ) : (
            <button onClick={() => { setCreated(null); setInviteEmail(''); setInviteErr(''); setInviteModal(true) }}
              style={{ width: '100%', textAlign: 'left', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <div style={{ width: 50, height: 50, borderRadius: 15, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={22} color="#94a3b8" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#334155' }}>Invite co-parent</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Share a link via email, WhatsApp or SMS</div>
              </div>
            </button>
          )}
        </div>

        {/* PENDING INVITES */}
        {invites.length > 0 && !coParent && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Pending invites</div>
            {invites.map(inv => (
              <div key={inv.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <RefreshCw size={14} color="#b45309" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.invited_email}</div>
                  <div style={{ fontSize: 11, color: '#78350f', marginTop: 1 }}>Waiting · expires {new Date(inv.expires_at).toLocaleDateString('en-AU')}</div>
                </div>
                <button onClick={() => copyLink(inv.code)} style={{ padding: '5px 9px', background: '#fff', border: '1px solid #fde68a', borderRadius: 7, fontSize: 11, color: '#92400e', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <Copy size={10} /> Copy
                </button>
                <button onClick={() => cancelInvite(inv.id)} style={{ padding: '5px 9px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 11, color: '#dc2626', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {/* INFO */}
        <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 12, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
          Both parents see all expenses, children and categories. Only the parent who added an entry can edit or delete it.
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#0f172a', color: '#fff', padding: '9px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <Check size={13} /> {toast}
        </div>
      )}

      {/* INVITE MODAL */}
      {inviteModal && (
        <div onClick={e => e.target === e.currentTarget && closeInviteModal()}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Invite co-parent</h3>
              <button onClick={closeInviteModal} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>

            {!created ? (
              <>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>Enter their email to generate an invite link. You choose how to send it.</p>
                <label style={LBL}>Co-parent email</label>
                <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteErr('') }}
                  onKeyDown={e => e.key === 'Enter' && createInvite()}
                  placeholder="their@email.com" style={{ ...INP, marginBottom: 12 }} autoFocus />
                {inviteErr && <div style={{ padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{inviteErr}</div>}
                <button onClick={createInvite} disabled={creating}
                  style={{ width: '100%', padding: 13, background: creating ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? 'Generating…' : 'Generate invite link'}
                </button>
              </>
            ) : (
              <>
                <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={16} color="#059669" style={{ marginTop: 1, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.5 }}>
                    Invite ready for <strong>{created.invited_email}</strong>. Send the link via:
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Email', icon: <Mail size={18} color="#2563eb" />, action: () => sendEmail(created.invited_email, created.code) },
                    { label: 'WhatsApp', icon: <MessageCircle size={18} color="#25D366" />, action: () => sendWhatsApp(created.code) },
                    { label: 'SMS', icon: <Phone size={18} color="#64748b" />, action: () => sendSMS(created.code) },
                  ].map(b => (
                    <button key={b.label} onClick={b.action}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                      {b.icon}{b.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={LBL}>Or copy link</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inviteLink(created.code)}
                    </div>
                    <button onClick={() => copyLink(created.code)}
                      style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginBottom: 14 }}>
                  Clicking Email, WhatsApp or SMS opens your app with the message pre-filled. The link expires in 7 days.
                </p>

                <button onClick={closeInviteModal}
                  style={{ width: '100%', padding: 12, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT ME MODAL */}
      {editModal && (
        <div onClick={e => e.target === e.currentTarget && setEditModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Your profile</h3>
              <button onClick={() => setEditModal(false)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 68, height: 68, borderRadius: 20, background: myForm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 28 }}>
                {myForm.display_name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LBL}>Your name</label>
                <input value={myForm.display_name} onChange={e => setMyForm(p => ({ ...p, display_name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveMe()}
                  placeholder="Display name" style={INP} autoFocus />
              </div>
              <div>
                <label style={LBL}>Colour</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setMyForm(p => ({ ...p, color: c }))}
                      style={{ width: 36, height: 36, borderRadius: 10, background: c, border: myForm.color === c ? '3px solid #0f172a' : '2.5px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <button onClick={saveMe} disabled={saving || !myForm.display_name.trim()}
                style={{ padding: 13, background: saving || !myForm.display_name.trim() ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving || !myForm.display_name.trim() ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE MODAL */}
      {removeTarget && (
        <div onClick={e => e.target === e.currentTarget && setRemoveTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Remove co-parent</h3>
              <button onClick={() => setRemoveTarget(null)} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 16 }}>
              <AlertTriangle size={17} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6, margin: 0 }}>
                <strong>{removeTarget.display_name}</strong> will be disconnected from this household. Their account is not deleted — they will just lose access to shared data. You can re-invite them at any time.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setRemoveTarget(null)}
                style={{ flex: 1, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#334155' }}>
                Cancel
              </button>
              <button onClick={removeParent} disabled={removing}
                style={{ flex: 1, padding: 12, background: removing ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: removing ? 'not-allowed' : 'pointer' }}>
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
