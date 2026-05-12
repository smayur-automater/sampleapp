'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { Plus, X, Pencil, UserMinus, Copy, Mail, MessageCircle, Phone, Check, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react'

interface Member { user_id: string; display_name: string; color: string; role: string }
interface Invite  { id: string; code: string; invited_email: string; expires_at: string }

const COLORS = ['#1e3a5f','#0d5c4d','#3730a3','#6b21a8','#7f1d1d','#1e3a8a','#064e3b','#374151']

export default function ParentsPage() {
  const [me,        setMe]        = useState<{ id: string; email: string } | null>(null)
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null)
  const [members,   setMembers]   = useState<Member[]>([])
  const [invites,   setInvites]   = useState<Invite[]>([])
  const [loading,   setLoading]   = useState(true)

  const [inviteModal, setInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating,    setCreating]    = useState(false)
  const [created,     setCreated]     = useState<Invite | null>(null)
  const [inviteErr,   setInviteErr]   = useState('')

  const [editModal,   setEditModal]   = useState(false)
  const [myForm,      setMyForm]      = useState({ display_name:'', color:'#1e3a5f' })
  const [savingMe,    setSavingMe]    = useState(false)

  const [removeModal, setRemoveModal] = useState<Member | null>(null)
  const [removing,    setRemoving]    = useState(false)

  const [toast, setToast] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) return
    setMe({ id: user.id, email: user.email ?? '' })

    const { data: mb } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle()
    if (!mb?.household_id) { setLoading(false); return }

    const [{ data: hh }, { data: mems }, { data: invs }] = await Promise.all([
      supabase.from('households').select('*').eq('id', mb.household_id).single(),
      supabase.from('household_members').select('*').eq('household_id', mb.household_id),
      supabase.from('invites').select('*').eq('household_id', mb.household_id).eq('accepted', false).order('created_at', { ascending: false }),
    ])

    setHousehold(hh)
    setMembers(mems ?? [])
    setInvites((invs ?? []) as Invite[])

    const my = mems?.find(m => m.user_id === user.id)
    if (my) setMyForm({ display_name: my.display_name, color: my.color })
    setLoading(false)
  }

  async function createInvite() {
    if (!household || !me) return
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { setInviteErr('Enter a valid email'); return }
    setCreating(true); setInviteErr('')
    const code = Math.random().toString(36).substring(2, 9).toUpperCase()
    const { data: inv, error } = await supabase.from('invites')
      .insert({ household_id: household.id, invited_by: me.id, invited_email: inviteEmail.trim(), code })
      .select().single()
    setCreating(false)
    if (error) { setInviteErr('Could not create invite: ' + error.message); return }
    setCreated(inv as Invite)
    load()
  }

  async function cancelInvite(id: string) {
    await supabase.from('invites').delete().eq('id', id); load()
  }

  async function removeParent(member: Member) {
    setRemoving(true)
    // Remove from household_members only — user account stays intact
    await supabase.from('household_members').delete().eq('user_id', member.user_id).eq('household_id', household!.id)
    setRemoving(false); setRemoveModal(null); load()
  }

  async function saveMe() {
    if (!me || !household) return
    setSavingMe(true)
    await supabase.from('household_members').update(myForm).eq('user_id', me.id).eq('household_id', household.id)
    setSavingMe(false); setEditModal(false); load()
  }

  function inviteLink(code: string) {
    return `${window.location.origin}/invite/${code}`
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(code))
      showToast('Link copied')
    } catch {}
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function sendViaEmail(email: string, code: string) {
    const link = inviteLink(code)
    const name = me?.email?.split('@')[0] ?? 'Your co-parent'
    const subject = encodeURIComponent('Join me on CoParent')
    const body = encodeURIComponent(
      `Hi,\n\n${name} has invited you to join their CoParent household — a shared expense tracker for your kids.\n\nClick the link below to join:\n${link}\n\nThis invite expires in 7 days.\n\nSee you there!`
    )
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }

  function sendViaWhatsApp(code: string) {
    const text = encodeURIComponent(`You've been invited to join CoParent to track our shared children's expenses together.\n\nJoin here: ${inviteLink(code)}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function sendViaSMS(code: string) {
    const text = encodeURIComponent(`Join me on CoParent: ${inviteLink(code)}`)
    window.location.href = `sms:?body=${text}`
  }

  function closeInviteModal() {
    setInviteModal(false); setCreated(null); setInviteEmail(''); setInviteErr('')
  }

  const myInfo   = members.find(m => m.user_id === me?.id)
  const coParent = members.find(m => m.user_id !== me?.id)

  // Styles
  const card: React.CSSProperties = { background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius-lg)', padding:'16px', display:'flex', alignItems:'center', gap:14, boxShadow:'var(--shadow-sm)' }
  const inp: React.CSSProperties  = { width:'100%', padding:'10px 14px', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:14, background:'var(--slate-50)', outline:'none', color:'var(--slate-900)' }
  const lbl: React.CSSProperties  = { fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:5, display:'block', letterSpacing:'0.06em', textTransform:'uppercase' as const }
  const shareBtn: React.CSSProperties = { flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 0', background:'var(--white)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:13, fontWeight:600, color:'var(--slate-700)', cursor:'pointer' }
  const sectionLbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--slate-400)', letterSpacing:'0.07em', textTransform:'uppercase' as const, marginBottom:8, paddingLeft:2 }

  return (
    <Shell>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--slate-900)', letterSpacing:'-0.5px' }}>Household</h1>
          <p style={{ fontSize:13, color:'var(--slate-500)', marginTop:2 }}>{household?.name ?? 'Loading…'}</p>
        </div>

        {loading ? <div style={{ textAlign:'center', padding:48, color:'var(--slate-400)' }}>Loading…</div> : (<>

          {/* YOU */}
          {myInfo && (<>
            <p style={sectionLbl}>You</p>
            <div style={{ ...card, marginBottom:12 }}>
              <Avatar name={myInfo.display_name} color={myInfo.color} size={48} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16, color:'var(--slate-900)' }}>{myInfo.display_name}</div>
                <div style={{ fontSize:12, color:'var(--slate-400)', marginTop:1 }}>{me?.email}</div>
              </div>
              <button onClick={() => setEditModal(true)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:8, fontSize:12, color:'var(--slate-600)', cursor:'pointer', fontWeight:500 }}>
                <Pencil size={11} /> Edit
              </button>
            </div>
          </>)}

          {/* CO-PARENT */}
          <p style={{ ...sectionLbl, marginTop:12 }}>Co-parent</p>
          {coParent ? (
            <div style={{ ...card, marginBottom:12 }}>
              <Avatar name={coParent.display_name} color={coParent.color} size={48} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16, color:'var(--slate-900)' }}>{coParent.display_name}</div>
                <div style={{ fontSize:12, color:'var(--green)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)' }} /> Connected
                </div>
              </div>
              <button onClick={() => setRemoveModal(coParent)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'var(--red-light)', border:'1px solid #fecaca', borderRadius:8, fontSize:12, color:'var(--red)', cursor:'pointer', fontWeight:500 }}>
                <UserMinus size={11} /> Remove
              </button>
            </div>
          ) : (
            <button onClick={() => setInviteModal(true)}
              style={{ width:'100%', textAlign:'left', background:'var(--white)', border:'2px dashed var(--slate-200)', borderRadius:'var(--radius-lg)', padding:'16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', marginBottom:12 }}>
              <div style={{ width:48, height:48, borderRadius:'var(--radius-lg)', background:'var(--slate-100)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--slate-400)', fontSize:22, fontWeight:700, flexShrink:0 }}>
                <Plus size={22} strokeWidth={1.8} color="var(--slate-400)" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15, color:'var(--slate-700)' }}>Invite co-parent</div>
                <div style={{ fontSize:12, color:'var(--slate-400)', marginTop:1 }}>Share a link via email, WhatsApp, or SMS</div>
              </div>
              <ExternalLink size={16} color="var(--slate-300)" />
            </button>
          )}

          {/* PENDING INVITES */}
          {invites.length > 0 && !coParent && (<>
            <p style={{ ...sectionLbl, marginTop:12 }}>Pending invites</p>
            {invites.map(inv => (
              <div key={inv.id} style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'var(--radius)', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <RefreshCw size={15} color="#b45309" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#92400e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.invited_email}</div>
                  <div style={{ fontSize:11, color:'#78350f', marginTop:1 }}>Waiting · expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => copyLink(inv.code)}
                  style={{ padding:'5px 10px', background:'var(--white)', border:'1px solid #fde68a', borderRadius:7, fontSize:11, color:'#92400e', cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
                  <Copy size={10} /> Copy
                </button>
                <button onClick={() => cancelInvite(inv.id)}
                  style={{ padding:'5px 10px', background:'var(--red-light)', border:'1px solid #fecaca', borderRadius:7, fontSize:11, color:'var(--red)', cursor:'pointer', fontWeight:600 }}>
                  Cancel
                </button>
              </div>
            ))}
          </>)}

          {/* INFO */}
          <div style={{ marginTop:20, padding:'13px 15px', background:'var(--blue-light)', border:'1px solid var(--blue-muted)', borderRadius:'var(--radius)', fontSize:13, color:'#1e40af', lineHeight:1.6 }}>
            Both parents see all expenses, children, and categories. Only the parent who added an entry can edit or delete it.
          </div>

        </>)}
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:500, background:'var(--slate-900)', color:'var(--white)', padding:'9px 16px', borderRadius:99, fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
          <Check size={13} /> {toast}
        </div>
      )}

      {/* INVITE MODAL */}
      {inviteModal && (
        <Modal onClose={closeInviteModal} title="Invite co-parent">
          {!created ? (<>
            <p style={{ fontSize:13, color:'var(--slate-500)', marginBottom:16, lineHeight:1.6 }}>
              Enter their email, then choose how to send the invite link.
            </p>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Co-parent&apos;s email</label>
              <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteErr('') }}
                onKeyDown={e => e.key === 'Enter' && createInvite()}
                placeholder="their@email.com" style={inp} autoFocus />
            </div>
            {inviteErr && <ErrBox text={inviteErr} />}
            <button onClick={createInvite} disabled={creating}
              style={{ width:'100%', padding:13, background: creating ? '#93c5fd' : 'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor: creating ? 'not-allowed' : 'pointer' }}>
              {creating ? 'Generating…' : 'Generate invite link'}
            </button>
          </>) : (<>
            <div style={{ padding:'13px 14px', background:'var(--green-light)', border:'1px solid #bbf7d0', borderRadius:'var(--radius)', marginBottom:20, display:'flex', alignItems:'flex-start', gap:10 }}>
              <Check size={16} color="var(--green)" style={{ marginTop:1, flexShrink:0 }} />
              <div style={{ fontSize:13, color:'#065f46', lineHeight:1.5 }}>
                Invite created for <strong>{created.invited_email}</strong>. Choose how to send the link:
              </div>
            </div>

            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <button onClick={() => sendViaEmail(created.invited_email, created.code)} style={shareBtn}>
                <Mail size={16} color="#2563eb" /> Email
              </button>
              <button onClick={() => sendViaWhatsApp(created.code)} style={shareBtn}>
                <MessageCircle size={16} color="#25D366" /> WhatsApp
              </button>
              <button onClick={() => sendViaSMS(created.code)} style={shareBtn}>
                <Phone size={16} color="var(--slate-500)" /> SMS
              </button>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Or copy link manually</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, padding:'10px 12px', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:11, color:'var(--slate-500)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {inviteLink(created.code)}
                </div>
                <button onClick={() => copyLink(created.code)}
                  style={{ padding:'10px 14px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', cursor:'pointer', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>

            <p style={{ fontSize:12, color:'var(--slate-400)', lineHeight:1.5, marginBottom:16 }}>
              Clicking <strong>Email</strong> opens your mail app with the message pre-filled — you&apos;ll hit send from your own inbox. WhatsApp and SMS work the same way.
            </p>

            <button onClick={closeInviteModal}
              style={{ width:'100%', padding:12, background:'var(--slate-50)', color:'var(--slate-700)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Done
            </button>
          </>)}
        </Modal>
      )}

      {/* EDIT ME MODAL */}
      {editModal && (
        <Modal onClose={() => setEditModal(false)} title="Your profile">
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <Avatar name={myForm.display_name || '?'} color={myForm.color} size={72} radius={20} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:5, display:'block', letterSpacing:'0.06em', textTransform:'uppercase' as const }}>Your name</label>
              <input value={myForm.display_name} onChange={e => setMyForm({ ...myForm, display_name: e.target.value })} placeholder="Display name" style={inp} autoFocus />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:5, display:'block', letterSpacing:'0.06em', textTransform:'uppercase' as const }}>Color</label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {COLORS.map(c => <button key={c} type="button" onClick={() => setMyForm({ ...myForm, color: c })} style={{ width:32, height:32, borderRadius:9, background:c, border: myForm.color === c ? '3px solid var(--slate-900)' : '2px solid transparent', cursor:'pointer' }} />)}
              </div>
            </div>
            <button onClick={saveMe} disabled={savingMe || !myForm.display_name.trim()}
              style={{ padding:13, background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:'pointer', opacity: (savingMe || !myForm.display_name.trim()) ? 0.5 : 1 }}>
              {savingMe ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* REMOVE PARENT MODAL */}
      {removeModal && (
        <Modal onClose={() => setRemoveModal(null)} title="Remove co-parent">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'var(--radius)' }}>
              <AlertTriangle size={18} color="var(--red)" style={{ flexShrink:0 }} />
              <div style={{ fontSize:13, color:'#7f1d1d', lineHeight:1.5 }}>
                <strong>{removeModal.display_name}</strong> will be disconnected from this household. Their account stays intact but they&apos;ll lose access to shared data.
              </div>
            </div>
            <p style={{ fontSize:13, color:'var(--slate-500)', lineHeight:1.5 }}>
              Their expenses, kids, and categories they created will remain visible. You can re-invite them at any time.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setRemoveModal(null)}
                style={{ flex:1, padding:12, background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor:'pointer', color:'var(--slate-700)' }}>
                Cancel
              </button>
              <button onClick={() => removeParent(removeModal)} disabled={removing}
                style={{ flex:1, padding:12, background:'var(--red)', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, cursor: removing ? 'not-allowed' : 'pointer', color:'#fff', opacity: removing ? 0.6 : 1 }}>
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  )
}

// ── Shared small components ──────────────────────────────────────────

function Avatar({ name, color, size, radius }: { name: string; color: string; size: number; radius?: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius: radius ?? 14, background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize: size * 0.38, flexShrink:0 }}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--white)', borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:640, maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--slate-900)' }}>{title}</h3>
          <button onClick={onClose} style={{ width:32, height:32, background:'var(--slate-100)', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={15} color="var(--slate-500)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrBox({ text }: { text: string }) {
  return <div style={{ padding:'9px 12px', background:'var(--red-light)', border:'1px solid #fecaca', borderRadius:'var(--radius-sm)', fontSize:13, color:'var(--red)', marginBottom:12 }}>{text}</div>
}
