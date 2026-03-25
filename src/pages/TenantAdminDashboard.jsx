import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/state'
import { useTenant } from '../components/TenantShell'
import { getTenantOrders, getTenantPaymentMethodsAdmin, getTenantPickupLocations, getTenantProducts, getTenantSlots } from '../lib/api'
import { assertSupabase } from '../lib/supabase'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

const productDefaults = { name: '', price: '0.00', image_url: '', is_active: true }
const pickupDefaults = { label: '', details: '', sort_order: 10, is_active: true }

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ColorField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <div className='colorField'>
        <input type='color' value={value || '#0f172a'} onChange={(e) => onChange(e.target.value)} />
        <div className='colorPreview'>
          <span className='colorSwatch' style={{ background: value || '#0f172a' }} />
          <strong>{value || '#0f172a'}</strong>
        </div>
      </div>
    </label>
  )
}

function DesignPreview({ tenant, products }) {
  const sample = products.filter((p) => p.is_active).slice(0, 3)
  const bg = tenant.background_image
    ? `linear-gradient(180deg, rgba(3,7,18,.65), rgba(3,7,18,.9)), url(${tenant.background_image}) center/cover`
    : (tenant.background_value || `linear-gradient(135deg, ${tenant.brand_color || '#2563eb'}, ${tenant.accent_color || '#0f172a'})`)

  return (
    <div className='designPreview' style={{ '--preview-brand': tenant.brand_color || '#2563eb', '--preview-accent': tenant.accent_color || '#0f172a', '--preview-bg': bg }}>
      <div className={`designPreviewFrame style-${tenant.machine_frame_style || 'glass'}`} style={tenant.machine_frame_image ? { backgroundImage: `url(${tenant.machine_frame_image})` } : undefined}>
        <div className='designPreviewHeader'>
          {tenant.logo_url && <img src={tenant.logo_url} alt={tenant.display_name} className='designPreviewLogo' />}
          <div>
            <strong>{tenant.header_text || tenant.display_name}</strong>
            <div>{tenant.tagline || 'Dein Firmenautomat'}</div>
          </div>
        </div>
        <div className='designPreviewScreen'>
          {sample.length ? sample.map((p) => <span key={p.id}>{p.name}</span>) : <span>Live Vorschau für Produkte</span>}
        </div>
      </div>
    </div>
  )
}

