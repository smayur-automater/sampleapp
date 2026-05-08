'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export const CURRENCIES = [
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
]

export function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = CURRENCIES.find(c => c.code === value) || CURRENCIES[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#0f172a', fontFamily: 'inherit' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px' }}>{selected.symbol}</span>
        {selected.code}
        <ChevronDown size={13} color="#94a3b8" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: '200px' }}>
          {CURRENCIES.map(c => (
            <button key={c.code} type="button" onClick={() => { onChange(c.code); setOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: c.code === value ? '#eff6ff' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#1d4ed8', width: '24px' }}>{c.symbol}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{c.code}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
