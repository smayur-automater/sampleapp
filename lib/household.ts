'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
  const inFlight  = useRef(false)

  const load = useCallback(async () => {
    // Skip if already loading to avoid race conditions
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setCtx(null)
        setLoading(false)
        inFlight.current = false
        return
      }

      const { data: mb, error: mbErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mbErr) {
        setError(mbErr.message)
        setLoading(false)
        inFlight.current = false
        return
      }

      if (!mb?.household_id) {
        setCtx(null)
        setLoading(false)
        inFlight.current = false
        return
      }

      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) {
        setError(memsErr.message)
        setLoading(false)
        inFlight.current = false
        return
      }

      setCtx({
        household_id: mb.household_id,
        members: mems ?? [],
        myUserId: user.id,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    }

    setLoading(false)
    inFlight.current = false
  }, [])

  useEffect(() => {
    // 1. Try immediately — works if session is already in storage
    load()

    // 2. Also listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          inFlight.current = false // allow reload
          load()
        }
        if (event === 'SIGNED_OUT') {
          setCtx(null)
          setLoading(false)
          inFlight.current = false
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [load])

  return { ctx, loading, error, reload: load }
}
