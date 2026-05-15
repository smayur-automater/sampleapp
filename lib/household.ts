'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface Member {
  user_id: string
  display_name: string
  color: string
  role: string
}

export interface HouseholdContext {
  household_id: string
  members: Member[]
  myUserId: string
}

export function useHousehold() {
  const [ctx,     setCtx]     = useState<HouseholdContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const didLoad   = useRef(false)   // only load once per mount

  async function fetchHousehold() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCtx(null); setLoading(false); return }

      const { data: mb, error: mbErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mbErr) { setError(mbErr.message); setLoading(false); return }
      if (!mb?.household_id) { setCtx(null); setLoading(false); return }

      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) { setError(memsErr.message); setLoading(false); return }

      // Only update ctx if data actually changed — prevents unnecessary re-renders
      setCtx(prev => {
        const next = { household_id: mb.household_id, members: mems ?? [], myUserId: user.id }
        if (prev &&
            prev.household_id === next.household_id &&
            prev.myUserId === next.myUserId &&
            JSON.stringify(prev.members) === JSON.stringify(next.members)) {
          return prev  // same data — keep same reference, no re-render
        }
        return next
      })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    }
    setLoading(false)
  }

  async function reload() {
    didLoad.current = false
    await fetchHousehold()
    didLoad.current = true
  }

  useEffect(() => {
    // Subscribe once — only react to real sign-in/sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' && !didLoad.current) {
          didLoad.current = true
          await fetchHousehold()
        }
        if (event === 'SIGNED_OUT') {
          setCtx(null)
          setLoading(false)
          didLoad.current = false
        }
        // Deliberately ignore TOKEN_REFRESHED — it's not a state change
      }
    )

    // Also try immediately in case already signed in
    if (!didLoad.current) {
      didLoad.current = true
      fetchHousehold()
    }

    return () => subscription.unsubscribe()
  }, []) // empty deps — this effect runs exactly once per mount

  return { ctx, loading, error, reload }
}
