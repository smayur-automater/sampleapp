'use client'
import React from 'react'
import { useState } from 'react'
import { supabase, isConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type View = 'signin' | 'signup' | 'otp' | 'forgot' | 'forgot_sent'

const S: Record<string, React.CSSProperties> = {
  page:  { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  wrap:  { width: '100%', maxWidth: 420 },
  card:  { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  inp:   { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 11, fontSize: 15, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const },
  lbl:   { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase' as const },
  btn:   { width: '100%', padding: '14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  ghost: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: '6px 0', display: 'block' } as React.CSSProperties,
  row:   { marginBottom: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
}

export default function LoginPage() {
  const router = useRouter()
  const [view,      setView]      = useState<View>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [dialCode,  setDialCode]  = useState('+61')
  const [email,     setEmail]     = useState('')
  const [pw,        setPw]        = useState('')
  const [pw2,       setPw2]       = useState('')
  const [otp,       setOtp]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [ok,        setOk]        = useState('')

  const E = (t: string) => { setError(t); setOk('') }
  const O = (t: string) => { setOk(t);   setError('') }
  const clear = () => { setError(''); setOk('') }

  function redirectAfterAuth() {
    const pending = typeof window !== 'undefined' ? localStorage.getItem('pendingInvite') : null
    if (pending) { localStorage.removeItem('pendingInvite'); router.push(`/invite/${pending}`) }
    else router.push('/dashboard')
  }

  // ── Sign in ───────────────────────────────────────────────────
  async function signIn() {
    if (!email.trim()) { E('Enter your email address'); return }
    if (!pw)           { E('Enter your password'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        // Account exists but email not verified — send OTP to verify
        await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
        setView('otp')
        O('Please verify your email — a code has been sent to ' + email.trim())
      } else {
        E('Incorrect email or password. Please try again.')
      }
    } else {
      redirectAfterAuth()
    }
  }

  // ── Sign up: create account with password, then send OTP to verify ─
  async function signUp() {
    if (!firstName.trim())    { E('Enter your first name'); return }
    if (!lastName.trim())     { E('Enter your last name'); return }
    if (!phone.trim())        { E('Enter your phone number'); return }
    if (!email.trim())        { E('Enter your email address'); return }
    if (!email.includes('@')) { E('Enter a valid email address'); return }
    if (!pw)                  { E('Choose a password'); return }
    if (pw.length < 6)        { E('Password must be at least 6 characters'); return }
    if (pw !== pw2)           { E('Passwords do not match'); return }
    setLoading(true); clear()

    // Step 1: Create the account
    const { data, error: e1 } = await supabase.auth.signUp({
      email:    email.trim(),
      password: pw,
      options:  {
        data: {
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          full_name:  `${firstName.trim()} ${lastName.trim()}`,
          phone:      (dialCode + ' ' + phone.trim()).trim(),
        },
      },
    })

    if (e1) {
      setLoading(false)
      E(e1.message.toLowerCase().includes('already registered')
        ? 'An account with this email already exists. Try signing in.'
        : e1.message)
      return
    }

    // Step 2: If Supabase email confirmations are ON, send OTP for verification
    // If confirmations are OFF, the user is already signed in
    if (data.session) {
      // Email confirmation disabled — signed in immediately
      setLoading(false)
      redirectAfterAuth()
      return
    }

    // Email confirmation required — send OTP code instead of magic link
    const { error: e2 } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setLoading(false)

    if (e2) {
      if (e2.message.toLowerCase().includes('security purposes')) {
        // Supabase already sent a confirmation email during signUp — go to OTP screen
        setView('otp')
        O('A verification code was sent to ' + email.trim() + '. Enter it below.')
      } else {
        E('Account created. ' + e2.message + '. Please try signing in.')
      }
    } else {
      setView('otp')
      O('Verification code sent to ' + email.trim())
    }
  }

  // ── Verify OTP ────────────────────────────────────────────────
  async function verifyOtp() {
    if (otp.length < 6) { E('Enter the 6-digit code from your email'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp, type: 'email' })
    setLoading(false)
    if (error) E('Invalid or expired code. Please request a new one.')
    else redirectAfterAuth()
  }

  async function resendOtp() {
    setLoading(true); clear()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) E('Could not resend: ' + error.message)
    else O('New code sent to ' + email.trim())
  }

  // ── Forgot password ───────────────────────────────────────────
  async function forgotPw() {
    if (!email.trim()) { E('Enter your email address'); return }
    setLoading(true); clear()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) E(error.message)
    else setView('forgot_sent')
  }

  const off = { opacity: 0.55, cursor: 'not-allowed' as const }

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {!isConfigured && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>
            ⚠️ Missing Supabase environment variables
          </div>
        )}

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CoParent Pay" style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#1a3a6b' }}>CoParent</span>
            <span style={{ color: '#2ec4a0' }}> Pay</span>
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Shared Expenses. Shared Responsibility.</div>
        </div>

        <div style={S.card}>

          {/* ══ SIGN IN ══ */}
          {view === 'signin' && (<>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Sign in</div>
            <div style={S.row}>
              <label style={S.lbl}>Email address</label>
              <input type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                placeholder="you@example.com" style={S.inp} />
            </div>
            <div style={{ marginBottom: 4 }}>
              <label style={S.lbl}>Password</label>
              <input type="password" value={pw}
                onChange={e => { setPw(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signIn()}
                placeholder="••••••••" style={S.inp} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 18 }}>
              <button onClick={() => { setView('forgot'); clear() }}
                style={{ ...S.ghost, display: 'inline', padding: 0, fontSize: 13, color: '#1a3a6b' }}>
                Forgot password?
              </button>
            </div>
            {error && <Alert type="error">{error}</Alert>}
            {ok    && <Alert type="ok">{ok}</Alert>}
            <button onClick={signIn} disabled={loading} style={{ ...S.btn, ...(loading ? off : {}) }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
              Don&apos;t have an account?{' '}
              <button onClick={() => { setView('signup'); clear() }}
                style={{ ...S.ghost, display: 'inline', padding: 0, color: '#1a3a6b', fontWeight: 700 }}>
                Create one
              </button>
            </div>
          </>)}

          {/* ══ CREATE ACCOUNT ══ */}
          {view === 'signup' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => { setView('signin'); clear() }}
                style={{ ...S.ghost, padding: 0, color: '#1a3a6b', fontSize: 22, width: 'auto', lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Create account</div>
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.lbl}>First name</label>
                <input value={firstName} autoFocus onChange={e => { setFirstName(e.target.value); clear() }} placeholder="Sarah" style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>Last name</label>
                <input value={lastName} onChange={e => { setLastName(e.target.value); clear() }} placeholder="Smith" style={S.inp} />
              </div>
            </div>
            <div style={S.row}>
              <label style={S.lbl}>Phone number</label>
              <PhoneInput dialCode={dialCode} onDialChange={setDialCode} value={phone} onChange={v => { setPhone(v); clear() }} inpStyle={S.inp} />
            </div>
            <div style={S.row}>
              <label style={S.lbl}>Email address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); clear() }} placeholder="you@example.com" style={S.inp} />
            </div>
            <div style={S.row}>
              <label style={S.lbl}>Password</label>
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); clear() }} placeholder="At least 6 characters" style={S.inp} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>Confirm password</label>
              <input type="password" value={pw2}
                onChange={e => { setPw2(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && signUp()}
                placeholder="Re-enter password" style={S.inp} />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            {ok    && <Alert type="ok">{ok}</Alert>}
            <button onClick={signUp} disabled={loading} style={{ ...S.btn, ...(loading ? off : {}) }}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              A 6-digit verification code will be emailed to confirm your account.
            </p>
          </>)}

          {/* ══ OTP VERIFICATION ══ */}
          {view === 'otp' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { setView('signup'); clear() }}
                style={{ ...S.ghost, padding: 0, color: '#1a3a6b', fontSize: 22, width: 'auto', lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Check your email</div>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.65 }}>
              We sent a 6-digit code to <strong style={{ color: '#0f172a' }}>{email}</strong>. Enter it below to verify your account.
            </p>
            {ok    && <Alert type="ok">{ok}</Alert>}
            {error && <Alert type="error">{error}</Alert>}
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>Verification code</label>
              <input value={otp} autoFocus maxLength={6}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); clear() }}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                placeholder="000000"
                style={{ ...S.inp, fontSize: 32, letterSpacing: 16, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
            <button onClick={verifyOtp} disabled={loading || otp.length < 6}
              style={{ ...S.btn, ...(loading || otp.length < 6 ? off : {}) }}>
              {loading ? 'Verifying…' : 'Verify & sign in →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={resendOtp} disabled={loading}
                style={{ ...S.ghost, display: 'inline', color: '#1a3a6b', padding: 0, fontSize: 13 }}>
                Didn&apos;t get it? Resend code
              </button>
            </div>
          </>)}

          {/* ══ FORGOT PASSWORD ══ */}
          {view === 'forgot' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { setView('signin'); clear() }}
                style={{ ...S.ghost, padding: 0, color: '#1a3a6b', fontSize: 22, width: 'auto', lineHeight: 1 }}>←</button>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Reset password</div>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.65 }}>
              Enter your email and we&apos;ll send a link to reset your password.
            </p>
            <div style={{ marginBottom: 18 }}>
              <label style={S.lbl}>Email address</label>
              <input type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); clear() }}
                onKeyDown={e => e.key === 'Enter' && forgotPw()}
                placeholder="you@example.com" style={S.inp} />
            </div>
            {error && <Alert type="error">{error}</Alert>}
            <button onClick={forgotPw} disabled={loading} style={{ ...S.btn, ...(loading ? off : {}) }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>)}

          {/* ══ FORGOT SENT ══ */}
          {view === 'forgot_sent' && (<>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📧</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Check your inbox</div>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 24 }}>
                A password reset link has been sent to <strong style={{ color: '#0f172a' }}>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <button onClick={() => { setView('signin'); clear() }}
                style={{ ...S.btn, width: 'auto', padding: '11px 24px', margin: '0 auto', display: 'block', fontSize: 14 }}>
                Back to sign in
              </button>
            </div>
          </>)}

        </div>

        {/* Supabase OTP tip */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
          CoParent Pay · Secure sign-in
        </div>
      </div>
    </div>
  )
}

