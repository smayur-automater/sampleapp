'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Stats { total_users:number;total_households:number;total_kids:number;total_expenses:number;total_spend:number;linked_households:number;pending_invites:number;new_users_7d:number;new_expenses_7d:number;expenses_by_day:{day:string;count:number;amount:number}[] }
interface Household { id:string;name:string;created_at:string;member_count:number;kid_count:number;expense_count:number;total_spend:number;last_expense_at:string|null;members:{user_id:string;display_name:string;color:string;role:string;joined_at:string}[] }
interface User { id:string;email:string;created_at:string;last_sign_in_at:string|null;email_confirmed_at:string|null;display_name:string|null;color:string|null;role:string|null;household_id:string|null;household_name:string|null;expense_count:number;total_spend:number;plan:string|null;plan_assigned_at:string|null;phone:string|null;country:string|null }
interface HouseholdDetail { household:{id:string;name:string;created_at:string};members:{user_id:string;display_name:string;color:string;role:string;joined_at:string;email:string}[];kids:{id:string;name:string;dob:string|null;color:string}[]|null;expenses:{id:string;description:string;amount:number;currency:string;date:string;settlement_status:string;kid_name:string;category_name:string;creator_email:string;created_at:string}[]|null;invites:{id:string;invited_email:string;accepted:boolean;expires_at:string}[]|null }
interface AdminUser { id:string;user_id:string;email:string;created_at:string }
type View='dashboard'|'users'|'households'|'admins'|'plans'

