import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assertSupabase } from '../lib/supabase'

export default function SuperadminLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const login = async () => {
    setBusy(true); setError('')
    try {
      const supabase = assertSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      nav('/superadmin/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='panel authCard'>
      <h2>Superadmin Login</h2>
      <label>E-Mail<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Passwort<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <div className='errorText'>{error}</div>}
      <button className='btn block' disabled={busy} onClick={login}>Login</button>
    </div>
  )
}
