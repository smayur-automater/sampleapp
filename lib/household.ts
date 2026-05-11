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

export function useHousehold(): { ctx: HouseholdContext | null; loading: boolean } {
  const [ctx, setCtx] = useState<HouseholdContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: m } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle()
      if (!m?.household_id) { setLoading(false); return }
      const { data: mems } = await supabase.from('household_members').select('user_id, display_name, color, role').eq('household_id', m.household_id)
      setCtx({ household_id: m.household_id, members: mems ?? [], myUserId: user.id })
      setLoading(false)
    })()
  }, [])

  return { ctx, loading }
}
