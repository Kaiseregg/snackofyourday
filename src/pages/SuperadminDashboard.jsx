import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../app/state'
import { assertSupabase } from '../lib/supabase'
import { slugify } from '../lib/utils'

const defaultForm = {
  display_name: '',
  slug: '',
  slot_count: 15,
  brand_color: '#2563eb',
  accent_color: '#0f172a',
  pickup_hint: '',
  order_notify_email: '',
  header_text: '',
  tagline: '',
}

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
        </div>
        <div className='actionRow wrap'>
          <a className='pill ghost' href={`mailto:?subject=${encodeURIComponent(`Vendora – ${tenant.display_name}`)}&body=${encodeURIComponent(`Kundenlink: ${window.location.origin}/${tenant.slug}`)}`}>E-Mail</a>
          <Link className='pill ghost' to={`/${tenant.slug}/admin/dashboard`}>Setup</Link>
          <Link className='pill' to={`/${tenant.slug}`}>Öffnen</Link>
          <button className='pill danger' onClick={() => onDelete(tenant)}>Löschen</button>
        </div>
      </div>
      <div className='formGrid topPad'>
        <label>Header
          <input value={local.header_text || ''} onChange={(e) => setLocal({ ...local, header_text: e.target.value })} placeholder='Snack Automat' />
        </label>
        <label>Tagline
          <input value={local.tagline || ''} onChange={(e) => setLocal({ ...local, tagline: e.target.value })} placeholder='Virtueller Firmenautomat' />
        </label>
        <label>Abholhinweis
          <input value={local.pickup_hint || ''} onChange={(e) => setLocal({ ...local, pickup_hint: e.target.value })} placeholder='z.B. Abholung beim Empfang bis 11:30 Uhr' />
        </label>
        <label>Bestell-E-Mail
          <input value={local.order_notify_email || ''} onChange={(e) => setLocal({ ...local, order_notify_email: e.target.value })} placeholder='bestellungen@firma.ch' />
        </label>
      </div>
      <div className='actionRow wrap topPad'>
        <button className='btn' onClick={() => onSave(local)}>Änderungen speichern</button>
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
    const body = encodeURIComponent(`Hallo,\n\ndu wurdest als Kunden-Admin für ${selectedTenant.display_name} vorgesehen.\n\n1. Öffne zuerst diesen Login-Link:\n${loginUrl}\n2. Klicke auf \"Registrieren\" und erstelle deinen Zugang.\n3. Bestätige deine E-Mail.\n4. Danach kann der Hauptadmin dich freischalten.\n\nViele Grüsse\nVendora`)
    window.open(`mailto:${assign.email}?subject=${subject}&body=${body}`)
  }

  const copyInvite = async () => {
    if (!selectedTenant) return alert('Bitte zuerst Kunde wählen.')
    await navigator.clipboard.writeText(`${window.location.origin}/${selectedTenant.slug}/admin/login`)
    alert('Login-Link kopiert.')
  }

  const assignAdmin = async () => {
    const supabase = assertSupabase()
    if (!assign.email || !assign.tenant_id) return alert('Bitte E-Mail und Kunde wählen.')
    const target = visibleProfiles.find((p) => (p.email || '').toLowerCase() === assign.email.toLowerCase())
    if (!target) return alert('Profil nicht gefunden. Der Kunde muss sich zuerst registrieren.')
    if ((target.email || '').toLowerCase() === currentUserEmail) return alert('Der aktuelle Superadmin darf nicht als Kunden-Admin dieses Mandanten freigeschaltet werden.')
    if (target.role === 'superadmin') return alert('Ein Superadmin darf nicht als Kunden-Admin zugewiesen werden.')
    const { error } = await supabase.from('profiles').update({ role: 'customer_admin', tenant_id: assign.tenant_id }).eq('id', target.id)
    if (error) return alert(error.message)
    setAssign({ email: '', tenant_id: '' })
    load()
    alert('Kunden-Admin freigeschaltet.')
  }

  const seedTenantDefaults = async (tenantId) => {
    const supabase = assertSupabase()
    await supabase.from('tenant_payment_methods').insert([
      { tenant_id: tenantId, type: 'twint', label: 'TWINT Business', instructions: 'TWINT-Zahlung gemäss Firmenvorgabe.', sort_order: 1, is_active: true },
      { tenant_id: tenantId, type: 'card', label: 'Kredit-/Debitkarte', instructions: 'Stripe-ready Struktur vorbereitet.', sort_order: 2, is_active: true },
      { tenant_id: tenantId, type: 'invoice', label: 'Monatsabrechnung', instructions: 'Interne Monatsabrechnung für diesen Kunden.', sort_order: 3, is_active: true },
      { tenant_id: tenantId, type: 'other', label: 'TWINT Telefonnummer', instructions: 'Manuelle TWINT Zahlung ohne Verifikation.', sort_order: 4, is_active: false },
    ])
    await supabase.from('tenant_pickup_locations').insert({ tenant_id: tenantId, label: 'Hauptstandort', details: 'Standard Abholort für neue Kunden.', sort_order: 1, is_active: true })
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
      header_text: form.header_text || form.display_name || null,
      tagline: form.tagline || 'Virtueller Firmenautomat',
      welcome_text: 'Willkommen bei eurem digitalen Firmenautomaten.',
      background_type: 'gradient',
      background_value: `linear-gradient(135deg, ${form.brand_color}, ${form.accent_color})`,
      machine_frame_style: 'glass',
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
      tagline: tenant.tagline || null,
      header_text: tenant.header_text || null,
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
      <div className='panel listRow'><h2>V6 Kundenverwaltung</h2><button className='pill ghost' onClick={async()=>{await assertSupabase().auth.signOut(); nav('/superadmin/login')}}>Logout</button></div>
      <div className='gridTwo'>
        <div className='panel'>
          <h3>Neuen Kunden anlegen</h3>
          <label>Firmenname<input value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})} /></label>
          <label>Slug<input value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} placeholder='swisscom' /></label>
          <label>Header<input value={form.header_text} onChange={(e)=>setForm({...form,header_text:e.target.value})} placeholder='Firmenautomat' /></label>
          <label>Tagline<input value={form.tagline} onChange={(e)=>setForm({...form,tagline:e.target.value})} placeholder='Snacks & Drinks' /></label>
          <label>Slots<select value={form.slot_count} onChange={(e)=>setForm({...form,slot_count:e.target.value})}><option>5</option><option>10</option><option>15</option><option>20</option><option>25</option></select></label>
          <ColorField label='Primary Color' value={form.brand_color} onChange={(brand_color) => setForm({ ...form, brand_color })} />
          <ColorField label='Accent Color' value={form.accent_color} onChange={(accent_color) => setForm({ ...form, accent_color })} />
          <label>Abholhinweis<input value={form.pickup_hint} onChange={(e)=>setForm({...form,pickup_hint:e.target.value})} placeholder='z.B. Abholung beim Empfang' /></label>
          <label>Bestell-E-Mail<input value={form.order_notify_email} onChange={(e)=>setForm({...form,order_notify_email:e.target.value})} placeholder='bestellungen@firma.ch' /></label>
          <div className='tenantPreviewCard' style={{ '--preview-brand': form.brand_color, '--preview-accent': form.accent_color }}>
            <div className='tenantPreviewEyebrow'>V6 Vorschau</div>
            <strong>{form.header_text || form.display_name || 'Neuer Kunde'}</strong>
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
        <div className='hintBox'>Ablauf: Einladungs-Mail schicken → Kunde registriert sich → danach hier freischalten.</div>
        <div className='stack topPad'>
          {visibleProfiles.map((p)=><div className='miniRow' key={p.id}><span>{p.email || p.id}</span><span>{p.role}{p.tenant_id ? ' · tenant' : ''}</span></div>)}
        </div>
      </div>
    </div>
  )
}
