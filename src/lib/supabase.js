import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anon ? createClient(url, anon) : null

export function assertSupabase() {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
  return supabase
}
