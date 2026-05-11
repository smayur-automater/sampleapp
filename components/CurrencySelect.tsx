'use client'
import { useState, useRef, useEffect } from 'react'

export const CURRENCIES = [
  { code: 'AUD', symbol: 'A$' }, { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'NZD', symbol: 'NZ$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'SGD', symbol: 'S$' }, { code: 'JPY', symbol: '¥' },
  { code: 'INR', symbol: '₹' }, { code: 'AED', symbol: 'AED' },
  { code: 'ZAR', symbol: 'R' },
]

export function CurrencySelect({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const sel = CURRENCIES.find(c => c.code === value) ?? CURRENCIES[0]

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: compact ? '6px 10px' : '9px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
        {sel.symbol} {sel.code}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: '160px', overflow: 'hidden' }}>
          {CURRENCIES.map(c => (
            <button key={c.code} type="button" onClick={() => { onChange(c.code); setOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: c.code === value ? '#eff6ff' : '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', color: c.code === value ? '#2563eb' : '#0f172a', fontWeight: c.code === value ? '600' : '400', textAlign: 'left' }}>
              <span style={{ width: '28px', fontWeight: '600' }}>{c.symbol}</span>
              {c.code}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
