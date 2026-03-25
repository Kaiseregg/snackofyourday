import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/state'
import { assertSupabase } from '../lib/supabase'
import { slugify } from '../lib/utils'

const defaultForm = { display_name: '', slug: '', slot_count: 15, brand_color: '#1d4ed8', accent_color: '#0f172a', pickup_hint: '', order_notify_email: '' }

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

function TenantSettingsCard({ tenant, onSave, onDelete }) {
  const [local, setLocal] = useState(tenant)
  useEffect(() => setLocal(tenant), [tenant])

  return (
    <div className='panel nested' key={tenant.id}>
      <div className='listRow'>
        <div>
          <strong>{tenant.display_name}</strong>
          <div className='subtle'>/{tenant.slug} · {tenant.slot_count} Slots</div>
          <div className='tenantColorRow'>
            <span className='colorSwatch small' style={{ background: local.brand_color }} />
            <span className='colorSwatch small' style={{ background: local.accent_color }} />
          </div>
        </div>
        <div className='actionRow wrap'>
          <a className='pill ghost' href={`mailto:?subject=${encodeURIComponent(`SnackOfYourDay – ${tenant.display_name}`)}&body=${encodeURIComponent(`Kundenlink: ${window.location.origin}/${tenant.slug}`)}`}>E-Mail</a>
          <Link className='pill' to={`/${tenant.slug}`}>Öffnen</Link>
          <button className='pill danger' onClick={() => onDelete(tenant)}>Löschen</button>
        </div>
      </div>
      <div className='formGrid topPad'>
        <label>Abholhinweis
          <input value={local.pickup_hint || ''} onChange={(e) => setLocal({ ...local, pickup_hint: e.target.value })} placeholder='z.B. Abholung beim Empfang bis 11:30 Uhr' />
        </label>
        <label>Bestell-E-Mail
          <input value={local.order_notify_email || ''} onChange={(e) => setLocal({ ...local, order_notify_email: e.target.value })} placeholder='bestellungen@firma.ch' />
        </label>
        <label>Willkommens-Text
          <input value={local.welcome_text || ''} onChange={(e) => setLocal({ ...local, welcome_text: e.target.value })} placeholder='Willkommen im Firmenautomaten.' />
        </label>
        <label>Tagline
          <input value={local.tagline || ''} onChange={(e) => setLocal({ ...local, tagline: e.target.value })} placeholder='Virtueller Firmenautomat' />
        </label>
      </div>
      <div className='actionRow wrap topPad'>
        <button className='btn' onClick={() => onSave(local)}>Änderungen speichern</button>
        <div className='subtle'>Automatische E-Mail-Benachrichtigung wird in der nächsten Server-Version ergänzt. Bestellungen sind bereits im Kunden-Admin sichtbar.</div>
      </div>
    </div>
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
  const currentUserEmail = (profile?.email || authUser?.email || '').toLowerCase()
  const visibleProfiles = useMemo(() => profiles.filter(Boolean), [profiles])

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

  const selectedTenant = tenants.find((t) => t.id === assign.tenant_id)

  const sendInvite = () => {
    if (!assign.email || !selectedTenant) return alert('Bitte E-Mail und Kunde wählen.')
    const loginUrl = `${window.location.origin}/${selectedTenant.slug}/admin/login`
    const subject = encodeURIComponent(`Kunden-Admin Zugang für ${selectedTenant.display_name}`)
    const body = encodeURIComponent(`Hallo,

du wurdest als Kunden-Admin für ${selectedTenant.display_name} vorgesehen.

1. Öffne zuerst diesen Login-Link:
${loginUrl}
2. Klicke auf "Registrieren" und erstelle deinen Zugang.
3. Bestätige die E-Mail, falls du eine Bestätigungs-Mail erhältst.
4. Danach kann der Hauptadmin dich hier freischalten.

Viele Grüsse
SnackOfYourDay`)
    window.open(`mailto:${assign.email}?subject=${subject}&body=${body}`)
  }

  const copyInvite = async () => {
    if (!selectedTenant) return alert('Bitte zuerst Kunde wählen.')
    const loginUrl = `${window.location.origin}/${selectedTenant.slug}/admin/login`
    await navigator.clipboard.writeText(loginUrl)
    alert('Login-Link kopiert.')
  }

  const assignAdmin = async () => {
    const supabase = assertSupabase()
    if (!assign.email || !assign.tenant_id) return alert('Bitte E-Mail und Kunde wählen.')
    const target = visibleProfiles.find((p) => (p.email || '').toLowerCase() === assign.email.toLowerCase())
    if (!target) {
      return alert('Profil mit dieser E-Mail nicht gefunden. User muss sich zuerst einmal über den Login-Link registrieren oder in Supabase Auth existieren. Nutze unten „Einladungs-Mail“ oder „Login-Link kopieren“.')
    }
    if ((target.email || '').toLowerCase() === currentUserEmail) return alert('Der aktuelle Superadmin darf nicht als Kunden-Admin dieses Mandanten freigeschaltet werden.')
    if (target.role === 'superadmin') return alert('Ein Superadmin darf nicht als Kunden-Admin zugewiesen werden. Bitte eine separate Kunden-E-Mail verwenden.')
    const { error } = await supabase.from('profiles').update({ role: 'customer_admin', tenant_id: assign.tenant_id }).eq('id', target.id)
    if (error) return alert(error.message)
    setAssign({ email: '', tenant_id: '' })
    load()
    alert('Kunden-Admin freigeschaltet.')
  }

  const seedTenantDefaults = async (tenantId) => {
    const supabase = assertSupabase()
    const methods = [
      { tenant_id: tenantId, type: 'twint', label: 'TWINT', instructions: 'TWINT-Zahlung gemäss Firmenvorgabe.', sort_order: 1, is_active: true },
      { tenant_id: tenantId, type: 'card', label: 'Karte', instructions: 'Kartenzahlung gemäss Firmenvorgabe.', sort_order: 2, is_active: true },
      { tenant_id: tenantId, type: 'other', label: 'Abholung', instructions: 'Bestellung wird nach Bestätigung bereitgestellt.', sort_order: 3, is_active: true },
    ]
    await supabase.from('tenant_payment_methods').insert(methods)
  }

  const createTenant = async () => {
    const supabase = assertSupabase()
    const payload = {
      display_name: form.display_name.trim(),
      slug: slugify(form.slug || form.display_name),
      slot_count: Number(form.slot_count),
      brand_color: form.brand_color,
      accent_color: form.accent_color,
      pickup_hint: form.pickup_hint || null,
      order_notify_email: form.order_notify_email || null,
      tagline: 'Virtueller Firmenautomat',
      welcome_text: form.welcome_text || null,
      is_active: true,
    }
    const { data, error } = await supabase.from('tenants').insert(payload).select('*').single()
    if (error) return alert(error.message)
    await seedTenantDefaults(data.id)
    setForm(defaultForm)
    load()
  }

  const saveTenant = async (tenant) => {
    const { error } = await assertSupabase().from('tenants').update({
      pickup_hint: tenant.pickup_hint || null,
      order_notify_email: tenant.order_notify_email || null,
      welcome_text: tenant.welcome_text || null,
      tagline: tenant.tagline || null,
    }).eq('id', tenant.id)
    if (error) return alert(error.message)
    load()
    alert('Kunden-Einstellungen gespeichert.')
  }

  const deleteTenant = async (tenant) => {
    const check = window.prompt(`Zum Löschen bitte den Slug eingeben: ${tenant.slug}`)
    if (check !== tenant.slug) return
    const { error } = await assertSupabase().from('tenants').delete().eq('id', tenant.id)
    if (error) return alert(error.message)
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
          <label>Abholhinweis<input value={form.pickup_hint} onChange={(e)=>setForm({...form,pickup_hint:e.target.value})} placeholder='z.B. Abholung beim Empfang' /></label>
          <label>Bestell-E-Mail<input value={form.order_notify_email} onChange={(e)=>setForm({...form,order_notify_email:e.target.value})} placeholder='bestellungen@firma.ch' /></label>
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
            {tenants.map((t)=><TenantSettingsCard key={t.id} tenant={t} onSave={saveTenant} onDelete={deleteTenant} />)}
          </div>
        </div>
      </div>
      <div className='panel'>
        <h3>Kunden-Admin zuweisen</h3>
        <label>E-Mail<input value={assign.email} onChange={(e)=>setAssign({...assign,email:e.target.value})} placeholder='kunde@firma.ch' /></label>
        <label>Kunde<select value={assign.tenant_id} onChange={(e)=>setAssign({...assign,tenant_id:e.target.value})}><option value=''>wählen</option>{tenants.map((t)=><option key={t.id} value={t.id}>{t.display_name}</option>)}</select></label>
        <div className='actionRow wrap'>
          <button className='btn' onClick={assignAdmin}>Admin freischalten</button>
          <button className='pill ghost' onClick={sendInvite}>Einladungs-Mail</button>
          <button className='pill ghost' onClick={copyInvite}>Login-Link kopieren</button>
        </div>
        <div className='hintBox'>Ablauf: Zuerst Einladungs-Mail schicken → Kunde registriert sich auf der Login-Seite über den Tab „Registrieren“ → E-Mail bestätigen → danach hier Admin freischalten.</div>
        <div className='stack' style={{marginTop:12}}>
          {visibleProfiles.map((p)=><div className='miniRow' key={p.id}><span>{p.email || p.id}</span><span>{p.role}{p.tenant_id ? ' · tenant' : ''}</span></div>)}
        </div>
      </div>
    </div>
  )
}
