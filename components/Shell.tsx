'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Users, Baby, Tag, LogOut } from 'lucide-react'

const TABS = [
  { path: '/dashboard', label: 'Home',       Icon: LayoutDashboard },
  { path: '/kids',      label: 'Kids',        Icon: Baby },
  { path: '/parents',   label: 'Parents',     Icon: Users },
  { path: '/categories',label: 'Categories',  Icon: Tag },
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/')
      else setReady(true)
    })
  }, [router])

  if (!ready) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--slate-50)' }}>
      <div style={{ width:28, height:28, border:'2.5px solid var(--slate-200)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--slate-50)' }}>
      {/* Header */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:56, background:'var(--white)', borderBottom:'1px solid var(--slate-200)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, background:'var(--blue)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Users size={16} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--slate-900)', letterSpacing:'-0.3px' }}>CoParent</span>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/') }}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', border:'1px solid var(--slate-200)', borderRadius:8, background:'var(--white)', fontSize:13, color:'var(--slate-500)', cursor:'pointer', fontWeight:500 }}>
          <LogOut size={13} />
          Sign out
        </button>
      </header>

      <main style={{ paddingTop:56, paddingBottom:68, minHeight:'100vh' }}>{children}</main>

      {/* Bottom nav */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100, height:68, background:'var(--white)', borderTop:'1px solid var(--slate-200)', display:'flex' }}>
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => router.push(path)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, border:'none', background:'none', cursor:'pointer', color: active ? 'var(--blue)' : 'var(--slate-400)', position:'relative' }}>
              {active && <div style={{ position:'absolute', top:0, width:28, height:2, background:'var(--blue)', borderRadius:'0 0 3px 3px' }} />}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize:10, fontWeight: active ? 700 : 400, letterSpacing:'0.03em' }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
