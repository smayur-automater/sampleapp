'use client'
import { useEffect, useState, useCallback } from 'react'
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // getUser() hits the server to validate — more reliable than getSession()
      // for the initial load after a page refresh
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) { setLoading(false); return }

      const userId = user.id

      // Find this user's household
      const { data: mb, error: mbErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (mbErr) { setError(mbErr.message); setLoading(false); return }
      if (!mb?.household_id) { setLoading(false); return }

      // Load all members of that household
      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) { setError(memsErr.message); setLoading(false); return }

      setCtx({
        household_id: mb.household_id,
        members: mems ?? [],
        myUserId: userId,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load household')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Listen for auth state — run load() as soon as we have a confirmed session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          load()
        } else if (event === 'SIGNED_OUT') {
          setCtx(null)
          setLoading(false)
        }
      }
    )

    // Also attempt immediately in case session is already restored
    load()

    return () => subscription.unsubscribe()
  }, [load])

  return { ctx, loading, error, reload: load }
}