export default function TenantAdminDashboard() {
  const { authUser, profile, authReady } = useApp()
  const { tenant, tenantSlug } = useTenant()
  const nav = useNavigate()
  const [activeTab, setActiveTab] = useState('setup')
  const [products, setProducts] = useState([])
  const [slots, setSlots] = useState([])
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [pickupLocations, setPickupLocations] = useState([])
  const [tenantForm, setTenantForm] = useState(tenant)
  const [newProduct, setNewProduct] = useState(productDefaults)
  const [newPickup, setNewPickup] = useState(pickupDefaults)
  const [busy, setBusy] = useState(false)
  const [uploadName, setUploadName] = useState('')

  const allowed = profile?.role === 'customer_admin' && profile?.tenant_id === tenant.id

  const loadAll = async () => {
    const [a, b, c, d, e] = await Promise.all([
      getTenantProducts(tenant.id),
      getTenantSlots(tenant.id),
      getTenantOrders(tenant.id),
      getTenantPaymentMethodsAdmin(tenant.id),
      getTenantPickupLocations(tenant.id, { admin: true }),
    ])
    setProducts(a)
    setSlots(b)
    setOrders(c)
    setPayments(d)
    setPickupLocations(e)
  }

  useEffect(() => {
    if (authReady && !authUser) nav(tenantPath(tenantSlug, '/admin/login'))
  }, [authReady, authUser, nav, tenantSlug])

  useEffect(() => { setTenantForm(tenant) }, [tenant])
  useEffect(() => { if (allowed) loadAll().catch(console.error) }, [allowed, tenant.id])

  const slotMap = useMemo(() => new Map(slots.map((slot) => [slot.slot_no, slot])), [slots])

  if (!authReady) return <div className='panel'>Lädt…</div>
  if (!allowed) return <div className='panel errorBox'>Kein Zugriff auf diesen Kunden. Superadmins melden sich hier nicht als Kunden-Admin an.</div>

  const onSelectFile = async (event, field = 'image_url') => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Bitte nur Bilddateien wählen.')
    const dataUrl = await fileToDataUrl(file)
    if (field === 'image_url') {
      setUploadName(file.name)
      setNewProduct((current) => ({ ...current, image_url: dataUrl }))
      return
    }
    setTenantForm((current) => ({ ...current, [field]: dataUrl }))
  }

  const saveTenantSetup = async () => {
    const { error } = await assertSupabase().from('tenants').update({
      display_name: tenantForm.display_name,
      header_text: tenantForm.header_text || tenantForm.display_name,
      tagline: tenantForm.tagline || null,
      welcome_text: tenantForm.welcome_text || null,
      pickup_hint: tenantForm.pickup_hint || null,
      order_notify_email: tenantForm.order_notify_email || null,
      order_success_text: tenantForm.order_success_text || null,
      brand_color: tenantForm.brand_color || '#2563eb',
      accent_color: tenantForm.accent_color || '#0f172a',
      background_type: tenantForm.background_type || 'gradient',
      background_value: tenantForm.background_value || null,
      background_image: tenantForm.background_image || null,
      machine_frame_style: tenantForm.machine_frame_style || 'glass',
      machine_frame_image: tenantForm.machine_frame_image || null,
      logo_url: tenantForm.logo_url || null,
      logo_align: tenantForm.logo_align || 'left',
      logo_size: Number(tenantForm.logo_size || 88),
    }).eq('id', tenant.id)
    if (error) return alert(error.message)
    alert('Kunden-Setup gespeichert. Seite wird neu geladen.')
    window.location.reload()
  }

  const addPickup = async () => {
    if (!newPickup.label.trim()) return alert('Bitte Abholort benennen.')
    const { error } = await assertSupabase().from('tenant_pickup_locations').insert({
      tenant_id: tenant.id,
      label: newPickup.label.trim(),
      details: newPickup.details || null,
      sort_order: Number(newPickup.sort_order || 10),
      is_active: !!newPickup.is_active,
    })
    if (error) return alert(error.message)
    setNewPickup(pickupDefaults)
    loadAll()
  }

  const updatePickup = async (id, patch) => {
    const { error } = await assertSupabase().from('tenant_pickup_locations').update(patch).eq('id', id)
    if (error) return alert(error.message)
    loadAll()
  }

  const removePickup = async (id) => {
    const { error } = await assertSupabase().from('tenant_pickup_locations').delete().eq('id', id)
    if (error) return alert(error.message)
    loadAll()
  }

  const addProduct = async () => {
    if (!newProduct.name.trim()) return alert('Bitte Produktname eingeben.')
    setBusy(true)
    const { error } = await assertSupabase().from('products').insert({
      tenant_id: tenant.id,
      name: newProduct.name.trim(),
      price: Number(newProduct.price || 0),
      image_url: newProduct.image_url || null,
      is_active: !!newProduct.is_active,
    })
    setBusy(false)
    if (error) return alert(error.message)
    setNewProduct(productDefaults)
    setUploadName('')
    loadAll()
  }

  const bindSlot = async (slotNo, productId) => {
    const { error } = await assertSupabase().from('tenant_slots').upsert({ tenant_id: tenant.id, slot_no: slotNo, product_id: productId || null, is_active: !!productId }, { onConflict: 'tenant_id,slot_no' })
    if (error) return alert(error.message)
    loadAll()
  }

  const setOrderStatus = async (id, status) => {
    const { error } = await assertSupabase().from('orders').update({ status }).eq('id', id)
    if (error) return alert(error.message)
    loadAll()
  }

  const toggleProduct = async (product) => {
    const { error } = await assertSupabase().from('products').update({ is_active: !product.is_active }).eq('id', product.id)
    if (error) return alert(error.message)
    loadAll()
  }

  const removeProduct = async (product) => {
    if (!window.confirm(`${product.name} wirklich löschen?`)) return
    const { error } = await assertSupabase().from('products').delete().eq('id', product.id)
    if (error) return alert(error.message)
    loadAll()
  }

  const updatePayment = async (id, patch) => {
    const { error } = await assertSupabase().from('tenant_payment_methods').update(patch).eq('id', id)
    if (error) return alert(error.message)
    loadAll()
  }

  return (
    <div className='stack'>
      <div className='panel listRow'><h2>{tenant.display_name} Admin</h2><button className='pill ghost' onClick={async () => { await assertSupabase().auth.signOut(); nav(tenantPath(tenantSlug, '/admin/login')) }}>Logout</button></div>

      <div className='tabLine'>
        {[
          ['setup', 'Setup'],
          ['design', 'Design'],
          ['products', 'Produkte'],
          ['slots', 'Slots'],
          ['payments', 'Zahlungen'],
          ['orders', 'Bestellungen'],
        ].map(([key, label]) => <button key={key} className={`tabButton ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>{label}</button>)}
      </div>

      {(activeTab === 'setup' || activeTab === 'design') && (
        <div className='gridTwo'>
          <div className='panel formGrid'>
            {activeTab === 'setup' ? (
              <>
                <h3>Sauberes Kunden-Setup</h3>
                <label>Firmenname<input value={tenantForm.display_name || ''} onChange={(e) => setTenantForm({ ...tenantForm, display_name: e.target.value })} /></label>
                <label>Header / Haupttitel<input value={tenantForm.header_text || ''} onChange={(e) => setTenantForm({ ...tenantForm, header_text: e.target.value })} /></label>
                <label>Untertitel / Claim<input value={tenantForm.tagline || ''} onChange={(e) => setTenantForm({ ...tenantForm, tagline: e.target.value })} /></label>
                <label>Willkommens-Text<input value={tenantForm.welcome_text || ''} onChange={(e) => setTenantForm({ ...tenantForm, welcome_text: e.target.value })} /></label>
                <label>Bestell-E-Mail<input value={tenantForm.order_notify_email || ''} onChange={(e) => setTenantForm({ ...tenantForm, order_notify_email: e.target.value })} /></label>
                <label>Abholhinweis<input value={tenantForm.pickup_hint || ''} onChange={(e) => setTenantForm({ ...tenantForm, pickup_hint: e.target.value })} /></label>
                <label>Text nach Bestellung<input value={tenantForm.order_success_text || ''} onChange={(e) => setTenantForm({ ...tenantForm, order_success_text: e.target.value })} placeholder='Deine Bestellung wurde erfolgreich übermittelt.' /></label>

                <div className='panel nested'>
                  <div className='listRow'><strong>Mehrere Abholorte</strong><span className='subtle'>{pickupLocations.length}</span></div>
                  <div className='formGrid'>
                    <label>Name<input value={newPickup.label} onChange={(e) => setNewPickup({ ...newPickup, label: e.target.value })} placeholder='Empfang Fribourg' /></label>
                    <label>Details<input value={newPickup.details} onChange={(e) => setNewPickup({ ...newPickup, details: e.target.value })} placeholder='Mo-Fr 09:00–17:00' /></label>
                    <label>Sortierung<input value={newPickup.sort_order} onChange={(e) => setNewPickup({ ...newPickup, sort_order: e.target.value })} /></label>
                    <label className='checkLine'><input type='checkbox' checked={newPickup.is_active} onChange={(e) => setNewPickup({ ...newPickup, is_active: e.target.checked })} /> aktiv</label>
                    <button className='btn' onClick={addPickup}>Abholort hinzufügen</button>
                  </div>
                  <div className='stack topPad'>
                    {pickupLocations.map((loc) => (
                      <div className='paymentEditor' key={loc.id}>
                        <input value={loc.label} onChange={(e) => updatePickup(loc.id, { label: e.target.value })} />
                        <input value={loc.details || ''} onChange={(e) => updatePickup(loc.id, { details: e.target.value })} placeholder='Details' />
                        <div className='miniRow'>
                          <label className='checkLine compact'><input type='checkbox' checked={loc.is_active} onChange={(e) => updatePickup(loc.id, { is_active: e.target.checked })} /> aktiv</label>
                          <button className='pill danger' onClick={() => removePickup(loc.id)}>Löschen</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3>Design System V6</h3>
                <ColorField label='Primary Color' value={tenantForm.brand_color} onChange={(value) => setTenantForm({ ...tenantForm, brand_color: value })} />
                <ColorField label='Accent Color' value={tenantForm.accent_color} onChange={(value) => setTenantForm({ ...tenantForm, accent_color: value })} />
                <label>Hintergrund-Modus
                  <select value={tenantForm.background_type || 'gradient'} onChange={(e) => setTenantForm({ ...tenantForm, background_type: e.target.value })}>
                    <option value='gradient'>Gradient</option>
                    <option value='color'>Farbe</option>
                  </select>
                </label>
                <label>Hintergrundwert<input value={tenantForm.background_value || ''} onChange={(e) => setTenantForm({ ...tenantForm, background_value: e.target.value })} placeholder='linear-gradient(...) oder #111827' /></label>
                <label>Hintergrundbild<input type='file' accept='image/*' onChange={(e) => onSelectFile(e, 'background_image')} /></label>
                <label>Rahmen-Style
                  <select value={tenantForm.machine_frame_style || 'glass'} onChange={(e) => setTenantForm({ ...tenantForm, machine_frame_style: e.target.value })}>
                    <option value='glass'>Glass</option>
                    <option value='dark'>Dark</option>
                    <option value='metallic'>Metallic</option>
                    <option value='image'>Bild-Rahmen</option>
                  </select>
                </label>
                <label>Rahmenbild<input type='file' accept='image/*' onChange={(e) => onSelectFile(e, 'machine_frame_image')} /></label>
                <label>Logo<input type='file' accept='image/*' onChange={(e) => onSelectFile(e, 'logo_url')} /></label>
                <label>Logo Position
                  <select value={tenantForm.logo_align || 'left'} onChange={(e) => setTenantForm({ ...tenantForm, logo_align: e.target.value })}>
                    <option value='left'>links</option>
                    <option value='center'>zentriert</option>
                    <option value='right'>rechts</option>
                  </select>
                </label>
                <label>Logo Größe<input value={tenantForm.logo_size || 88} onChange={(e) => setTenantForm({ ...tenantForm, logo_size: e.target.value })} /></label>
              </>
            )}
            <button className='btn block' onClick={saveTenantSetup}>Kunden-Setup speichern</button>
          </div>
          <div className='panel'>
            <h3>Live Vorschau</h3>
            <DesignPreview tenant={tenantForm} products={products} />
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className='gridTwo'>
          <div className='panel'>
            <h3>Produkt hinzufügen</h3>
            <div className='formGrid'>
              <label>Name<input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder='Protein Bar' /></label>
              <label>Preis<input value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder='4.50' /></label>
              <label>Bild vom PC<input type='file' accept='image/*' onChange={(e) => onSelectFile(e, 'image_url')} /></label>
              {uploadName && <div className='hintBox'>Gewählt: {uploadName}</div>}
              {newProduct.image_url && <div className='uploadPreview'><img src={newProduct.image_url} alt='Vorschau' /></div>}
              <label className='checkLine'><input type='checkbox' checked={newProduct.is_active} onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.checked })} /> Produkt aktiv</label>
            </div>
            <button className='btn block' onClick={addProduct} disabled={busy}>Speichern</button>
          </div>
          <div className='panel'>
            <div className='listRow'><h3>Produkte</h3><span className='subtle'>{products.length}</span></div>
            <div className='productAdminGrid'>
              {products.map((product) => {
                const usedIn = slots.find((slot) => slot.product_id === product.id)
                return <div className='productAdminCard' key={product.id}><div className='productThumb'>{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>{product.name.slice(0, 2).toUpperCase()}</span>}</div><div className='stack gap8'><strong>{product.name}</strong><div className='subtle'>{money(product.price)}{usedIn ? ` · Slot ${usedIn.slot_no}` : ' · nicht zugewiesen'}</div><div className='actionRow wrap'><button className='pill ghost' onClick={() => toggleProduct(product)}>{product.is_active ? 'Deaktivieren' : 'Aktivieren'}</button><button className='pill danger' onClick={() => removeProduct(product)}>Löschen</button></div></div></div>
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'slots' && (
        <div className='panel'>
          <h3>Slots belegen</h3>
          <div className='slotGridAdmin'>
            {Array.from({ length: tenant.slot_count || 15 }, (_, i) => i + 1).map((slotNo) => {
              const current = slotMap.get(slotNo)
              return <div className='slotAdminCard' key={slotNo}><div className='slotAdminTop'><strong>#{slotNo}</strong><span className='subtle'>{current?.product?.name || 'leer'}</span></div><select value={current?.product_id || ''} onChange={(e) => bindSlot(slotNo, e.target.value)}><option value=''>leer</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{current?.product?.image_url ? <img className='slotAdminPreview' src={current.product.image_url} alt={current.product.name} /> : <div className='slotAdminPlaceholder'>{current?.product ? current.product.name.slice(0, 2).toUpperCase() : '—'}</div>}</div>
            })}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className='panel'>
          <h3>Zahlungsmodul pro Kunde</h3>
          <div className='stack'>
            {payments.map((p) => <div className='paymentEditor' key={p.id}><div className='miniRow'><strong>{p.type}</strong><label className='checkLine compact'><input type='checkbox' checked={p.is_active} onChange={(e) => updatePayment(p.id, { is_active: e.target.checked })} /> aktiv</label></div><input value={p.label} onChange={(e) => updatePayment(p.id, { label: e.target.value })} /><input value={p.payment_value || ''} onChange={(e) => updatePayment(p.id, { payment_value: e.target.value })} placeholder='TWINT Nummer / Stripe Placeholder / Konto' /><input value={p.instructions || ''} onChange={(e) => updatePayment(p.id, { instructions: e.target.value })} placeholder='Hinweis für Kunden' /><div className='subtle'>Stripe-ready Struktur bleibt vorbereitet. Interne Monatsabrechnung und manuelle TWINT Telefonnummer sind sofort nutzbar.</div></div>)}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className='panel'>
          <div className='listRow'>
            <h3>Bestellungen</h3>
            <div className='subtle'>Bestell-E-Mail: {tenant.order_notify_email || 'nicht gesetzt'}</div>
          </div>
          <div className='stack'>
            {orders.length === 0 && <div className='subtle'>Noch keine Bestellungen vorhanden.</div>}
            {orders.map((o) => <div className='panel nested' key={o.id}><div className='listRow'><div><strong>{o.id}</strong><div className='subtle'>{o.first_name} {o.last_name} · {o.phone}{o.contact_email ? ` · ${o.contact_email}` : ''} · {money(o.total_amount)}</div>{o.pickup_location_label && <div className='subtle'>Abholort: {o.pickup_location_label}</div>}{o.pickup_note && <div className='subtle'>{o.pickup_note}</div>}</div><select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}><option>new</option><option>payment_marked</option><option>ready</option><option>done</option></select></div></div>)}
          </div>
        </div>
      )}
    </div>
  )
}
