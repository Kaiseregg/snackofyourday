import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let ignore = false
    async function boot() {
      if (!supabase) {
        setAuthReady(true)
        return
      }
      const { data } = await supabase.auth.getUser()
      if (!ignore) setAuthUser(data?.user ?? null)
      setAuthReady(true)
    }
    boot()
    const { data: sub } = supabase?.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    }) || { data: { subscription: { unsubscribe() {} } } }
    return () => {
      ignore = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!supabase || !authUser) {
        setProfile(null)
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
      if (active) setProfile(data ?? null)
    }
    loadProfile()
    return () => { active = false }
  }, [authUser])

  const value = useMemo(() => ({ authUser, profile, authReady }), [authUser, profile, authReady])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
