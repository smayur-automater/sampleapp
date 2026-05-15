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
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retriesRef = useRef(0)
  const MAX_RETRIES = 5

  async function fetchHousehold() {
    // Prevent concurrent fetches
    if (loadingRef.current) return
    loadingRef.current = true

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (mountedRef.current) { setCtx(null); setLoading(false) }
        loadingRef.current = false
        return
      }

      // Query household_members — no optional columns, just core ones
      const { data: mb, error: mbErr } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      // Hard error (not "no rows") — surface it
      if (mbErr && !mbErr.message.includes('JSON object')) {
        if (mountedRef.current) { setError(mbErr.message); setLoading(false) }
        loadingRef.current = false
        return
      }

      if (!mb?.household_id) {
        // No household yet — retry with backoff for new users
        // (handle_new_user trigger may still be running)
        if (retriesRef.current < MAX_RETRIES) {
          retriesRef.current++
          const delay = retriesRef.current * 800 // 800ms, 1.6s, 2.4s, 3.2s, 4s
          retryRef.current = setTimeout(() => {
            loadingRef.current = false
            fetchHousehold()
          }, delay)
          return // stay in loading state
        }
        // Genuinely no household after all retries
        retriesRef.current = 0
        if (mountedRef.current) { setCtx(null); setLoading(false) }
        loadingRef.current = false
        return
      }

      retriesRef.current = 0

      // Load members — only columns that always exist
      const { data: mems, error: memsErr } = await supabase
        .from('household_members')
        .select('user_id, display_name, color, role')
        .eq('household_id', mb.household_id)

      if (memsErr) {
        if (mountedRef.current) { setError(memsErr.message); setLoading(false) }
        loadingRef.current = false
        return
      }

      if (mountedRef.current) {
        setCtx(prev => {
          const next: HouseholdContext = {
            household_id: mb.household_id,
            members: mems ?? [],
            myUserId: user.id,
          }
          if (
            prev &&
            prev.household_id === next.household_id &&
            prev.myUserId === next.myUserId &&
            JSON.stringify(prev.members) === JSON.stringify(next.members)
          ) return prev
          return next
        })
        setError(null)
        setLoading(false)
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error'
      if (!msg.includes('JSON object') && !msg.includes('multiple (or no)')) {
        if (mountedRef.current) setError(msg)
      }
      if (mountedRef.current) setLoading(false)
    }
    loadingRef.current = false
  }

  async function reload() {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }
    retriesRef.current = 0
    loadingRef.current = false
    if (mountedRef.current) setLoading(true)
    await fetchHousehold()
  }

  useEffect(() => {
    mountedRef.current = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Reset and fetch on sign in
        retriesRef.current = 0
        loadingRef.current = false
        if (mountedRef.current) setLoading(true)
        fetchHousehold()
      }
      if (event === 'SIGNED_OUT') {
        if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }
        retriesRef.current = 0
        loadingRef.current = false
        if (mountedRef.current) { setCtx(null); setLoading(false); setError(null) }
      }
    })

    // Initial load
    fetchHousehold()

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { ctx, loading, error, reload }
}
