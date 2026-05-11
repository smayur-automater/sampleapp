import Link from 'next/link'
export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ fontSize: '40px' }}>🔍</p>
      <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Page not found</h1>
      <p style={{ fontSize: '14px', color: '#64748b' }}>This page doesn&apos;t exist or you need to sign in.</p>
      <Link href="/" style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', borderRadius: '9px', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>Go to sign in</Link>
    </div>
  )
}
