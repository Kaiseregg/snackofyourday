import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase.js'

export default function AdminLogin() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const login = async () => {
    setError('')
    setBusy(true)
    if (!supabase) {
      setBusy(false)
      setError('Supabase nicht konfiguriert (.env).')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    nav('/admin/dashboard')
  }

  return (
    <div className='center'>
      <div className='card hero' style={{ maxWidth: 520 }}>
        <h2>{t('admin')} — {t('login')}</h2>
        <label>{t('email')}<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t('password')}<input type='password' value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div className='error'>{error}</div>}
        <button className='primary full' disabled={busy} onClick={login}>{t('login')}</button>
      </div>
    </div>
  )
}
