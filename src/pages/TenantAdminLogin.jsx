import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../app/state'
import { assertSupabase } from '../lib/supabase'
import { tenantPath } from '../lib/paths'
import { getTenantBySlug } from '../lib/api'

export default function TenantAdminLogin() {
  const { tenantSlug } = useParams()
  const nav = useNavigate()
  const { authUser, profile } = useApp()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      setError('Superadmin-Zugänge dürfen nicht als Kunden-Admin verwendet werden. Bitte separaten Kunden-Admin-Account benutzen.')
    }
  }, [profile])

  const login = async () => {
    setBusy(true); setError(''); setSuccess('')
    try {
      const supabase = assertSupabase()
      const tenant = await getTenantBySlug(tenantSlug)
      if (!tenant) throw new Error('Kunde nicht gefunden.')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const user = data?.user
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      const allowed = profile?.role === 'customer_admin' && profile?.tenant_id === tenant.id
      if (!allowed) {
        await supabase.auth.signOut()
        throw new Error('Dieser Login ist nur für den freigeschalteten Kunden-Admin dieses Mandanten. Bitte zuerst registrieren und vom Hauptadmin freischalten lassen.')
      }
      nav(tenantPath(tenantSlug, '/admin/dashboard'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const register = async () => {
    setBusy(true); setError(''); setSuccess('')
    try {
      const supabase = assertSupabase()
      const redirect = `${window.location.origin}${tenantPath(tenantSlug, '/admin/login')}`
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirect },
      })
      if (error) throw error
      await supabase.auth.signOut()
      setSuccess(`Registrierung erstellt. Prüfe jetzt deine E-Mail und bestätige den Account. Danach Hauptadmin bitten, deine E-Mail diesem Kunden als Admin zuzuweisen. Login-Link: ${redirect}`)
      setMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='panel authCard'>
      <div className='tabLine'>
        <button className={`tabButton ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
        <button className={`tabButton ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Registrieren</button>
      </div>
      <h2>{mode === 'login' ? 'Kunden-Admin Login' : 'Kunden-Admin registrieren'}</h2>
      <div className='hintBox'>
        Ablauf: Kunde registriert sich zuerst hier einmal mit E-Mail + Passwort. Danach weist der Hauptadmin diese E-Mail dem Kunden zu. Erst dann funktioniert der Kunden-Admin Login.
      </div>
      <label>E-Mail<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Passwort<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <div className='errorText'>{error}</div>}
      {success && <div className='successText'>{success}</div>}
      <button className='btn block' disabled={busy || profile?.role === 'superadmin'} onClick={mode === 'login' ? login : register}>
        {busy ? 'Bitte warten…' : mode === 'login' ? 'Login' : 'Registrierung starten'}
      </button>
    </div>
  )
}
