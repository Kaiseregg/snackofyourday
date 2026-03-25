
import { Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { supabase, getCurrentProfile, slugify, money, parsePickupOptions, uploadToBucket } from './supabase'

function Shell({ children }) {
  return <div className="app-shell">{children}</div>
}

function useAuthProfile() {
  const [state, setState] = useState({ loading: true, user: null, profile: null })
  useEffect(() => {
    let mounted = true
    async function load() {
      const data = await getCurrentProfile()
      if (mounted) setState({ loading: false, ...data })
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])
  return state
}

function TopBar({ title, right }) {
  return (
    <div className="topbar">
      <div>
        <div className="eyebrow">SnackOfYourDay V6</div>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">{right}</div>
    </div>
  )
}

function Button({ children, variant='primary', ...props }) {
  return <button className={`btn ${variant}`} {...props}>{children}</button>
}
function Card({ children, className='' }) { return <div className={`card ${className}`}>{children}</div> }
function Field({ label, children, help }) {
  return <label className="field"><span>{label}</span>{children}{help ? <small>{help}</small> : null}</label>
}

function SuperAdminLogin() {
  const navigate = useNavigate()
  const auth = useAuthProfile()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!auth.loading && auth.profile?.role === 'superadmin') navigate('/superadmin')
  }, [auth.loading, auth.profile, navigate])

  async function login(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    const { profile } = await getCurrentProfile()
    if (profile?.role !== 'superadmin') {
      await supabase.auth.signOut()
      return setError('Dieser Login ist nur für Superadmin.')
    }
    navigate('/superadmin')
  }

  return <Shell>
    <div className="center-wrap">
      <Card className="auth-card">
        <TopBar title="Superadmin Login" />
        <form onSubmit={login} className="stack">
          <Field label="E-Mail"><input value={email} onChange={e=>setEmail(e.target.value)} /></Field>
          <Field label="Passwort"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></Field>
          {error ? <div className="error">{error}</div> : null}
          <Button type="submit">Einloggen</Button>
        </form>
      </Card>
    </div>
  </Shell>
}

function RequireSuperAdmin({ children }) {
  const auth = useAuthProfile()
  if (auth.loading) return <Shell><div className="loading">Lädt…</div></Shell>
  if (auth.profile?.role !== 'superadmin') return <Navigate to="/superadmin/login" replace />
  return children
}

function SuperAdminHome() {
  const navigate = useNavigate()
  const auth = useAuthProfile()
  const [tenants, setTenants] = useState([])
  const [form, setForm] = useState({
    name: '',
    slug: '',
    slot_count: 15,
    brand_color: '#0f172a',
    accent_color: '#22c55e'
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (!error) setTenants(data || [])
  }

  useEffect(() => { load() }, [])

  async function createTenant(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      name: form.name,
      slug: slugify(form.slug || form.name),
      slot_count: Number(form.slot_count || 15),
      brand_color: form.brand_color,
      accent_color: form.accent_color,
      header_text: form.name,
      tagline: 'Willkommen am Automaten',
      frame_color: '#111827',
      pickup_options: 'Empfang',
      payment_settings: {
        invoice_enabled: true,
        twint_phone_enabled: false,
        stripe_enabled: false,
        twint_business_enabled: false,
        card_enabled: false,
        twint_phone_number: '',
        stripe_account_id: '',
        stripe_publishable_key: ''
      }
    }
    const { error } = await supabase.from('tenants').insert(payload)
    setBusy(false)
    if (error) return setError(error.message)
    setForm({ name:'', slug:'', slot_count:15, brand_color:'#0f172a', accent_color:'#22c55e' })
    load()
  }

  async function deleteTenant(id) {
    const ok = window.confirm('Kunde wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')
    if (!ok) return
    const { error } = await supabase.from('tenants').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function logout() {
    await supabase.auth.signOut()
    navigate('/superadmin/login')
  }

  return <Shell>
    <div className="container">
      <TopBar title="Superadmin Dashboard" right={<Button variant="secondary" onClick={logout}>Logout</Button>} />
      <div className="admin-grid">
        <Card>
          <h2>Neuen Kunden erstellen</h2>
          <form className="stack" onSubmit={createTenant}>
            <Field label="Firmenname"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value, slug: slugify(e.target.value)})} /></Field>
            <Field label="Slug"><input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} /></Field>
            <Field label="Anzahl Slots"><input type="number" min="1" value={form.slot_count} onChange={e=>setForm({...form,slot_count:e.target.value})} /></Field>
            <div className="two-col">
              <Field label="Hauptfarbe"><input type="color" value={form.brand_color} onChange={e=>setForm({...form,brand_color:e.target.value})} /></Field>
              <Field label="Akzentfarbe"><input type="color" value={form.accent_color} onChange={e=>setForm({...form,accent_color:e.target.value})} /></Field>
            </div>
            {error ? <div className="error">{error}</div> : null}
            <Button disabled={busy}>{busy ? 'Speichert…' : 'Kunde erstellen'}</Button>
          </form>
        </Card>

        <Card>
          <h2>Bestehende Kunden</h2>
          <div className="tenant-list">
            {tenants.map(t => (
              <div className="tenant-row" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <div className="muted">/{t.slug} · {t.slot_count || 15} Slots</div>
                </div>
                <div className="row-actions">
                  <Button variant="ghost" onClick={()=>navigate(`/setup/${t.slug}`)}>Bearbeiten</Button>
                  <Button variant="ghost" onClick={()=>window.open(`/${t.slug}`,'_blank')}>Öffnen</Button>
                  <Button variant="ghost" onClick={()=>window.location.href=`mailto:${t.order_notify_email || ''}`}>E-Mail</Button>
                  <Button variant="danger" onClick={()=>deleteTenant(t.id)}>Löschen</Button>
                </div>
              </div>
            ))}
            {tenants.length === 0 ? <div className="muted">Noch keine Kunden vorhanden.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  </Shell>
}

