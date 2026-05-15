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
  const didLoad   = useRef(false)
  const retryRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retries   = useRef(0)
  const MAX_RETRIES = 6  // retry up to 6x with increasing delay

  async function fetchHousehold(isRetry = false) {
    if (!isRetry) setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCtx(null)
        setLoading(false)
        retries.current = 0
        return
      }

      const { data: mb, error: mbErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (mbErr) {
        // Don't set error for "no rows" — that's handled below
        if (!mbErr.message.includes('JSON object')) {
          setError(mbErr.message)
        }
        setLoading(false)
        return
      }

      if (!mb?.household_id) {
        // No household yet — this is normal for brand new users
        // The handle_new_user trigger may still be running
        // Retry with backoff up to MAX_RETRIES times
        if (retries.current < MAX_RETRIES) {
          retries.current++
          const delay = Math.min(500 * retries.current, 3000) // 500ms, 1s, 1.5s ... up to 3s
          retryRef.current = setTimeout(() => fetchHousehold(true), delay)
          // Keep loading state during retries
          return
        }
        // Exhausted retries — household genuinely missing
        retries.current = 0
        setCtx(null)
        setLoading(false)
        return
      }

      // Found — reset retry counter
      retries.current = 0

      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) {
        setError(memsErr.message)
        setLoading(false)
        return
      }

      setCtx(prev => {
        const next = {
          household_id: mb.household_id,
          members: mems ?? [],
          myUserId: user.id,
        }
        if (
          prev &&
          prev.household_id === next.household_id &&
          prev.myUserId === next.myUserId &&
          JSON.stringify(prev.members) === JSON.stringify(next.members)
        ) {
          return prev
        }
        return next
      })
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load'
      // Swallow the "JSON object requested" Postgrest error —
      // it just means 0 rows which we handle above
      if (!msg.includes('JSON object') && !msg.includes('multiple')) {
        setError(msg)
      }
    }

    setLoading(false)
  }

  async function reload() {
    if (retryRef.current) clearTimeout(retryRef.current)
    retries.current = 0
    didLoad.current = false
    await fetchHousehold()
    didLoad.current = true
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' && !didLoad.current) {
          didLoad.current = true
          retries.current = 0
          await fetchHousehold()
        }
        if (event === 'SIGNED_OUT') {
          if (retryRef.current) clearTimeout(retryRef.current)
          setCtx(null)
          setLoading(false)
          didLoad.current = false
          retries.current = 0
        }
      }
    )

    if (!didLoad.current) {
      didLoad.current = true
      fetchHousehold()
    }

    return () => {
      subscription.unsubscribe()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { ctx, loading, error, reload }
}
