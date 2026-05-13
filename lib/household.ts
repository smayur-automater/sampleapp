'use client'
import { useEffect, useState } from 'react'
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
  const [ctx, setCtx] = useState<HouseholdContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Get current user - use getSession which is faster than getUser
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoading(false); return }

      const userId = session.user.id

      const { data: mb, error: mbErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (mbErr) { setError(mbErr.message); setLoading(false); return }
      if (!mb?.household_id) { setLoading(false); return }

      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) { setError(memsErr.message); setLoading(false); return }

      setCtx({ household_id: mb.household_id, members: mems ?? [], myUserId: userId })
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { ctx, loading, error, reload: load }
}