function SetupSidebar({ slug }) {
  return (
    <div className="setup-sidebar">
      <Link to="/superadmin" className="side-link">← Zurück</Link>
      <Link to={`/setup/${slug}`} className="side-link">Design & Texte</Link>
      <Link to={`/setup/${slug}?tab=products`} className="side-link">Produkte</Link>
      <Link to={`/setup/${slug}?tab=slots`} className="side-link">Slots</Link>
      <Link to={`/setup/${slug}?tab=orders`} className="side-link">Bestellungen</Link>
      <Link to={`/setup/${slug}?tab=admins`} className="side-link">Kunden-Admins</Link>
      <Link to={`/setup/${slug}?tab=payments`} className="side-link">Zahlungsarten</Link>
    </div>
  )
}

function CustomerSetup() {
  const { slug } = useParams()
  const [tenant, setTenant] = useState(null)
  const [products, setProducts] = useState([])
  const [slots, setSlots] = useState([])
  const [orders, setOrders] = useState([])
  const [adminEmail, setAdminEmail] = useState('')
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'design')
  const [newProduct, setNewProduct] = useState({ name:'', price:'', image_url:'', active:true })
  const auth = useAuthProfile()

  useEffect(() => {
    const onPop = () => setTab(new URLSearchParams(window.location.search).get('tab') || 'design')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  async function load() {
    const { data: t } = await supabase.from('tenants').select('*').eq('slug', slug).single()
    setTenant(t)
    if (!t) return
    const { data: p } = await supabase.from('products').select('*').eq('tenant_id', t.id).order('created_at', { ascending: true })
    setProducts(p || [])
    const { data: s } = await supabase.from('tenant_slots').select('*').eq('tenant_id', t.id).order('slot_number')
    const normalized = []
    for (let i=1;i<Number(t.slot_count || 15)+1;i++) {
      const found = (s || []).find(x=>x.slot_number===i)
      normalized.push(found || { tenant_id:t.id, slot_number:i, product_id:null })
    }
    setSlots(normalized)
    const { data: o } = await supabase.from('orders').select('*').eq('tenant_id', t.id).order('created_at', { ascending:false })
    setOrders(o || [])
    document.title = `${t.name} · Setup`
  }
  useEffect(()=>{ load() }, [slug])

  if (!tenant) return <Shell><div className="loading">Lädt…</div></Shell>

  async function saveTenant() {
    const payload = { ...tenant }
    const { error } = await supabase.from('tenants').update(payload).eq('id', tenant.id)
    if (error) return alert(error.message)
    alert('Gespeichert')
    load()
  }

  async function uploadTenantImage(field, file) {
    try {
      const url = await uploadToBucket(file, `tenants/${tenant.slug}`)
      setTenant(prev => ({ ...prev, [field]: url }))
    } catch (e) {
      alert(e.message)
    }
  }

  async function createProduct(e) {
    e.preventDefault()
    const payload = {
      tenant_id: tenant.id,
      name: newProduct.name,
      price: Number(newProduct.price || 0),
      image_url: newProduct.image_url || null,
      active: !!newProduct.active
    }
    const { error } = await supabase.from('products').insert(payload)
    if (error) return alert(error.message)
    setNewProduct({ name:'', price:'', image_url:'', active:true })
    load()
  }

  async function saveProduct(prod) {
    const { error } = await supabase.from('products').update(prod).eq('id', prod.id)
    if (error) return alert(error.message)
    load()
  }
  async function deleteProduct(id) {
    if (!window.confirm('Produkt löschen?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return alert(error.message)
    load()
  }
  async function uploadProductImage(file) {
    try {
      const url = await uploadToBucket(file, `products/${tenant.slug}`)
      setNewProduct(prev => ({ ...prev, image_url: url }))
    } catch (e) { alert(e.message) }
  }

  async function saveSlot(slot) {
    const exists = slot.id
    const payload = { tenant_id: tenant.id, slot_number: slot.slot_number, product_id: slot.product_id || null }
    const query = exists
      ? supabase.from('tenant_slots').update(payload).eq('tenant_id', tenant.id).eq('slot_number', slot.slot_number)
      : supabase.from('tenant_slots').insert(payload)
    const { error } = await query
    if (error) return alert(error.message)
    load()
  }

  async function assignCustomerAdmin() {
    if (!adminEmail) return
    if (auth.profile?.email && adminEmail.toLowerCase() === auth.profile.email.toLowerCase()) {
      return alert('Deine Superadmin E-Mail darf nicht als Kunden-Admin zugewiesen werden.')
    }
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('email', adminEmail).single()
    if (error || !profile) return alert('Dieser Benutzer existiert noch nicht. Kunde muss sich zuerst registrieren.')
    if (profile.role === 'superadmin') return alert('Superadmin darf nicht als Kunden-Admin zugewiesen werden.')
    const { error: upErr } = await supabase.from('profiles').update({ role: 'customer_admin', tenant_id: tenant.id }).eq('id', profile.id)
    if (upErr) return alert(upErr.message)
    alert('Kunden-Admin freigeschaltet.')
    setAdminEmail('')
  }

  const paymentSettings = tenant.payment_settings || {}

  return <Shell>
    <div className="setup-layout">
      <SetupSidebar slug={slug} />
      <div className="setup-main">
        <TopBar title={`${tenant.name} · Kunden-Setup`} right={<>
          <Button variant="secondary" onClick={()=>window.open(`/${tenant.slug}`,'_blank')}>Automat öffnen</Button>
          <Button onClick={saveTenant}>Alles speichern</Button>
        </>} />
        {tab === 'design' && <div className="stack">
          <Card>
            <h2>Branding & Design</h2>
            <div className="two-col">
              <Field label="Firmenname"><input value={tenant.name || ''} onChange={e=>setTenant({...tenant,name:e.target.value})} /></Field>
              <Field label="Slug"><input value={tenant.slug || ''} onChange={e=>setTenant({...tenant,slug:slugify(e.target.value)})} /></Field>
            </div>
            <div className="two-col">
              <Field label="Header-Text"><input value={tenant.header_text || ''} onChange={e=>setTenant({...tenant,header_text:e.target.value})} /></Field>
              <Field label="Untertitel"><input value={tenant.tagline || ''} onChange={e=>setTenant({...tenant,tagline:e.target.value})} /></Field>
            </div>
            <div className="two-col">
              <Field label="Hauptfarbe"><input type="color" value={tenant.brand_color || '#0f172a'} onChange={e=>setTenant({...tenant,brand_color:e.target.value})} /></Field>
              <Field label="Akzentfarbe"><input type="color" value={tenant.accent_color || '#22c55e'} onChange={e=>setTenant({...tenant,accent_color:e.target.value})} /></Field>
            </div>
            <div className="two-col">
              <Field label="Rahmenfarbe"><input type="color" value={tenant.frame_color || '#111827'} onChange={e=>setTenant({...tenant,frame_color:e.target.value})} /></Field>
              <Field label="Anzahl Slots"><input type="number" value={tenant.slot_count || 15} onChange={e=>setTenant({...tenant,slot_count:Number(e.target.value)})} /></Field>
            </div>
            <div className="two-col">
              <Field label="Logo hochladen">
                <input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && uploadTenantImage('logo_url', e.target.files[0])} />
                {tenant.logo_url ? <img className="thumb" src={tenant.logo_url} /> : null}
              </Field>
              <Field label="Hintergrundbild hochladen">
                <input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && uploadTenantImage('background_image_url', e.target.files[0])} />
                {tenant.background_image_url ? <img className="thumb" src={tenant.background_image_url} /> : null}
              </Field>
            </div>
            <div className="two-col">
              <Field label="Rahmenbild hochladen">
                <input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && uploadTenantImage('frame_image_url', e.target.files[0])} />
                {tenant.frame_image_url ? <img className="thumb" src={tenant.frame_image_url} /> : null}
              </Field>
              <Field label="Eigenen Text im oberen Bereich">
                <textarea rows="5" value={tenant.customer_header_note || ''} onChange={e=>setTenant({...tenant,customer_header_note:e.target.value})} />
              </Field>
            </div>
          </Card>

          <Card>
            <h2>Abholung & Benachrichtigung</h2>
            <div className="two-col">
              <Field label="Bestell-E-Mail">
                <input value={tenant.order_notify_email || ''} onChange={e=>setTenant({...tenant,order_notify_email:e.target.value})} />
              </Field>
              <Field label="Abholorte (eine Option pro Zeile)" help="Diese Auswahl sieht der Mitarbeiter im Checkout.">
                <textarea rows="6" value={tenant.pickup_options || ''} onChange={e=>setTenant({...tenant,pickup_options:e.target.value})} />
              </Field>
            </div>
          </Card>
        </div>}

        {tab === 'products' && <div className="stack">
          <Card>
            <h2>Produkt anlegen</h2>
            <form onSubmit={createProduct} className="two-col">
              <Field label="Name"><input value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})} /></Field>
              <Field label="Preis"><input type="number" step="0.01" value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})} /></Field>
              <Field label="Bild vom PC hochladen">
                <input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && uploadProductImage(e.target.files[0])} />
                {newProduct.image_url ? <img className="thumb" src={newProduct.image_url} /> : null}
              </Field>
              <Field label="Aktiv">
                <select value={String(newProduct.active)} onChange={e=>setNewProduct({...newProduct,active:e.target.value==='true'})}>
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </select>
              </Field>
              <div className="span-2"><Button>Produkt speichern</Button></div>
            </form>
          </Card>

          <Card>
            <h2>Produkte dieses Kunden</h2>
            <div className="product-list">
              {products.map(prod => (
                <div className="product-row" key={prod.id}>
                  <img className="small-product" src={prod.image_url || '/snack.svg'} />
                  <div className="grow">
                    <input value={prod.name || ''} onChange={e=>setProducts(list=>list.map(p=>p.id===prod.id?{...p,name:e.target.value}:p))} />
                    <div className="two-inline">
                      <input type="number" step="0.01" value={prod.price || 0} onChange={e=>setProducts(list=>list.map(p=>p.id===prod.id?{...p,price:e.target.value}:p))} />
                      <select value={String(prod.active ?? true)} onChange={e=>setProducts(list=>list.map(p=>p.id===prod.id?{...p,active:e.target.value==='true'}:p))}>
                        <option value="true">Aktiv</option>
                        <option value="false">Inaktiv</option>
                      </select>
                    </div>
                  </div>
                  <div className="row-actions">
                    <Button variant="ghost" onClick={()=>saveProduct(prod)}>Speichern</Button>
                    <Button variant="danger" onClick={()=>deleteProduct(prod.id)}>Löschen</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>}

        {tab === 'slots' && <Card>
          <h2>Slots belegen</h2>
          <div className="slots-grid">
            {slots.map(slot => (
              <div className="slot-card" key={slot.slot_number}>
                <div className="slot-title">Slot {slot.slot_number}</div>
                <select value={slot.product_id || ''} onChange={e=>setSlots(list=>list.map(s=>s.slot_number===slot.slot_number?{...s,product_id:e.target.value || null}:s))}>
                  <option value="">Leer</option>
                  {products.filter(p=>p.active !== false).map(prod => <option value={prod.id} key={prod.id}>{prod.name}</option>)}
                </select>
                <Button onClick={()=>saveSlot(slot)}>Zuweisen</Button>
              </div>
            ))}
          </div>
        </Card>}

        {tab === 'orders' && <Card>
          <h2>Bestellungen</h2>
          <div className="order-list">
            {orders.map(order => (
              <div className="order-card" key={order.id}>
                <div className="order-head"><strong>{order.first_name} {order.last_name}</strong><span>{money(order.total)}</span></div>
                <div className="muted">{order.email || '–'} · {order.phone || '–'}</div>
                <div className="muted">Abholung: {order.pickup_location || '–'} · Zahlung: {order.payment_method || '–'}</div>
                <div>{order.customer_note || ''}</div>
              </div>
            ))}
            {orders.length===0 ? <div className="muted">Noch keine Bestellungen.</div> : null}
          </div>
        </Card>}

        {tab === 'admins' && <div className="stack">
          <Card>
            <h2>Kunden-Admin freischalten</h2>
            <div className="two-col">
              <Field label="E-Mail des Kunden-Admins">
                <input value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} />
              </Field>
              <div className="stack-top">
                <Button onClick={assignCustomerAdmin}>Admin zuweisen</Button>
                <Button variant="ghost" onClick={()=>window.location.href=`mailto:?subject=Dein Login für ${tenant.name}&body=Bitte registriere dich zuerst unter ${window.location.origin}/${tenant.slug}/admin/login`}>Einladungs-Mail</Button>
                <Button variant="ghost" onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/${tenant.slug}/admin/login`)}>Login-Link kopieren</Button>
              </div>
            </div>
            <p className="muted">Ablauf: Kunde registriert sich zuerst auf der Kunden-Admin-Seite. Danach weist du ihn hier dem Kunden zu.</p>
          </Card>
        </div>}

        {tab === 'payments' && <Card>
          <h2>Zahlungsarten pro Kunde</h2>
          <div className="payment-grid">
            <label className="check"><input type="checkbox" checked={!!paymentSettings.twint_business_enabled} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,twint_business_enabled:e.target.checked}})} /> TWINT Business via Stripe-ready</label>
            <label className="check"><input type="checkbox" checked={!!paymentSettings.card_enabled} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,card_enabled:e.target.checked}})} /> Debitkarte / Kreditkarte via Stripe-ready</label>
            <label className="check"><input type="checkbox" checked={!!paymentSettings.invoice_enabled} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,invoice_enabled:e.target.checked}})} /> Interne Monatsabrechnung</label>
            <label className="check"><input type="checkbox" checked={!!paymentSettings.twint_phone_enabled} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,twint_phone_enabled:e.target.checked}})} /> TWINT Telefonnummer</label>
          </div>
          <div className="two-col">
            <Field label="TWINT Telefonnummer">
              <input value={paymentSettings.twint_phone_number || ''} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,twint_phone_number:e.target.value}})} />
            </Field>
            <Field label="Stripe Connected Account ID">
              <input value={paymentSettings.stripe_account_id || ''} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,stripe_account_id:e.target.value}})} />
            </Field>
          </div>
          <Field label="Stripe Publishable Key">
            <input value={paymentSettings.stripe_publishable_key || ''} onChange={e=>setTenant({...tenant,payment_settings:{...paymentSettings,stripe_publishable_key:e.target.value}})} />
          </Field>
          <p className="muted">Hinweis: Echte Live-Zahlungen brauchen zusätzlich dein Stripe/Provider-Backend. Diese V6 ist payment-ready, aber nicht ohne echte Keys/Functions live bestätigt.</p>
        </Card>}
      </div>
    </div>
  </Shell>
}

function CustomerAdminLogin() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const auth = useAuthProfile()

  useEffect(() => {
    supabase.from('tenants').select('*').eq('slug', slug).single().then(({data})=>{
      setTenant(data)
      if (data) document.title = `${data.name} · Kunden-Admin`
    })
  }, [slug])

  useEffect(() => {
    if (!auth.loading && auth.profile?.role === 'customer_admin' && tenant && auth.profile?.tenant_id === tenant.id) {
      navigate(`/${slug}/admin`)
    }
  }, [auth.loading, auth.profile, tenant, navigate, slug])

  async function login(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(error.message)
    const { profile } = await getCurrentProfile()
    if (profile?.role !== 'customer_admin' || profile?.tenant_id !== tenant?.id) {
      await supabase.auth.signOut()
      return setError('Nur freigeschaltete Kunden-Admins dürfen hier rein.')
    }
    navigate(`/${slug}/admin`)
  }

  async function register(e) {
    e.preventDefault()
    setError('')
    const redirect = `${window.location.origin}/${slug}/admin/login`
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: redirect
      }
    })
    if (error) return setError(error.message)
    alert('Registrierung gestartet. Bitte bestätige die E-Mail und lass dich danach im Superadmin freischalten.')
    setMode('login')
  }

  return <Shell>
    <div className="center-wrap">
      <Card className="auth-card">
        <TopBar title={tenant ? `${tenant.name} · Kunden-Admin` : 'Kunden-Admin'} />
        <div className="auth-switch">
          <button className={mode==='login'?'tab active':'tab'} onClick={()=>setMode('login')}>Login</button>
          <button className={mode==='register'?'tab active':'tab'} onClick={()=>setMode('register')}>Registrieren</button>
        </div>
        <form onSubmit={mode==='login'?login:register} className="stack">
          <Field label="E-Mail"><input value={email} onChange={e=>setEmail(e.target.value)} /></Field>
          <Field label="Passwort"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></Field>
          {error ? <div className="error">{error}</div> : null}
          <Button type="submit">{mode==='login' ? 'Einloggen' : 'Registrieren'}</Button>
        </form>
      </Card>
    </div>
  </Shell>
}

function RequireCustomerAdmin({ children }) {
  const { slug } = useParams()
  const auth = useAuthProfile()
  const [tenant, setTenant] = useState(null)
  useEffect(() => { supabase.from('tenants').select('*').eq('slug', slug).single().then(({data})=>setTenant(data)) }, [slug])
  if (auth.loading || !tenant) return <Shell><div className="loading">Lädt…</div></Shell>
  if (auth.profile?.role !== 'customer_admin' || auth.profile?.tenant_id !== tenant.id) {
    return <Navigate to={`/${slug}/admin/login`} replace />
  }
  return children
}

function CustomerAdminHome() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [products, setProducts] = useState([])
  const [slots, setSlots] = useState([])
  const [orders, setOrders] = useState([])
  const [newProduct, setNewProduct] = useState({ name:'', price:'', image_url:'', active:true })

  async function load() {
    const { data: t } = await supabase.from('tenants').select('*').eq('slug', slug).single()
    setTenant(t)
    if (!t) return
    const { data: p } = await supabase.from('products').select('*').eq('tenant_id', t.id).order('created_at')
    setProducts(p || [])
    const { data: s } = await supabase.from('tenant_slots').select('*').eq('tenant_id', t.id).order('slot_number')
    const normalized = []
    for (let i=1;i<Number(t.slot_count || 15)+1;i++) normalized.push((s||[]).find(x=>x.slot_number===i) || {tenant_id:t.id, slot_number:i, product_id:null})
    setSlots(normalized)
    const { data: o } = await supabase.from('orders').select('*').eq('tenant_id', t.id).order('created_at',{ascending:false})
    setOrders(o || [])
  }
  useEffect(()=>{ load() }, [slug])

  async function saveTenant() {
    const { error } = await supabase.from('tenants').update(tenant).eq('id', tenant.id)
    if (error) return alert(error.message)
    alert('Gespeichert')
  }
  async function upload(field, file) {
    try {
      const url = await uploadToBucket(file, `tenants/${tenant.slug}`)
      setTenant({...tenant, [field]: url})
    } catch (e) { alert(e.message) }
  }
  async function createProduct(e) {
    e.preventDefault()
    const { error } = await supabase.from('products').insert({
      tenant_id: tenant.id, name:newProduct.name, price:Number(newProduct.price||0), image_url:newProduct.image_url, active:newProduct.active
    })
    if (error) return alert(error.message)
    setNewProduct({ name:'', price:'', image_url:'', active:true })
    load()
  }
  async function uploadProduct(file) {
    try {
      const url = await uploadToBucket(file, `products/${tenant.slug}`)
      setNewProduct(prev => ({...prev,image_url:url}))
    } catch (e) { alert(e.message) }
  }
  async function saveSlot(slot) {
    const payload = { tenant_id: tenant.id, slot_number: slot.slot_number, product_id: slot.product_id || null }
    const { error } = slot.id
      ? await supabase.from('tenant_slots').update(payload).eq('tenant_id', tenant.id).eq('slot_number', slot.slot_number)
      : await supabase.from('tenant_slots').insert(payload)
    if (error) return alert(error.message)
    load()
  }
  async function logout() {
    await supabase.auth.signOut()
    navigate(`/${slug}/admin/login`)
  }
  if (!tenant) return <Shell><div className="loading">Lädt…</div></Shell>

  return <Shell>
    <div className="container">
      <TopBar title={`${tenant.name} · Kunden-Admin`} right={<><Button variant="secondary" onClick={()=>window.open(`/${slug}`,'_blank')}>Automat ansehen</Button><Button variant="secondary" onClick={logout}>Logout</Button></>} />
      <div className="admin-grid">
        <Card>
          <h2>Branding & Texte</h2>
          <div className="stack">
            <Field label="Header-Text"><input value={tenant.header_text || ''} onChange={e=>setTenant({...tenant,header_text:e.target.value})} /></Field>
            <Field label="Untertitel"><input value={tenant.tagline || ''} onChange={e=>setTenant({...tenant,tagline:e.target.value})} /></Field>
            <Field label="Eigener Text oben"><textarea rows="4" value={tenant.customer_header_note || ''} onChange={e=>setTenant({...tenant,customer_header_note:e.target.value})} /></Field>
            <Field label="Abholorte (eine Option pro Zeile)"><textarea rows="5" value={tenant.pickup_options || ''} onChange={e=>setTenant({...tenant,pickup_options:e.target.value})} /></Field>
            <div className="two-col">
              <Field label="Logo"><input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && upload('logo_url', e.target.files[0])} /></Field>
              <Field label="Hintergrund"><input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && upload('background_image_url', e.target.files[0])} /></Field>
            </div>
            <Button onClick={saveTenant}>Änderungen speichern</Button>
          </div>
        </Card>

        <Card>
          <h2>Produkt hinzufügen</h2>
          <form className="stack" onSubmit={createProduct}>
            <Field label="Name"><input value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})} /></Field>
            <Field label="Preis"><input type="number" step="0.01" value={newProduct.price} onChange={e=>setNewProduct({...newProduct,price:e.target.value})} /></Field>
            <Field label="Produktbild"><input type="file" accept="image/*" onChange={e=>e.target.files?.[0] && uploadProduct(e.target.files[0])} /></Field>
            {newProduct.image_url ? <img className="thumb" src={newProduct.image_url} /> : null}
            <Button>Produkt speichern</Button>
          </form>
        </Card>

        <Card className="span-2">
          <h2>Slots & Produkte</h2>
          <div className="slots-grid">
            {slots.map(slot => (
              <div className="slot-card" key={slot.slot_number}>
                <div className="slot-title">Slot {slot.slot_number}</div>
                <select value={slot.product_id || ''} onChange={e=>setSlots(list=>list.map(s=>s.slot_number===slot.slot_number?{...s,product_id:e.target.value || null}:s))}>
                  <option value="">Leer</option>
                  {products.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                </select>
                <Button onClick={()=>saveSlot(slot)}>Zuweisen</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="span-2">
          <h2>Bestellungen</h2>
          <div className="order-list">
            {orders.map(order => (
              <div className="order-card" key={order.id}>
                <div className="order-head"><strong>{order.first_name} {order.last_name}</strong><span>{money(order.total)}</span></div>
                <div className="muted">{order.email} · {order.phone}</div>
                <div className="muted">Abholung: {order.pickup_location} · Zahlung: {order.payment_method}</div>
                {order.customer_note ? <div>{order.customer_note}</div> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </Shell>
}

function useTenant(slug) {
  const [tenant, setTenant] = useState(null)
  useEffect(() => {
    supabase.from('tenants').select('*').eq('slug', slug).single().then(({data})=>{
      setTenant(data)
      if (data) document.title = data.name
    })
  }, [slug])
  return tenant
}

function MachinePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const tenant = useTenant(slug)
  const [products, setProducts] = useState([])
  const [slots, setSlots] = useState([])
  const [cart, setCart] = useState([])

  useEffect(() => {
    async function load() {
      if (!tenant) return
      const { data: p } = await supabase.from('products').select('*').eq('tenant_id', tenant.id).eq('active', true)
      const { data: s } = await supabase.from('tenant_slots').select('*').eq('tenant_id', tenant.id).order('slot_number')
      setProducts(p || [])
      setSlots(s || [])
    }
    load()
  }, [tenant])

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products])
  const visualSlots = useMemo(() => {
    if (!tenant) return []
    const count = Number(tenant.slot_count || 15)
    return Array.from({ length: count }, (_, idx) => {
      const s = slots.find(x => x.slot_number === idx + 1)
      return { number: idx + 1, product: s?.product_id ? productMap[s.product_id] : null }
    })
  }, [tenant, slots, productMap])

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(x => x.id === product.id)
      if (existing) return prev.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  if (!tenant) return <Shell><div className="loading">Lädt…</div></Shell>

  return <Shell>
    <div
      className="machine-page"
      style={{
        backgroundColor: tenant.brand_color || '#0f172a',
        backgroundImage: tenant.background_image_url ? `url(${tenant.background_image_url})` : undefined
      }}
    >
      <div
        className="machine-frame"
        style={{
          backgroundColor: tenant.frame_color || '#111827',
          backgroundImage: tenant.frame_image_url ? `url(${tenant.frame_image_url})` : undefined
        }}
      >
        <div className="machine-head">
          <div className="head-left">
            {tenant.logo_url ? <img className="logo" src={tenant.logo_url} /> : <img className="logo" src="/snack.svg" />}
            <div>
              <h1>{tenant.header_text || tenant.name}</h1>
              <p>{tenant.tagline || ''}</p>
              {tenant.customer_header_note ? <div className="note">{tenant.customer_header_note}</div> : null}
            </div>
          </div>
          <div className="head-actions">
            <Button variant="secondary" onClick={()=>navigate(`/${slug}/checkout`, { state: { cart } })}>Zur Kasse ({cart.reduce((a,b)=>a+b.qty,0)})</Button>
            <Button variant="ghost" onClick={()=>navigate(`/${slug}/admin/login`)}>Kunden-Admin</Button>
          </div>
        </div>

        <div className="machine-grid">
          {visualSlots.map(slot => (
            <button className="machine-slot" key={slot.number} disabled={!slot.product} onClick={() => slot.product && addToCart(slot.product)}>
              {slot.product ? <>
                <img src={slot.product.image_url || '/snack.svg'} className="slot-img" />
                <div className="slot-name">{slot.product.name}</div>
                <div className="slot-price">{money(slot.product.price)}</div>
              </> : <>
                <div className="slot-empty">Slot {slot.number}</div>
              </>}
            </button>
          ))}
        </div>
      </div>
    </div>
  </Shell>
}

function CheckoutPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const tenant = useTenant(slug)
  const cart = history.state?.usr?.cart || []
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', pickup_location: '', customer_note: '', payment_method: ''
  })

  const options = parsePickupOptions(tenant?.pickup_options)
  const paymentSettings = tenant?.payment_settings || {}
  const paymentOptions = [
    paymentSettings.twint_business_enabled ? 'TWINT Business' : null,
    paymentSettings.card_enabled ? 'Debit-/Kreditkarte' : null,
    paymentSettings.invoice_enabled ? 'Interne Monatsabrechnung' : null,
    paymentSettings.twint_phone_enabled ? `TWINT Telefonnummer (${paymentSettings.twint_phone_number || ''})` : null,
  ].filter(Boolean)

  useEffect(() => {
    if (options.length && !form.pickup_location) setForm(prev => ({ ...prev, pickup_location: options[0] }))
    if (paymentOptions.length && !form.payment_method) setForm(prev => ({ ...prev, payment_method: paymentOptions[0] }))
  }, [tenant])

  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)

  async function submit(e) {
    e.preventDefault()
    if (!tenant) return
    if (!cart.length) return alert('Warenkorb ist leer.')
    const orderPayload = {
      tenant_id: tenant.id,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      email: form.email,
      pickup_location: form.pickup_location,
      customer_note: form.customer_note,
      payment_method: form.payment_method,
      total
    }
    const { data: order, error } = await supabase.from('orders').insert(orderPayload).select().single()
    if (error) return alert(error.message)

    const itemRows = cart.map(item => ({
      tenant_id: tenant.id,
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.qty,
      unit_price: Number(item.price || 0),
      line_total: Number(item.price || 0) * Number(item.qty || 0),
      image_url: item.image_url || null
    }))
    const { error: itemErr } = await supabase.from('order_items').insert(itemRows)
    if (itemErr) return alert(itemErr.message)

    navigate(`/${slug}/success`, {
      state: {
        orderId: order.id,
        total,
        pickup_location: form.pickup_location,
        payment_method: form.payment_method
      }
    })
  }

  if (!tenant) return <Shell><div className="loading">Lädt…</div></Shell>

  return <Shell>
    <div className="container narrow">
      <TopBar title={`${tenant.name} · Bestellung`} />
      <Card>
        <form onSubmit={submit} className="stack">
          <div className="two-col">
            <Field label="Vorname"><input required value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} /></Field>
            <Field label="Name"><input required value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} /></Field>
          </div>
          <div className="two-col">
            <Field label="Telefon"><input required value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} /></Field>
            <Field label="E-Mail"><input type="email" required value={form.email} onChange={e=>setForm({...form, email:e.target.value})} /></Field>
          </div>
          <div className="two-col">
            <Field label="Abholort">
              <select value={form.pickup_location} onChange={e=>setForm({...form, pickup_location:e.target.value})}>
                {options.map(option => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Zahlungsart">
              <select value={form.payment_method} onChange={e=>setForm({...form, payment_method:e.target.value})}>
                {paymentOptions.map(option => <option key={option}>{option}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Hinweis"><textarea rows="3" value={form.customer_note} onChange={e=>setForm({...form, customer_note:e.target.value})} /></Field>
          <Card className="summary">
            <h3>Zusammenfassung</h3>
            {cart.map(item => <div className="summary-row" key={item.id}><span>{item.name} × {item.qty}</span><span>{money(item.price * item.qty)}</span></div>)}
            <div className="summary-row total"><strong>Total</strong><strong>{money(total)}</strong></div>
            {tenant.customer_header_note ? <div className="muted">Hinweis: {tenant.customer_header_note}</div> : null}
          </Card>
          <Button type="submit">Bestellung abschicken</Button>
        </form>
      </Card>
    </div>
  </Shell>
}

function SuccessPage() {
  const { slug } = useParams()
  const state = history.state?.usr || {}
  return <Shell>
    <div className="center-wrap">
      <Card className="auth-card">
        <TopBar title="Bestellung bestätigt" />
        <div className="stack">
          <div className="success-badge">✓</div>
          <div>Bestellnummer: <strong>{state.orderId || '—'}</strong></div>
          <div>Abholort: <strong>{state.pickup_location || '—'}</strong></div>
          <div>Zahlungsart: <strong>{state.payment_method || '—'}</strong></div>
          <div>Total: <strong>{money(state.total)}</strong></div>
          <Link className="btn primary" to={`/${slug}`}>Zurück zum Automaten</Link>
        </div>
      </Card>
    </div>
  </Shell>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/superadmin/login" replace />} />
      <Route path="/superadmin/login" element={<SuperAdminLogin />} />
      <Route path="/superadmin" element={<RequireSuperAdmin><SuperAdminHome /></RequireSuperAdmin>} />
      <Route path="/setup/:slug" element={<RequireSuperAdmin><CustomerSetup /></RequireSuperAdmin>} />
      <Route path="/:slug/admin/login" element={<CustomerAdminLogin />} />
      <Route path="/:slug/admin" element={<RequireCustomerAdmin><CustomerAdminHome /></RequireCustomerAdmin>} />
      <Route path="/:slug/checkout" element={<CheckoutPage />} />
      <Route path="/:slug/success" element={<SuccessPage />} />
      <Route path="/:slug" element={<MachinePage />} />
    </Routes>
  )
}
