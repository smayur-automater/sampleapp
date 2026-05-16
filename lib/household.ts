'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export interface Member {
  user_id: string
  display_name: string
  color: string
  role: string
}
export interface HouseholdCtx {
  household_id: string
  myUserId: string
  members: Member[]
}

export function useHousehold() {
  const [ctx,     setCtx]     = useState<HouseholdCtx | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const live       = useRef(true)
  const busy       = useRef(false)
  const retries    = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    if (!live.current || busy.current) return
    busy.current = true

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (live.current) { setCtx(null); setLoading(false) }
      busy.current = false; return
    }

    const { data, error: e } = await supabase
      .from('household_members')
      .select('household_id, display_name, color, role')
      .eq('user_id', user.id)

    if (e) {
      if (live.current) { setError(e.message); setLoading(false) }
      busy.current = false; return
    }

    if (!data || data.length === 0) {
      // Trigger may not have run yet — retry with backoff
      if (retries.current < 5) {
        retries.current++
        const delay = retries.current * 1000
        retryTimer.current = setTimeout(() => { busy.current = false; load() }, delay)
        return
      }
      if (live.current) { setCtx(null); setLoading(false) }
      busy.current = false; return
    }

    retries.current = 0
    const me = data[0]

    const { data: allMems } = await supabase
      .from('household_members')
      .select('user_id, display_name, color, role')
      .eq('household_id', me.household_id)

    if (live.current) {
      setCtx(prev => {
        const next = { household_id: me.household_id, myUserId: user.id, members: allMems ?? [] }
        if (!prev) return next
        if (prev.household_id === next.household_id && prev.myUserId === next.myUserId &&
            JSON.stringify(prev.members) === JSON.stringify(next.members)) return prev
        return next
      })
      setError(null)
      setLoading(false)
    }
    busy.current = false
  }

  async function reload() {
    if (retryTimer.current) clearTimeout(retryTimer.current)
    busy.current = false; retries.current = 0
    if (live.current) setLoading(true)
    await load()
  }

  useEffect(() => {
    live.current = true
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        busy.current = false; retries.current = 0
        if (live.current) setLoading(true)
        load()
      }
      if (event === 'SIGNED_OUT') {
        if (retryTimer.current) clearTimeout(retryTimer.current)
        busy.current = false; retries.current = 0
        if (live.current) { setCtx(null); setLoading(false); setError(null) }
      }
    })

    return () => {
      live.current = false
      subscription.unsubscribe()
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, []) // eslint-disable-line

  return { ctx, loading, error, reload }
}