// ── Country dial-code data ──────────────────────────────────────────
const COUNTRIES = [
  // ── Pinned / most common ─────────────────────────
  { code: 'AU', dial: '+61',   flag: '🇦🇺', name: 'Australia'             },
  { code: 'US', dial: '+1',    flag: '🇺🇸', name: 'United States'         },
  { code: 'GB', dial: '+44',   flag: '🇬🇧', name: 'United Kingdom'        },
  { code: 'NZ', dial: '+64',   flag: '🇳🇿', name: 'New Zealand'           },
  { code: 'CA', dial: '+1',    flag: '🇨🇦', name: 'Canada'                },
  { code: 'IN', dial: '+91',   flag: '🇮🇳', name: 'India'                 },
  { code: 'SG', dial: '+65',   flag: '🇸🇬', name: 'Singapore'             },
  { code: 'AE', dial: '+971',  flag: '🇦🇪', name: 'UAE'                   },
  { code: 'SA', dial: '+966',  flag: '🇸🇦', name: 'Saudi Arabia'          },
  { code: 'ZA', dial: '+27',   flag: '🇿🇦', name: 'South Africa'          },
  // ── Asia Pacific ─────────────────────────────────
  { code: 'AF', dial: '+93',   flag: '🇦🇫', name: 'Afghanistan'           },
  { code: 'AM', dial: '+374',  flag: '🇦🇲', name: 'Armenia'               },
  { code: 'AZ', dial: '+994',  flag: '🇦🇿', name: 'Azerbaijan'            },
  { code: 'BD', dial: '+880',  flag: '🇧🇩', name: 'Bangladesh'            },
  { code: 'BT', dial: '+975',  flag: '🇧🇹', name: 'Bhutan'                },
  { code: 'BN', dial: '+673',  flag: '🇧🇳', name: 'Brunei'                },
  { code: 'KH', dial: '+855',  flag: '🇰🇭', name: 'Cambodia'              },
  { code: 'CN', dial: '+86',   flag: '🇨🇳', name: 'China'                 },
  { code: 'FJ', dial: '+679',  flag: '🇫🇯', name: 'Fiji'                  },
  { code: 'GE', dial: '+995',  flag: '🇬🇪', name: 'Georgia'               },
  { code: 'HK', dial: '+852',  flag: '🇭🇰', name: 'Hong Kong'             },
  { code: 'ID', dial: '+62',   flag: '🇮🇩', name: 'Indonesia'             },
  { code: 'JP', dial: '+81',   flag: '🇯🇵', name: 'Japan'                 },
  { code: 'KZ', dial: '+7',    flag: '🇰🇿', name: 'Kazakhstan'            },
  { code: 'KR', dial: '+82',   flag: '🇰🇷', name: 'South Korea'           },
  { code: 'KP', dial: '+850',  flag: '🇰🇵', name: 'North Korea'           },
  { code: 'KG', dial: '+996',  flag: '🇰🇬', name: 'Kyrgyzstan'            },
  { code: 'LA', dial: '+856',  flag: '🇱🇦', name: 'Laos'                  },
  { code: 'MO', dial: '+853',  flag: '🇲🇴', name: 'Macau'                 },
  { code: 'MY', dial: '+60',   flag: '🇲🇾', name: 'Malaysia'              },
  { code: 'MV', dial: '+960',  flag: '🇲🇻', name: 'Maldives'              },
  { code: 'MN', dial: '+976',  flag: '🇲🇳', name: 'Mongolia'              },
  { code: 'MM', dial: '+95',   flag: '🇲🇲', name: 'Myanmar'               },
  { code: 'NP', dial: '+977',  flag: '🇳🇵', name: 'Nepal'                 },
  { code: 'PK', dial: '+92',   flag: '🇵🇰', name: 'Pakistan'              },
  { code: 'PG', dial: '+675',  flag: '🇵🇬', name: 'Papua New Guinea'      },
  { code: 'PH', dial: '+63',   flag: '🇵🇭', name: 'Philippines'           },
  { code: 'WS', dial: '+685',  flag: '🇼🇸', name: 'Samoa'                 },
  { code: 'LK', dial: '+94',   flag: '🇱🇰', name: 'Sri Lanka'             },
  { code: 'TW', dial: '+886',  flag: '🇹🇼', name: 'Taiwan'                },
  { code: 'TJ', dial: '+992',  flag: '🇹🇯', name: 'Tajikistan'            },
  { code: 'TH', dial: '+66',   flag: '🇹🇭', name: 'Thailand'              },
  { code: 'TL', dial: '+670',  flag: '🇹🇱', name: 'Timor-Leste'           },
  { code: 'TM', dial: '+993',  flag: '🇹🇲', name: 'Turkmenistan'          },
  { code: 'UZ', dial: '+998',  flag: '🇺🇿', name: 'Uzbekistan'            },
  { code: 'VU', dial: '+678',  flag: '🇻🇺', name: 'Vanuatu'               },
  { code: 'VN', dial: '+84',   flag: '🇻🇳', name: 'Vietnam'               },
  // ── Middle East ───────────────────────────────────
  { code: 'BH', dial: '+973',  flag: '🇧🇭', name: 'Bahrain'               },
  { code: 'IQ', dial: '+964',  flag: '🇮🇶', name: 'Iraq'                  },
  { code: 'IL', dial: '+972',  flag: '🇮🇱', name: 'Israel'                },
  { code: 'JO', dial: '+962',  flag: '🇯🇴', name: 'Jordan'                },
  { code: 'KW', dial: '+965',  flag: '🇰🇼', name: 'Kuwait'                },
  { code: 'LB', dial: '+961',  flag: '🇱🇧', name: 'Lebanon'               },
  { code: 'OM', dial: '+968',  flag: '🇴🇲', name: 'Oman'                  },
  { code: 'PS', dial: '+970',  flag: '🇵🇸', name: 'Palestine'             },
  { code: 'QA', dial: '+974',  flag: '🇶🇦', name: 'Qatar'                 },
  { code: 'SY', dial: '+963',  flag: '🇸🇾', name: 'Syria'                 },
  { code: 'TR', dial: '+90',   flag: '🇹🇷', name: 'Turkey'                },
  { code: 'YE', dial: '+967',  flag: '🇾🇪', name: 'Yemen'                 },
  // ── Europe ───────────────────────────────────────
  { code: 'AL', dial: '+355',  flag: '🇦🇱', name: 'Albania'               },
  { code: 'AD', dial: '+376',  flag: '🇦🇩', name: 'Andorra'               },
  { code: 'AT', dial: '+43',   flag: '🇦🇹', name: 'Austria'               },
  { code: 'BY', dial: '+375',  flag: '🇧🇾', name: 'Belarus'               },
  { code: 'BE', dial: '+32',   flag: '🇧🇪', name: 'Belgium'               },
  { code: 'BA', dial: '+387',  flag: '🇧🇦', name: 'Bosnia & Herzegovina'  },
  { code: 'BG', dial: '+359',  flag: '🇧🇬', name: 'Bulgaria'              },
  { code: 'HR', dial: '+385',  flag: '🇭🇷', name: 'Croatia'               },
  { code: 'CY', dial: '+357',  flag: '🇨🇾', name: 'Cyprus'                },
  { code: 'CZ', dial: '+420',  flag: '🇨🇿', name: 'Czech Republic'        },
  { code: 'DK', dial: '+45',   flag: '🇩🇰', name: 'Denmark'               },
  { code: 'EE', dial: '+372',  flag: '🇪🇪', name: 'Estonia'               },
  { code: 'FI', dial: '+358',  flag: '🇫🇮', name: 'Finland'               },
  { code: 'FR', dial: '+33',   flag: '🇫🇷', name: 'France'                },
  { code: 'DE', dial: '+49',   flag: '🇩🇪', name: 'Germany'               },
  { code: 'GR', dial: '+30',   flag: '🇬🇷', name: 'Greece'                },
  { code: 'HU', dial: '+36',   flag: '🇭🇺', name: 'Hungary'               },
  { code: 'IS', dial: '+354',  flag: '🇮🇸', name: 'Iceland'               },
  { code: 'IE', dial: '+353',  flag: '🇮🇪', name: 'Ireland'               },
  { code: 'IT', dial: '+39',   flag: '🇮🇹', name: 'Italy'                 },
  { code: 'XK', dial: '+383',  flag: '🇽🇰', name: 'Kosovo'                },
  { code: 'LV', dial: '+371',  flag: '🇱🇻', name: 'Latvia'                },
  { code: 'LI', dial: '+423',  flag: '🇱🇮', name: 'Liechtenstein'         },
  { code: 'LT', dial: '+370',  flag: '🇱🇹', name: 'Lithuania'             },
  { code: 'LU', dial: '+352',  flag: '🇱🇺', name: 'Luxembourg'            },
  { code: 'MT', dial: '+356',  flag: '🇲🇹', name: 'Malta'                 },
  { code: 'MD', dial: '+373',  flag: '🇲🇩', name: 'Moldova'               },
  { code: 'MC', dial: '+377',  flag: '🇲🇨', name: 'Monaco'                },
  { code: 'ME', dial: '+382',  flag: '🇲🇪', name: 'Montenegro'            },
  { code: 'NL', dial: '+31',   flag: '🇳🇱', name: 'Netherlands'           },
  { code: 'MK', dial: '+389',  flag: '🇲🇰', name: 'North Macedonia'       },
  { code: 'NO', dial: '+47',   flag: '🇳🇴', name: 'Norway'                },
  { code: 'PL', dial: '+48',   flag: '🇵🇱', name: 'Poland'                },
  { code: 'PT', dial: '+351',  flag: '🇵🇹', name: 'Portugal'              },
  { code: 'RO', dial: '+40',   flag: '🇷🇴', name: 'Romania'               },
  { code: 'RU', dial: '+7',    flag: '🇷🇺', name: 'Russia'                },
  { code: 'SM', dial: '+378',  flag: '🇸🇲', name: 'San Marino'            },
  { code: 'RS', dial: '+381',  flag: '🇷🇸', name: 'Serbia'                },
  { code: 'SK', dial: '+421',  flag: '🇸🇰', name: 'Slovakia'              },
  { code: 'SI', dial: '+386',  flag: '🇸🇮', name: 'Slovenia'              },
  { code: 'ES', dial: '+34',   flag: '🇪🇸', name: 'Spain'                 },
  { code: 'SE', dial: '+46',   flag: '🇸🇪', name: 'Sweden'                },
  { code: 'CH', dial: '+41',   flag: '🇨🇭', name: 'Switzerland'           },
  { code: 'UA', dial: '+380',  flag: '🇺🇦', name: 'Ukraine'               },
  { code: 'VA', dial: '+39',   flag: '🇻🇦', name: 'Vatican City'          },
  // ── Africa ───────────────────────────────────────
  { code: 'DZ', dial: '+213',  flag: '🇩🇿', name: 'Algeria'               },
  { code: 'AO', dial: '+244',  flag: '🇦🇴', name: 'Angola'                },
  { code: 'BJ', dial: '+229',  flag: '🇧🇯', name: 'Benin'                 },
  { code: 'BW', dial: '+267',  flag: '🇧🇼', name: 'Botswana'              },
  { code: 'BF', dial: '+226',  flag: '🇧🇫', name: 'Burkina Faso'          },
  { code: 'BI', dial: '+257',  flag: '🇧🇮', name: 'Burundi'               },
  { code: 'CM', dial: '+237',  flag: '🇨🇲', name: 'Cameroon'              },
  { code: 'CV', dial: '+238',  flag: '🇨🇻', name: 'Cape Verde'            },
  { code: 'CF', dial: '+236',  flag: '🇨🇫', name: 'Central African Rep.'  },
  { code: 'TD', dial: '+235',  flag: '🇹🇩', name: 'Chad'                  },
  { code: 'KM', dial: '+269',  flag: '🇰🇲', name: 'Comoros'               },
  { code: 'CG', dial: '+242',  flag: '🇨🇬', name: 'Congo'                 },
  { code: 'CD', dial: '+243',  flag: '🇨🇩', name: 'DR Congo'              },
  { code: 'CI', dial: '+225',  flag: '🇨🇮', name: "Côte d'Ivoire"         },
  { code: 'DJ', dial: '+253',  flag: '🇩🇯', name: 'Djibouti'              },
  { code: 'EG', dial: '+20',   flag: '🇪🇬', name: 'Egypt'                 },
  { code: 'GQ', dial: '+240',  flag: '🇬🇶', name: 'Equatorial Guinea'     },
  { code: 'ER', dial: '+291',  flag: '🇪🇷', name: 'Eritrea'               },
  { code: 'SZ', dial: '+268',  flag: '🇸🇿', name: 'Eswatini'              },
  { code: 'ET', dial: '+251',  flag: '🇪🇹', name: 'Ethiopia'              },
  { code: 'GA', dial: '+241',  flag: '🇬🇦', name: 'Gabon'                 },
  { code: 'GM', dial: '+220',  flag: '🇬🇲', name: 'Gambia'                },
  { code: 'GH', dial: '+233',  flag: '🇬🇭', name: 'Ghana'                 },
  { code: 'GN', dial: '+224',  flag: '🇬🇳', name: 'Guinea'                },
  { code: 'GW', dial: '+245',  flag: '🇬🇼', name: 'Guinea-Bissau'         },
  { code: 'KE', dial: '+254',  flag: '🇰🇪', name: 'Kenya'                 },
  { code: 'LS', dial: '+266',  flag: '🇱🇸', name: 'Lesotho'               },
  { code: 'LR', dial: '+231',  flag: '🇱🇷', name: 'Liberia'               },
  { code: 'LY', dial: '+218',  flag: '🇱🇾', name: 'Libya'                 },
  { code: 'MG', dial: '+261',  flag: '🇲🇬', name: 'Madagascar'            },
  { code: 'MW', dial: '+265',  flag: '🇲🇼', name: 'Malawi'                },
  { code: 'ML', dial: '+223',  flag: '🇲🇱', name: 'Mali'                  },
  { code: 'MR', dial: '+222',  flag: '🇲🇷', name: 'Mauritania'            },
  { code: 'MU', dial: '+230',  flag: '🇲🇺', name: 'Mauritius'             },
  { code: 'MA', dial: '+212',  flag: '🇲🇦', name: 'Morocco'               },
  { code: 'MZ', dial: '+258',  flag: '🇲🇿', name: 'Mozambique'            },
  { code: 'NA', dial: '+264',  flag: '🇳🇦', name: 'Namibia'               },
  { code: 'NE', dial: '+227',  flag: '🇳🇪', name: 'Niger'                 },
  { code: 'NG', dial: '+234',  flag: '🇳🇬', name: 'Nigeria'               },
  { code: 'RW', dial: '+250',  flag: '🇷🇼', name: 'Rwanda'                },
  { code: 'ST', dial: '+239',  flag: '🇸🇹', name: 'São Tomé & Príncipe'   },
  { code: 'SN', dial: '+221',  flag: '🇸🇳', name: 'Senegal'               },
  { code: 'SC', dial: '+248',  flag: '🇸🇨', name: 'Seychelles'            },
  { code: 'SL', dial: '+232',  flag: '🇸🇱', name: 'Sierra Leone'          },
  { code: 'SO', dial: '+252',  flag: '🇸🇴', name: 'Somalia'               },
  { code: 'SS', dial: '+211',  flag: '🇸🇸', name: 'South Sudan'           },
  { code: 'SD', dial: '+249',  flag: '🇸🇩', name: 'Sudan'                 },
  { code: 'TZ', dial: '+255',  flag: '🇹🇿', name: 'Tanzania'              },
  { code: 'TG', dial: '+228',  flag: '🇹🇬', name: 'Togo'                  },
  { code: 'TN', dial: '+216',  flag: '🇹🇳', name: 'Tunisia'               },
  { code: 'UG', dial: '+256',  flag: '🇺🇬', name: 'Uganda'                },
  { code: 'ZM', dial: '+260',  flag: '🇿🇲', name: 'Zambia'                },
  { code: 'ZW', dial: '+263',  flag: '🇿🇼', name: 'Zimbabwe'              },
  // ── Americas ─────────────────────────────────────
  { code: 'AI', dial: '+1264', flag: '🇦🇮', name: 'Anguilla'              },
  { code: 'AG', dial: '+1268', flag: '🇦🇬', name: 'Antigua & Barbuda'     },
  { code: 'AR', dial: '+54',   flag: '🇦🇷', name: 'Argentina'             },
  { code: 'AW', dial: '+297',  flag: '🇦🇼', name: 'Aruba'                 },
  { code: 'BS', dial: '+1242', flag: '🇧🇸', name: 'Bahamas'               },
  { code: 'BB', dial: '+1246', flag: '🇧🇧', name: 'Barbados'              },
  { code: 'BZ', dial: '+501',  flag: '🇧🇿', name: 'Belize'                },
  { code: 'BO', dial: '+591',  flag: '🇧🇴', name: 'Bolivia'               },
  { code: 'BR', dial: '+55',   flag: '🇧🇷', name: 'Brazil'                },
  { code: 'VG', dial: '+1284', flag: '🇻🇬', name: 'British Virgin Islands'},
  { code: 'KY', dial: '+1345', flag: '🇰🇾', name: 'Cayman Islands'        },
  { code: 'CL', dial: '+56',   flag: '🇨🇱', name: 'Chile'                 },
  { code: 'CO', dial: '+57',   flag: '🇨🇴', name: 'Colombia'              },
  { code: 'CR', dial: '+506',  flag: '🇨🇷', name: 'Costa Rica'            },
  { code: 'CU', dial: '+53',   flag: '🇨🇺', name: 'Cuba'                  },
  { code: 'DM', dial: '+1767', flag: '🇩🇲', name: 'Dominica'              },
  { code: 'DO', dial: '+1809', flag: '🇩🇴', name: 'Dominican Republic'    },
  { code: 'EC', dial: '+593',  flag: '🇪🇨', name: 'Ecuador'               },
  { code: 'SV', dial: '+503',  flag: '🇸🇻', name: 'El Salvador'           },
  { code: 'GD', dial: '+1473', flag: '🇬🇩', name: 'Grenada'               },
  { code: 'GT', dial: '+502',  flag: '🇬🇹', name: 'Guatemala'             },
  { code: 'GY', dial: '+592',  flag: '🇬🇾', name: 'Guyana'                },
  { code: 'HT', dial: '+509',  flag: '🇭🇹', name: 'Haiti'                 },
  { code: 'HN', dial: '+504',  flag: '🇭🇳', name: 'Honduras'              },
  { code: 'JM', dial: '+1876', flag: '🇯🇲', name: 'Jamaica'               },
  { code: 'MX', dial: '+52',   flag: '🇲🇽', name: 'Mexico'                },
  { code: 'NI', dial: '+505',  flag: '🇳🇮', name: 'Nicaragua'             },
  { code: 'PA', dial: '+507',  flag: '🇵🇦', name: 'Panama'                },
  { code: 'PY', dial: '+595',  flag: '🇵🇾', name: 'Paraguay'              },
  { code: 'PE', dial: '+51',   flag: '🇵🇪', name: 'Peru'                  },
  { code: 'PR', dial: '+1787', flag: '🇵🇷', name: 'Puerto Rico'           },
  { code: 'KN', dial: '+1869', flag: '🇰🇳', name: 'Saint Kitts & Nevis'   },
  { code: 'LC', dial: '+1758', flag: '🇱🇨', name: 'Saint Lucia'           },
  { code: 'VC', dial: '+1784', flag: '🇻🇨', name: 'St Vincent & Grenadines'},
  { code: 'SR', dial: '+597',  flag: '🇸🇷', name: 'Suriname'              },
  { code: 'TT', dial: '+1868', flag: '🇹🇹', name: 'Trinidad & Tobago'     },
  { code: 'TC', dial: '+1649', flag: '🇹🇨', name: 'Turks & Caicos Islands'},
  { code: 'UY', dial: '+598',  flag: '🇺🇾', name: 'Uruguay'               },
  { code: 'VE', dial: '+58',   flag: '🇻🇪', name: 'Venezuela'             },
  { code: 'VI', dial: '+1340', flag: '🇻🇮', name: 'US Virgin Islands'     },
]

