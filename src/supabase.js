
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function getCurrentProfile() {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return { user: null, profile: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return { user, profile }
}

export function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function money(n) {
  const v = Number(n || 0)
  return `${v.toFixed(2)} CHF`
}

export function parsePickupOptions(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value).split('\n').map(v => v.trim()).filter(Boolean)
}

export async function uploadToBucket(file, folder='uploads') {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('vendora-assets').upload(path, file, {
    upsert: true,
    cacheControl: '3600'
  })
  if (error) throw error
  const { data } = supabase.storage.from('vendora-assets').getPublicUrl(path)
  return data.publicUrl
}