const P:React.CSSProperties={minHeight:'100vh',background:'#0f172a',fontFamily:'system-ui,-apple-system,sans-serif',color:'#e2e8f0',display:'flex'}
const SB:React.CSSProperties={position:'fixed',top:0,left:0,bottom:0,width:220,background:'#1e293b',borderRight:'1px solid #334155',display:'flex',flexDirection:'column',zIndex:100}
const MN:React.CSSProperties={marginLeft:220,flex:1,padding:'28px 32px',minHeight:'100vh'}
const CD:React.CSSProperties={background:'#1e293b',border:'1px solid #334155',borderRadius:8,padding:20}
const INP:React.CSSProperties={width:'100%',padding:'9px 12px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,fontSize:13,color:'#e2e8f0',outline:'none',boxSizing:'border-box'}
const TH:React.CSSProperties={padding:'9px 12px',fontSize:10,fontWeight:700,color:'#64748b',letterSpacing:'0.07em',textTransform:'uppercase',textAlign:'left',borderBottom:'1px solid #334155'}
const TD:React.CSSProperties={padding:'10px 12px',fontSize:12,color:'#cbd5e1',borderBottom:'1px solid #1e293b',verticalAlign:'middle'}
const badge=(c:string)=>({padding:'2px 7px',borderRadius:3,background:c+'22',color:c,fontSize:11,fontWeight:600,display:'inline-block'})
const fmt=(n:number)=>`$${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')}`
const fd=(d:string|null)=>d?new Date(d).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'}):'—'
const ft=(d:string|null)=>d?new Date(d).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'
const fa=(d:string|null)=>{if(!d)return'never';const x=Math.floor((Date.now()-new Date(d).getTime())/86400000);if(x===0)return'today';if(x===1)return'yesterday';if(x<30)return`${x}d ago`;return fd(d)}

export default function AdminPage() {
  const router=useRouter()
  const [authed,setAuthed]=useState<boolean|null>(null)
  const [adminEmail,setAdminEmail]=useState('')
  const [view,setView]=useState<View>('dashboard')
  const [stats,setStats]=useState<Stats|null>(null)
  const [households,setHouseholds]=useState<Household[]>([])
  const [users,setUsers]=useState<User[]>([])
  const [admins,setAdmins]=useState<AdminUser[]>([])
  const [loading,setLoading]=useState(false)
  const [search,setSearch]=useState('')
  const [planFilter,setPlanFilter]=useState<'all'|'free'|'premium'>('all')
  const [detail,setDetail]=useState<HouseholdDetail|null>(null)
  const [detailLoading,setDetailLoading]=useState(false)
  const [confirm,setConfirm]=useState<{msg:string;action:()=>void}|null>(null)
  const [toast,setToast]=useState('')
  const [expandedUser,setExpandedUser]=useState<string|null>(null)
  const [newAdminEmail,setNewAdminEmail]=useState('')
  const [pwModal,setPwModal]=useState<{uid:string;email:string}|null>(null)
  const [newPw,setNewPw]=useState('')
  const [pwLoading,setPwLoading]=useState(false)
  const [expFilter,setExpFilter]=useState('all')

  useEffect(()=>{supabase.auth.getUser().then(async({data:{user}})=>{if(!user){router.replace('/admin-login');return};const{data}=await supabase.rpc('is_admin');if(!data){router.replace('/admin-login');return};setAdminEmail(user.email??'');setAuthed(true)})},[router])
  useEffect(()=>{if(authed)loadView()},[authed,view]) // eslint-disable-line

  async function loadView(){
    setLoading(true)
    try{
      if(view==='dashboard'||view==='plans'){const[sr,ur]=await Promise.all([supabase.rpc('admin_get_stats'),supabase.rpc('admin_get_users')]);setStats(sr.data);setUsers(ur.data??[])}
      else if(view==='households'){const{data}=await supabase.rpc('admin_get_households');setHouseholds(data??[])}
      else if(view==='users'){const{data}=await supabase.rpc('admin_get_users');setUsers(data??[])}
      else if(view==='admins'){const{data}=await supabase.from('admins').select('id,user_id,email,created_at').order('created_at');setAdmins(data??[])}
    }catch(e){console.error(e)}
    setLoading(false)
  }

  async function loadDetail(hhId:string){
    setDetailLoading(true);setDetail(null)
    try{
      const{data,error}=await supabase.rpc('admin_get_household_detail',{hh_id:hhId})
      if(error){console.error('detail:',error.message);setDetailLoading(false);return}
      if(data){data.members=data.members??[];data.kids=data.kids??[];data.expenses=data.expenses??[];data.invites=data.invites??[]}
      setDetail(data)
    }catch(e){console.error(e)}
    setDetailLoading(false)
  }

  const ask=(msg:string,action:()=>void)=>setConfirm({msg,action})
  const showT=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),3500)}

  async function setPlan(uid:string,plan:'free'|'premium',name:string){ask(`Set ${name} to ${plan}?`,async()=>{const{error}=await supabase.rpc('admin_set_plan',{uid,new_plan:plan});if(error){showT('Error: '+error.message);return};loadView();showT(`${name} → ${plan}`)})}
  async function deleteUser(uid:string,email:string){ask(`Delete "${email}" permanently?`,async()=>{const{error}=await supabase.rpc('admin_delete_user',{uid});if(error){showT('Error: '+error.message);return};loadView();showT('Deleted')})}
  async function deleteHousehold(id:string,name:string){ask(`Delete household "${name}" and all data?`,async()=>{await supabase.rpc('admin_delete_household',{hh_id:id});setDetail(null);loadView();showT('Household deleted')})}
  async function removeMember(hhId:string,uid:string,name:string){ask(`Remove ${name}?`,async()=>{await supabase.rpc('admin_remove_member',{hh_id:hhId,uid});loadDetail(hhId);showT('Removed')})}
  async function deleteExpense(expId:string,desc:string,hhId:string){ask(`Delete "${desc}"?`,async()=>{await supabase.rpc('admin_delete_expense',{expense_id:expId});loadDetail(hhId);showT('Deleted')})}

  async function addAdmin(){
    if(!newAdminEmail.trim()||!newAdminEmail.includes('@')){showT('Enter a valid email');return}
    const{data:allUsers}=await supabase.rpc('admin_get_users')
    const target=(allUsers??[]).find((u:User)=>u.email.toLowerCase()===newAdminEmail.toLowerCase().trim())
    if(!target){showT('User not found — they must have a CoParent Pay account first');return}
    const{error}=await supabase.from('admins').insert({user_id:target.id,email:target.email})
    if(error){showT(error.message.includes('duplicate')?'Already an admin':'Error: '+error.message);return}
    setNewAdminEmail('');loadView();showT(`${target.email} is now an admin`)
  }

  async function removeAdmin(id:string,email:string){
    if(email===adminEmail){showT('You cannot remove yourself');return}
    ask(`Remove admin access from ${email}?`,async()=>{await supabase.from('admins').delete().eq('id',id);loadView();showT('Admin removed')})
  }

  async function changePassword(){
    if(!pwModal||!newPw||newPw.length<6){showT('Min 6 characters');return}
    setPwLoading(true)
    const{error}=await supabase.rpc('admin_change_password',{target_uid:pwModal.uid,new_password:newPw})
    setPwLoading(false)
    if(error){showT('Error: '+error.message);return}
    setPwModal(null);setNewPw('');showT('Password updated')
  }

  function exportCSV(rows:any[],filename:string){
    if(!rows.length)return
    const keys=Object.keys(rows[0])
    const csv=[keys,...rows.map(r=>keys.map(k=>String(r[k]??'').replace(/"/g,'""')))].map(row=>row.map(v=>`"${v}"`).join(',')).join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=filename;a.click()
  }

  function exportPDF(d:HouseholdDetail){
    const w=window.open('','_blank')!;const exps=d.expenses??[]
    w.document.write(`<!DOCTYPE html><html><head><title>Report</title><style>body{font-family:sans-serif;padding:32px;font-size:12px}h1{font-size:18px}h2{font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin:20px 0 8px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:6px 8px;font-size:10px;font-weight:700;color:#9ca3af;border-bottom:1px solid #e5e7eb}td{padding:7px 8px;border-bottom:1px solid #f3f4f6;font-size:11px}.footer{margin-top:24px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}@media print{body{padding:0}}</style></head><body>
<h1>${d.household.name} — Household Report</h1><p style="color:#9ca3af;margin:0">Generated ${new Date().toLocaleString('en-AU')} · CoParent Pay Admin</p>
<h2>Members</h2><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${d.members.map(m=>`<tr><td>${m.display_name}</td><td>${m.email}</td><td>${m.role}</td><td>${fd(m.joined_at)}</td></tr>`).join('')}</tbody></table>
<h2>Children</h2><table><thead><tr><th>Name</th><th>Date of birth</th></tr></thead><tbody>${(d.kids??[]).map(k=>`<tr><td>${k.name}</td><td>${k.dob?fd(k.dob):'—'}</td></tr>`).join('')}</tbody></table>
<h2>Expenses (${exps.length})</h2><table><thead><tr><th>Date</th><th>Description</th><th>Child</th><th>Category</th><th>Amount</th><th>Status</th><th>Added by</th></tr></thead><tbody>${exps.map(e=>`<tr><td>${fd(e.date)}</td><td>${e.description}</td><td>${e.kid_name}</td><td>${e.category_name}</td><td>$${Number(e.amount).toFixed(2)}</td><td>${e.settlement_status}</td><td>${e.creator_email}</td></tr>`).join('')}</tbody></table>
<p class="footer">CoParent Pay · Xfiniti Technology Pty Ltd · Confidential · Data retained 7 years</p></body></html>`)
    w.document.close();w.print()
  }

  async function signOut(){await supabase.auth.signOut();router.replace('/admin-login')}

  const filteredUsers=useMemo(()=>{let list=users;if(planFilter!=='all')list=list.filter(u=>(u.plan??'free')===planFilter);if(search.trim()){const q=search.toLowerCase();list=list.filter(u=>u.email.toLowerCase().includes(q)||(u.display_name??'').toLowerCase().includes(q)||(u.household_name??'').toLowerCase().includes(q)||(u.country??'').toLowerCase().includes(q)||(u.phone??'').includes(q))}return list},[users,search,planFilter])
  const filteredHouseholds=useMemo(()=>{if(!search.trim())return households;const q=search.toLowerCase();return households.filter(h=>h.name.toLowerCase().includes(q)||h.members.some(m=>m.display_name.toLowerCase().includes(q)))},[households,search])
  const filteredExpenses=useMemo(()=>{if(!detail?.expenses)return[];return expFilter==='all'?detail.expenses:detail.expenses.filter(e=>e.settlement_status===expFilter)},[detail,expFilter])

  if(authed===null)return(<div style={{...P,alignItems:'center',justifyContent:'center'}}><div style={{width:28,height:28,border:'2px solid #334155',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin .7s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>)

  const NAV:[View,string][]=[['dashboard','Dashboard'],['users','Users'],['households','Households'],['plans','Plans'],['admins','Admin users']]

  return(
    <div style={P}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>

      {/* Sidebar */}
      <div style={SB}>
        <div style={{padding:'20px 18px 14px',borderBottom:'1px solid #334155'}}>
          <div style={{fontSize:14,fontWeight:700,color:'#f1f5f9'}}>CoParent Pay</div>
          <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Admin panel</div>
        </div>
        <nav style={{flex:1,padding:'10px 10px'}}>
          {NAV.map(([v,l])=>(
            <button key={v} onClick={()=>{setView(v);setSearch('');setDetail(null)}}
              style={{width:'100%',textAlign:'left',padding:'9px 12px',border:'none',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:view===v?700:400,background:view===v?'#7c3aed22':'transparent',color:view===v?'#a78bfa':'#94a3b8',marginBottom:2}}>
              {l}
            </button>
          ))}
        </nav>
        <div style={{padding:'14px 18px',borderTop:'1px solid #334155'}}>
          <div style={{fontSize:11,color:'#64748b',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{adminEmail}</div>
          <button onClick={signOut} style={{fontSize:12,color:'#64748b',background:'none',border:'none',cursor:'pointer',padding:0}}>Sign out</button>
        </div>
      </div>

      {/* Main area */}
      <div style={MN}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <h1 style={{fontSize:20,fontWeight:700,color:'#f1f5f9',margin:0}}>{NAV.find(([v])=>v===view)?.[1]}</h1>
          {(view==='users'||view==='households')&&(
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${view}…`} style={{...INP,width:260}}/>
          )}
        </div>

        {loading&&<div style={{textAlign:'center',padding:60,color:'#64748b'}}>Loading…</div>}

        {/* DASHBOARD */}
        {view==='dashboard'&&!loading&&stats&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[{l:'Users',v:stats.total_users,s:`+${stats.new_users_7d} this week`},{l:'Households',v:stats.total_households,s:`${stats.linked_households} linked`},{l:'Expenses',v:stats.total_expenses,s:`+${stats.new_expenses_7d} this week`},{l:'Total spend',v:fmt(stats.total_spend),s:`${stats.total_kids} children`}].map(s=>(
                <div key={s.l} style={CD}>
                  <div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{s.l}</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#f1f5f9'}}>{s.v}</div>
                  <div style={{fontSize:11,color:'#64748b',marginTop:3}}>{s.s}</div>
                </div>
              ))}
            </div>
            {(stats.expenses_by_day?.length??0)>0&&(
              <div style={{...CD,marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Activity — last 7 days</div>
                <div style={{display:'flex',gap:8,alignItems:'flex-end',height:70}}>
                  {stats.expenses_by_day.map((d,i)=>(
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div style={{width:'100%',background:'#7c3aed',borderRadius:3,height:Math.max((d.count/Math.max(...stats.expenses_by_day.map(x=>x.count),1))*55,3)}}/>
                      <div style={{fontSize:9,color:'#64748b'}}>{new Date(d.day).toLocaleDateString('en-AU',{weekday:'short'})}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={CD}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em'}}>Recent users</div>
                <button onClick={()=>setView('users')} style={{fontSize:12,color:'#7c3aed',background:'none',border:'none',cursor:'pointer'}}>View all</button>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['Email','Name','Country','Plan','Joined','Last active'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>{users.slice(0,8).map(u=>(
                  <tr key={u.id}>
                    <td style={TD}>{u.email}</td><td style={TD}>{u.display_name??'—'}</td><td style={TD}>{u.country??'—'}</td>
                    <td style={TD}><span style={badge(u.plan==='premium'?'#f59e0b':'#64748b')}>{u.plan??'free'}</span></td>
                    <td style={TD}>{fd(u.created_at)}</td><td style={TD}>{fa(u.last_sign_in_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS */}
        {view==='users'&&!loading&&(
          <div>
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
              {(['all','free','premium'] as const).map(f=>(
                <button key={f} onClick={()=>setPlanFilter(f)} style={{padding:'5px 11px',border:planFilter===f?'1px solid #7c3aed':'1px solid #334155',borderRadius:4,background:planFilter===f?'#7c3aed22':'transparent',color:planFilter===f?'#a78bfa':'#64748b',fontSize:12,cursor:'pointer'}}>
                  {f.charAt(0).toUpperCase()+f.slice(1)} ({f==='all'?users.length:users.filter(u=>(u.plan??'free')===f).length})
                </button>
              ))}
              <button onClick={()=>exportCSV(filteredUsers,'users.csv')} style={{marginLeft:'auto',padding:'5px 11px',border:'1px solid #334155',borderRadius:4,background:'transparent',color:'#94a3b8',fontSize:12,cursor:'pointer'}}>Export CSV</button>
            </div>
            <div style={CD}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['Email','Name','Country','Phone','Plan','Household','Expenses','Spend','Joined','Last login','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredUsers.map(u=>(
                    <>
                    <tr key={u.id} style={{cursor:'pointer'}} onClick={()=>setExpandedUser(expandedUser===u.id?null:u.id)}>
                      <td style={TD}><span style={{color:u.email_confirmed_at?'#e2e8f0':'#64748b'}}>{u.email}</span></td>
                      <td style={TD}>{u.display_name??'—'}</td>
                      <td style={TD}>{u.country??'—'}</td>
                      <td style={TD}>{u.phone??'—'}</td>
                      <td style={TD}><span style={badge(u.plan==='premium'?'#f59e0b':'#64748b')}>{u.plan??'free'}</span></td>
                      <td style={TD}>{u.household_name??'—'}</td>
                      <td style={{...TD,textAlign:'right'}}>{u.expense_count}</td>
                      <td style={{...TD,textAlign:'right'}}>{fmt(u.total_spend)}</td>
                      <td style={TD}>{fd(u.created_at)}</td>
                      <td style={TD}>{fa(u.last_sign_in_at)}</td>
                      <td style={TD}>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          <button onClick={e=>{e.stopPropagation();setPlan(u.id,u.plan==='premium'?'free':'premium',u.display_name??u.email)}} style={{padding:'3px 7px',fontSize:10,background:'#7c3aed22',color:'#a78bfa',border:'1px solid #7c3aed44',borderRadius:3,cursor:'pointer'}}>{u.plan==='premium'?'→ Free':'→ Premium'}</button>
                          <button onClick={e=>{e.stopPropagation();setPwModal({uid:u.id,email:u.email})}} style={{padding:'3px 7px',fontSize:10,background:'#0ea5e922',color:'#38bdf8',border:'1px solid #0ea5e944',borderRadius:3,cursor:'pointer'}}>Pw</button>
                          <button onClick={e=>{e.stopPropagation();deleteUser(u.id,u.email)}} style={{padding:'3px 7px',fontSize:10,background:'#dc262622',color:'#f87171',border:'1px solid #dc262644',borderRadius:3,cursor:'pointer'}}>Del</button>
                        </div>
                      </td>
                    </tr>
                    {expandedUser===u.id&&(
                      <tr key={u.id+'x'}><td colSpan={11} style={{padding:'10px 14px',background:'#0f172a',borderBottom:'1px solid #334155'}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
                          <div><div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>User ID</div><div style={{fontSize:10,color:'#64748b',fontFamily:'monospace',wordBreak:'break-all'}}>{u.id}</div></div>
                          <div><div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Email verified</div><div style={{fontSize:12,color:u.email_confirmed_at?'#4ade80':'#f87171'}}>{u.email_confirmed_at?fd(u.email_confirmed_at):'Not verified'}</div></div>
                          <div><div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Country</div><div style={{fontSize:12,color:'#e2e8f0'}}>{u.country??'Not set'}</div></div>
                          <div><div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>Phone</div><div style={{fontSize:12,color:'#e2e8f0'}}>{u.phone??'Not set'}</div></div>
                        </div>
                      </td></tr>
                    )}
                    </>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length===0&&<div style={{padding:'32px 0',textAlign:'center',color:'#64748b'}}>No users found</div>}
            </div>
          </div>
        )}

        {/* HOUSEHOLDS */}
        {view==='households'&&!loading&&(
          <div style={{display:'grid',gridTemplateColumns:detail?'320px 1fr':'1fr',gap:20}}>
            <div style={CD}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em'}}>{filteredHouseholds.length} households</div>
                <button onClick={()=>exportCSV(filteredHouseholds.map(h=>({id:h.id,name:h.name,members:h.member_count,kids:h.kid_count,expenses:h.expense_count,spend:h.total_spend})),'households.csv')} style={{fontSize:11,color:'#64748b',background:'none',border:'none',cursor:'pointer'}}>CSV</button>
              </div>
              {filteredHouseholds.map(h=>(
                <div key={h.id} onClick={()=>loadDetail(h.id)} style={{padding:'10px 12px',borderRadius:6,cursor:'pointer',marginBottom:5,background:detail?.household?.id===h.id?'#7c3aed22':'#0f172a',border:`1px solid ${detail?.household?.id===h.id?'#7c3aed44':'#1e293b'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{h.name}</div>
                      <div style={{fontSize:11,color:'#64748b',marginTop:1}}>{h.member_count} parents · {h.kid_count} kids · {h.expense_count} exp</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#e2e8f0'}}>{fmt(h.total_spend)}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{fa(h.last_expense_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {detail&&(
              <div>
                {detailLoading?<div style={{...CD,textAlign:'center',padding:40,color:'#64748b'}}>Loading…</div>:(
                  <>
                  <div style={{...CD,marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,color:'#f1f5f9'}}>{detail.household.name}</div>
                        <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Created {fd(detail.household.created_at)}</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>exportPDF(detail)} style={{padding:'4px 9px',fontSize:11,background:'#0f172a',color:'#94a3b8',border:'1px solid #334155',borderRadius:3,cursor:'pointer'}}>PDF</button>
                        <button onClick={()=>exportCSV(detail.expenses??[],'expenses.csv')} style={{padding:'4px 9px',fontSize:11,background:'#0f172a',color:'#94a3b8',border:'1px solid #334155',borderRadius:3,cursor:'pointer'}}>CSV</button>
                        <button onClick={()=>deleteHousehold(detail.household.id,detail.household.name)} style={{padding:'4px 9px',fontSize:11,background:'#dc262622',color:'#f87171',border:'1px solid #dc262644',borderRadius:3,cursor:'pointer'}}>Delete</button>
                        <button onClick={()=>setDetail(null)} style={{padding:'4px 9px',fontSize:11,background:'transparent',color:'#64748b',border:'1px solid #334155',borderRadius:3,cursor:'pointer'}}>×</button>
                      </div>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Members</div>
                    {detail.members.map(m=>(
                      <div key={m.user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #334155'}}>
                        <div><div style={{fontSize:13,color:'#e2e8f0'}}>{m.display_name}</div><div style={{fontSize:11,color:'#64748b'}}>{m.email} · {m.role}</div></div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <span style={{fontSize:10,color:'#64748b'}}>{fd(m.joined_at)}</span>
                          <button onClick={()=>removeMember(detail.household.id,m.user_id,m.display_name)} style={{padding:'2px 7px',fontSize:10,background:'#dc262622',color:'#f87171',border:'1px solid #dc262644',borderRadius:3,cursor:'pointer'}}>Remove</button>
                        </div>
                      </div>
                    ))}
                    {(detail.kids??[]).length>0&&<>
                      <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',margin:'14px 0 8px'}}>Children</div>
                      {(detail.kids??[]).map(k=>(
                        <div key={k.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #1e293b'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:22,height:22,borderRadius:5,background:k.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700}}>{k.name[0]}</div><span style={{fontSize:13,color:'#e2e8f0'}}>{k.name}</span></div>
                          <span style={{fontSize:11,color:'#64748b'}}>{k.dob?fd(k.dob):'—'}</span>
                        </div>
                      ))}
                    </>}
                  </div>
                  <div style={CD}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em'}}>Expenses ({(detail.expenses??[]).length})</div>
                      <div style={{display:'flex',gap:4}}>
                        {[['all','All'],['outstanding','Unpaid'],['pending_approval','Pending'],['settled','Settled']].map(([f,l])=>(
                          <button key={f} onClick={()=>setExpFilter(f)} style={{padding:'2px 7px',fontSize:10,background:expFilter===f?'#7c3aed22':'transparent',color:expFilter===f?'#a78bfa':'#64748b',border:`1px solid ${expFilter===f?'#7c3aed44':'#334155'}`,borderRadius:3,cursor:'pointer'}}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{maxHeight:400,overflowY:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr>{['Date','Description','Child','Category','Amount','Status','Added by','Time'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                        <tbody>
                          {filteredExpenses.map(e=>(
                            <tr key={e.id}>
                              <td style={TD}>{fd(e.date)}</td>
                              <td style={TD}>{e.description}</td>
                              <td style={TD}>{e.kid_name}</td>
                              <td style={TD}>{e.category_name}</td>
                              <td style={{...TD,textAlign:'right'}}>{fmt(e.amount)}</td>
                              <td style={TD}><span style={badge(e.settlement_status==='settled'?'#4ade80':e.settlement_status==='pending_approval'?'#a78bfa':'#f87171')}>{e.settlement_status}</span></td>
                              <td style={TD}>{e.creator_email}</td>
                              <td style={TD}>{ft((e as any).created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredExpenses.length===0&&<div style={{padding:'24px 0',textAlign:'center',color:'#64748b'}}>No expenses</div>}
                    </div>
                  </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* PLANS */}
        {view==='plans'&&!loading&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              <div style={CD}><div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Premium</div><div style={{fontSize:28,fontWeight:700,color:'#f59e0b'}}>{users.filter(u=>u.plan==='premium').length}</div></div>
              <div style={CD}><div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Free / trial</div><div style={{fontSize:28,fontWeight:700,color:'#94a3b8'}}>{users.filter(u=>(u.plan??'free')!=='premium').length}</div></div>
            </div>
            <div style={CD}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['Email','Name','Plan','Since','Action'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...users].sort((a,b)=>(b.plan==='premium'?1:0)-(a.plan==='premium'?1:0)).map(u=>(
                    <tr key={u.id}>
                      <td style={TD}>{u.email}</td>
                      <td style={TD}>{u.display_name??'—'}</td>
                      <td style={TD}><span style={badge(u.plan==='premium'?'#f59e0b':'#64748b')}>{u.plan??'free'}</span></td>
                      <td style={TD}>{fd(u.plan_assigned_at)}</td>
                      <td style={TD}><button onClick={()=>setPlan(u.id,u.plan==='premium'?'free':'premium',u.display_name??u.email)} style={{padding:'4px 10px',fontSize:11,background:'#7c3aed22',color:'#a78bfa',border:'1px solid #7c3aed44',borderRadius:3,cursor:'pointer'}}>{u.plan==='premium'?'→ Free':'→ Premium'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMINS */}
        {view==='admins'&&!loading&&(
          <div>
            <div style={{...CD,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Add admin user</div>
              <p style={{fontSize:13,color:'#64748b',marginBottom:10,lineHeight:1.6}}>The user must already have a CoParent Pay account.</p>
              <div style={{display:'flex',gap:8}}>
                <input value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addAdmin()} placeholder="user@example.com" style={{...INP,flex:1}}/>
                <button onClick={addAdmin} style={{padding:'9px 18px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0}}>Add admin</button>
              </div>
            </div>
            <div style={CD}>
              <div style={{fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Admin users ({admins.length})</div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['Email','Added','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>{admins.map(a=>(
                  <tr key={a.id}>
                    <td style={TD}><span style={{color:'#e2e8f0'}}>{a.email}</span>{a.email===adminEmail&&<span style={{marginLeft:8,fontSize:10,color:'#64748b'}}>(you)</span>}</td>
                    <td style={TD}>{fd(a.created_at)}</td>
                    <td style={TD}>{a.email!==adminEmail&&<button onClick={()=>removeAdmin(a.id,a.email)} style={{padding:'3px 7px',fontSize:10,background:'#dc262622',color:'#f87171',border:'1px solid #dc262644',borderRadius:3,cursor:'pointer'}}>Remove</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PASSWORD MODAL */}
      {pwModal&&(
        <div onClick={e=>e.target===e.currentTarget&&setPwModal(null)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:26,width:360}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#f1f5f9',marginBottom:4}}>Reset password</h3>
            <p style={{fontSize:12,color:'#64748b',marginBottom:14}}>{pwModal.email}</p>
            <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&changePassword()} placeholder="New password (min 6 characters)" style={{...INP,marginBottom:12}} autoFocus/>
            <div style={{display:'flex',gap:8}}>
              <button onClick={changePassword} disabled={pwLoading} style={{flex:1,padding:10,background:'#7c3aed',color:'#fff',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>{pwLoading?'Saving…':'Set password'}</button>
              <button onClick={()=>{setPwModal(null);setNewPw('')}} style={{padding:'10px 14px',background:'transparent',color:'#64748b',border:'1px solid #334155',borderRadius:6,fontSize:13,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM */}
      {confirm&&(
        <div style={{position:'fixed',inset:0,zIndex:400,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:26,maxWidth:400}}>
            <p style={{fontSize:14,color:'#e2e8f0',marginBottom:20,lineHeight:1.6}}>{confirm.msg}</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{confirm.action();setConfirm(null)}} style={{flex:1,padding:10,background:'#dc2626',color:'#fff',border:'none',borderRadius:6,fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirm</button>
              <button onClick={()=>setConfirm(null)} style={{flex:1,padding:10,background:'transparent',color:'#94a3b8',border:'1px solid #334155',borderRadius:6,fontSize:13,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<div style={{position:'fixed',bottom:24,right:24,zIndex:600,background:'#0f172a',color:'#e2e8f0',padding:'10px 18px',borderRadius:4,fontSize:13,border:'1px solid #334155',boxShadow:'0 4px 12px rgba(0,0,0,0.4)'}}>{toast}</div>}
    </div>
  )
}