// ── PhoneInput component ─────────────────────────────────────────────
function PhoneInput({
  dialCode, onDialChange, value, onChange, inpStyle,
}: {
  dialCode:     string
  onDialChange: (c: string) => void
  value:        string
  onChange:     (v: string) => void
  inpStyle:     React.CSSProperties
}) {
  const [open,   setOpen]   = React.useState(false)
  const [search, setSearch] = React.useState('')
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  const selected = COUNTRIES.find(c => c.dial === dialCode) ?? COUNTRIES[0]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', gap: 8 }}>

      {/* Dial code selector */}
      <button type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '12px 10px', flexShrink: 0,
          background: '#f8fafc', border: '1.5px solid #e2e8f0',
          borderRadius: 11, cursor: 'pointer',
          fontSize: 14, color: '#0f172a', minWidth: 96,
          whiteSpace: 'nowrap',
        }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>{selected.flag}</span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{selected.dial}</span>
        <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Phone number input */}
      <input
        type="tel"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9 \-()+]/g, ''))}
        placeholder="400 000 000"
        style={{ ...inpStyle, flex: 1 }}
      />

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 999,
          width: 300, maxHeight: 320, background: '#fff',
          border: '1.5px solid #e2e8f0', borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Search bar */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
            <input autoFocus value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country or dial code…"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>

          {/* Results count */}
          {search.trim() && (
            <div style={{ padding: '4px 12px', fontSize: 11, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              {filtered.length} {filtered.length === 1 ? 'country' : 'countries'} found
            </div>
          )}

          {/* Country list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 12px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                No countries found
              </div>
            ) : filtered.map(c => (
              <button key={c.code} type="button"
                onClick={() => { onDialChange(c.dial); setOpen(false); setSearch('') }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', border: 'none', borderBottom: '1px solid #f8fafc',
                  background: c.dial === dialCode ? '#eff6ff' : '#fff',
                  cursor: 'pointer', textAlign: 'left' as const,
                }}>
                <span style={{ fontSize: 18, lineHeight: 1, width: 24, textAlign: 'center' }}>{c.flag}</span>
                <span style={{ flex: 1, fontSize: 13, color: '#0f172a', fontWeight: c.dial === dialCode ? 600 : 400 }}>
                  {c.name}
                </span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, fontFamily: 'monospace' }}>
                  {c.dial}
                </span>
                {c.dial === dialCode && (
                  <span style={{ fontSize: 11, color: '#2563eb' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


function Alert({ type, children }: { type: 'error' | 'ok'; children: React.ReactNode }) {
  const isErr = type === 'error'
  return (
    <div style={{
      padding: '10px 14px',
      background: isErr ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`,
      borderRadius: 10, fontSize: 13,
      color: isErr ? '#dc2626' : '#059669',
      marginBottom: 14, lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}
