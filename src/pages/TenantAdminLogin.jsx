import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assertSupabase } from '../lib/supabase'
import { tenantPath } from '../lib/paths'
import { getTenantBySlug } from '../lib/api'

export default function TenantAdminLogin() {
  const { tenantSlug } = useParams()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      await supabase.auth.signOut()
      setSuccess('Registrierung erstellt. Jetzt Hauptadmin bitten, deine E-Mail diesem Kunden als Admin zuzuweisen. Danach hier normal einloggen.')
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
        <button className={`pill ${mode === 'login' ? '' : 'ghost'}`} onClick={() => setMode('login')}>Login</button>
        <button className={`pill ${mode === 'register' ? '' : 'ghost'}`} onClick={() => setMode('register')}>Registrieren</button>
      </div>
      <h2>{mode === 'login' ? 'Kunden-Admin Login' : 'Kunden-Admin registrieren'}</h2>
      <div className='hintBox'>
        Ablauf: Kunde registriert sich zuerst hier einmal mit E-Mail + Passwort. Danach weist der Hauptadmin diese E-Mail dem Kunden zu. Erst dann funktioniert der Kunden-Admin Login.
      </div>
      <label>E-Mail<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Passwort<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <div className='errorText'>{error}</div>}
      {success && <div className='successText'>{success}</div>}
      <button className='btn block' disabled={busy} onClick={mode === 'login' ? login : register}>
        {busy ? 'Bitte warten…' : mode === 'login' ? 'Login' : 'Registrierung starten'}
      </button>
    </div>
  )
}
