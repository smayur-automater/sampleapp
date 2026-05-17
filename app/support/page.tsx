'use client'
import { useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

export default function SupportPage() {
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  const F = (k: Partial<typeof form>) => setForm(p=>({...p,...k}))

  async function submit() {
    if (!form.name.trim()||!form.email.trim()||!form.subject.trim()||!form.message.trim()) {
      setErr('Please fill in all fields'); return
    }
    if (!form.email.includes('@')) { setErr('Enter a valid email address'); return }
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/support', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error||'Failed to send'); setSending(false); return }
      setSent(true)
    } catch { setErr('Could not send — please email info@xfiniti.com.au directly') }
    setSending(false)
  }

  const INP: React.CSSProperties = { width:'100%', padding:'12px 14px', border:'1.5px solid #e2e8f0', borderRadius:11, fontSize:15, color:'#0f172a', background:'#f8fafc', outline:'none', boxSizing:'border-box' }
  const LBL: React.CSSProperties = { display:'block', fontSize:11, fontWeight:700, color:'#64748b', marginBottom:6, letterSpacing:'0.07em', textTransform:'uppercase' }

  return (
    <Shell>
      <div style={{maxWidth:560,margin:'0 auto',padding:'24px 16px 48px',fontFamily:'system-ui,sans-serif'}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a',margin:'0 0 6px'}}>Support</h1>
        <p style={{fontSize:14,color:'#64748b',margin:'0 0 24px',lineHeight:1.6}}>
          Have a question or issue? Fill out the form below and we&apos;ll get back to you within 24 hours.
        </p>

        {sent ? (
          <div style={{background:'#f0fdf4',border:'2px solid #bbf7d0',borderRadius:16,padding:'40px 32px',textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>✅</div>
            <div style={{fontSize:20,fontWeight:800,color:'#059669',marginBottom:8}}>Message sent!</div>
            <p style={{fontSize:14,color:'#64748b',lineHeight:1.6,marginBottom:20}}>
              Thanks for reaching out. We&apos;ll reply to <strong>{form.email}</strong> within 24 hours.
            </p>
            <button onClick={()=>{setSent(false);setForm({name:'',email:'',subject:'',message:''})}}
              style={{padding:'10px 20px',background:'#0f172a',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
              Send another message
            </button>
          </div>
        ) : (
          <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={LBL}>Your name</label>
                  <input value={form.name} onChange={e=>F({name:e.target.value})} placeholder="Sarah Smith" style={INP}/>
                </div>
                <div>
                  <label style={LBL}>Your email</label>
                  <input type="email" value={form.email} onChange={e=>F({email:e.target.value})} placeholder="you@example.com" style={INP}/>
                </div>
              </div>
              <div>
                <label style={LBL}>Subject</label>
                <select value={form.subject} onChange={e=>F({subject:e.target.value})} style={{...INP,cursor:'pointer',color:form.subject?'#0f172a':'#94a3b8'}}>
                  <option value="">Select a topic…</option>
                  <option>Account & Login</option>
                  <option>Inviting a co-parent</option>
                  <option>Adding expenses</option>
                  <option>Settlement & approvals</option>
                  <option>Premium plan</option>
                  <option>Bug report</option>
                  <option>Feature request</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Message</label>
                <textarea value={form.message} onChange={e=>F({message:e.target.value})} placeholder="Describe your question or issue in detail…"
                  style={{...INP,minHeight:140,resize:'vertical',fontFamily:'inherit'}}/>
              </div>
              {err&&<div style={{padding:'10px 14px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,fontSize:13,color:'#dc2626'}}>{err}</div>}
              <button onClick={submit} disabled={sending}
                style={{padding:14,background:sending?'#94a3b8':'#0f172a',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:sending?'not-allowed':'pointer'}}>
                {sending?'Sending…':'Send message →'}
              </button>
            </div>
          </div>
        )}

        {/* Direct contact */}
        <div style={{marginTop:24,padding:'16px 18px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,display:'flex',gap:12,alignItems:'flex-start'}}>
          <span style={{fontSize:20}}>📧</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'#0f172a',marginBottom:2}}>Direct contact</div>
            <div style={{fontSize:13,color:'#64748b'}}>You can also email us directly at <a href="mailto:info@xfiniti.com.au" style={{color:'#1a3a6b',fontWeight:600}}>info@xfiniti.com.au</a></div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
