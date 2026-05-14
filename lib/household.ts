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
  const loadingRef = useRef(false)   // prevent concurrent loads

  const load = useCallback(async () => {
    // Prevent double-loading
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCtx(null)
        setLoading(false)
        loadingRef.current = false
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
        loadingRef.current = false
        return
      }

      if (!mb?.household_id) {
        // User has no household yet — not an error, just show empty state
        setCtx(null)
        setLoading(false)
        loadingRef.current = false
        return
      }

      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) {
        setError(memsErr.message)
        setLoading(false)
        loadingRef.current = false
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
    loadingRef.current = false
  }, [])

  useEffect(() => {
    let mounted = true

    // onAuthStateChange fires on page load with INITIAL_SESSION
    // This is the single source of truth — don't call load() separately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (session?.user) {
          await load()
        } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' && !session) {
          setCtx(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [load])

  return { ctx, loading, error, reload: load }
}
