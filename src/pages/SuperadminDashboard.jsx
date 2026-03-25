import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/state'
import { assertSupabase } from '../lib/supabase'
import { slugify } from '../lib/utils'

const defaultForm = { display_name: '', slug: '', slot_count: 15, brand_color: '#1d4ed8', accent_color: '#0f172a' }

function ColorField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <div className='colorField'>
        <input type='color' value={value} onChange={(e) => onChange(e.target.value)} />
        <div className='colorPreview'>
          <span className='colorSwatch' style={{ background: value }} />
          <strong>{value}</strong>
        </div>
      </div>
    </label>
  )
}

export default function SuperadminDashboard() {
  const { authUser, profile, authReady } = useApp()
  const nav = useNavigate()
  const [tenants, setTenants] = useState([])
  const [profiles, setProfiles] = useState([])
  const [assign, setAssign] = useState({ email: '', tenant_id: '' })
  const [form, setForm] = useState(defaultForm)

  const allowed = profile?.role === 'superadmin'

  const load = async () => {
    const supabase = assertSupabase()
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (error) return alert(error.message)
    setTenants(data || [])
    const { data: pData } = await supabase.from('profiles').select('*').order('email')
    setProfiles(pData || [])
  }

  useEffect(() => { if (authReady && !authUser) nav('/superadmin/login') }, [authReady, authUser, nav])
  useEffect(() => { if (allowed) load() }, [allowed])

  if (!authReady) return <div className='panel'>Lädt…</div>
  if (!allowed) return <div className='panel errorBox'>Du bist nicht als Superadmin freigeschaltet.</div>

  const assignAdmin = async () => {
    const supabase = assertSupabase()
    const target = profiles.find((p) => (p.email || '').toLowerCase() === assign.email.toLowerCase())
    if (!target) return alert('Profil mit dieser E-Mail nicht gefunden. User muss sich zuerst einmal einloggen oder in Supabase Auth existieren.')
    const { error } = await supabase.from('profiles').update({ role: 'customer_admin', tenant_id: assign.tenant_id || null }).eq('id', target.id)
    if (error) return alert(error.message)
    setAssign({ email: '', tenant_id: '' })
    load()
  }

  const createTenant = async () => {
    const supabase = assertSupabase()
    const payload = {
      ...form,
      display_name: form.display_name.trim(),
      slug: slugify(form.slug || form.display_name),
      slot_count: Number(form.slot_count),
      brand_color: form.brand_color,
      accent_color: form.accent_color,
      is_active: true,
    }
    const { error } = await supabase.from('tenants').insert(payload)
    if (error) return alert(error.message)
    setForm(defaultForm)
    load()
  }

  return (
    <div className='stack'>
      <div className='panel listRow'><h2>Mandanten</h2><button className='pill ghost' onClick={async()=>{await assertSupabase().auth.signOut(); nav('/superadmin/login')}}>Logout</button></div>
      <div className='gridTwo'>
        <div className='panel'>
          <h3>Neuen Kunden anlegen</h3>
          <label>Firmenname<input value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})} /></label>
          <label>Slug<input value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} placeholder='swisscom' /></label>
          <label>Slots<select value={form.slot_count} onChange={(e)=>setForm({...form,slot_count:e.target.value})}><option>5</option><option>10</option><option>15</option><option>20</option><option>25</option></select></label>
          <ColorField label='Brand Color' value={form.brand_color} onChange={(brand_color) => setForm({ ...form, brand_color })} />
          <ColorField label='Accent Color' value={form.accent_color} onChange={(accent_color) => setForm({ ...form, accent_color })} />
          <div className='tenantPreviewCard' style={{ '--preview-brand': form.brand_color, '--preview-accent': form.accent_color }}>
            <div className='tenantPreviewEyebrow'>Vorschau</div>
            <strong>{form.display_name || 'Neuer Kunde'}</strong>
            <span>/{slugify(form.slug || form.display_name || 'kunde')}</span>
          </div>
          <button className='btn block' onClick={createTenant}>Kunde erstellen</button>
        </div>
        <div className='panel'>
          <h3>Bestehende Kunden</h3>
          <div className='stack'>
            {tenants.map((t)=><div className='panel nested' key={t.id}><div className='listRow'><div><strong>{t.display_name}</strong><div className='subtle'>/{t.slug} · {t.slot_count} Slots</div><div className='tenantColorRow'><span className='colorSwatch small' style={{ background:t.brand_color }} /><span className='colorSwatch small' style={{ background:t.accent_color }} /></div></div><Link className='pill' to={`/${t.slug}`}>Öffnen</Link></div></div>)}
          </div>
        </div>
      </div>
      <div className='panel'>
        <h3>Kunden-Admin zuweisen</h3>
        <label>E-Mail<input value={assign.email} onChange={(e)=>setAssign({...assign,email:e.target.value})} placeholder='kunde@firma.ch' /></label>
        <label>Kunde<select value={assign.tenant_id} onChange={(e)=>setAssign({...assign,tenant_id:e.target.value})}><option value=''>wählen</option>{tenants.map((t)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select></label>
        <button className='btn' onClick={assignAdmin}>Admin freischalten</button>
        <div className='stack' style={{marginTop:12}}>
          {profiles.map((p)=><div className='miniRow' key={p.id}><span>{p.email || p.id}</span><span>{p.role}{p.tenant_id ? ' · tenant' : ''}</span></div>)}
        </div>
      </div>
    </div>
  )
}
