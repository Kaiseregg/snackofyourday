import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/state'
import { useTenant } from '../components/TenantShell'
import { getTenantOrders, getTenantPayments, getTenantProducts, getTenantSlots } from '../lib/api'
import { assertSupabase } from '../lib/supabase'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

const productDefaults = { name: '', price: '0.00', image_url: '', is_active: true }

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function TenantAdminDashboard() {
  const { authUser, profile, authReady } = useApp()
  const { tenant, tenantSlug } = useTenant()
  const nav = useNavigate()
  const [products, setProducts] = useState([])
  const [slots, setSlots] = useState([])
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [newProduct, setNewProduct] = useState(productDefaults)
  const [busy, setBusy] = useState(false)
  const [uploadName, setUploadName] = useState('')

  const allowed = profile?.role === 'customer_admin' && profile?.tenant_id === tenant.id

  const loadAll = async () => {
    const [a, b, c, d] = await Promise.all([
      getTenantProducts(tenant.id), getTenantSlots(tenant.id), getTenantOrders(tenant.id), getTenantPayments(tenant.id),
    ])
    setProducts(a); setSlots(b); setOrders(c); setPayments(d)
  }

  useEffect(() => {
    if (authReady && !authUser) nav(tenantPath(tenantSlug, '/admin/login'))
  }, [authReady, authUser, nav, tenantSlug])

  useEffect(() => { if (allowed) loadAll().catch(console.error) }, [allowed, tenant.id])

  const slotMap = useMemo(() => new Map(slots.map((slot) => [slot.slot_no, slot])), [slots])

  if (!authReady) return <div className='panel'>Lädt…</div>
  if (!allowed) return <div className='panel errorBox'>Kein Zugriff auf diesen Kunden. Superadmins melden sich hier nicht als Kunden-Admin an.</div>

  const onSelectFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Bitte nur Bilddateien wählen.')
    const dataUrl = await fileToDataUrl(file)
    setUploadName(file.name)
    setNewProduct((current) => ({ ...current, image_url: dataUrl }))
  }

  const addProduct = async () => {
    if (!newProduct.name.trim()) return alert('Bitte Produktname eingeben.')
    setBusy(true)
    const supabase = assertSupabase()
    const { error } = await supabase.from('products').insert({
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
    const supabase = assertSupabase()
    const { error } = await supabase.from('tenant_slots').upsert({ tenant_id: tenant.id, slot_no: slotNo, product_id: productId || null, is_active: !!productId }, { onConflict: 'tenant_id,slot_no' })
    if (error) return alert(error.message)
    loadAll()
  }

  const setOrderStatus = async (id, status) => {
    const supabase = assertSupabase()
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
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
      <div className='gridTwo'>
        <div className='panel'>
          <h3>Produkt hinzufügen</h3>
          <div className='formGrid'>
            <label>Name<input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder='Protein Bar' /></label>
            <label>Preis<input value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder='4.50' /></label>
            <label>Bild vom PC
              <input type='file' accept='image/*' onChange={onSelectFile} />
            </label>
            {uploadName && <div className='hintBox'>Gewählt: {uploadName}</div>}
            {newProduct.image_url && <div className='uploadPreview'><img src={newProduct.image_url} alt='Vorschau' /></div>}
            <label className='checkLine'><input type='checkbox' checked={newProduct.is_active} onChange={(e) => setNewProduct({ ...newProduct, is_active: e.target.checked })} /> Produkt aktiv</label>
          </div>
          <button className='btn block' onClick={addProduct} disabled={busy}>Speichern</button>
        </div>
        <div className='panel'>
          <h3>Zahlungsarten</h3>
          <div className='stack'>
            {payments.map((p) => <div className='paymentEditor' key={p.id}><div className='miniRow'><strong>{p.type}</strong><label className='checkLine compact'><input type='checkbox' checked={p.is_active} onChange={(e) => updatePayment(p.id, { is_active: e.target.checked })} /> aktiv</label></div><input value={p.label} onChange={(e) => updatePayment(p.id, { label: e.target.value })} /><input value={p.payment_value || ''} onChange={(e) => updatePayment(p.id, { payment_value: e.target.value })} placeholder='Zahlwert / TWINT / Info' /></div>)}
          </div>
        </div>
      </div>
      <div className='panel'>
        <div className='listRow'><h3>Produkte dieses Kunden</h3><span className='subtle'>{products.length} Produkte</span></div>
        <div className='productAdminGrid'>
          {products.map((product) => {
            const usedIn = slots.find((slot) => slot.product_id === product.id)
            return <div className='productAdminCard' key={product.id}><div className='productThumb'>{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>{product.name.slice(0, 2).toUpperCase()}</span>}</div><div className='stack gap8'><strong>{product.name}</strong><div className='subtle'>{money(product.price)}{usedIn ? ` · Slot ${usedIn.slot_no}` : ' · nicht zugewiesen'}</div><div className='actionRow wrap'><button className='pill ghost' onClick={() => toggleProduct(product)}>{product.is_active ? 'Deaktivieren' : 'Aktivieren'}</button><button className='pill danger' onClick={() => removeProduct(product)}>Löschen</button></div></div></div>
          })}
        </div>
      </div>
      <div className='panel'>
        <h3>Slots belegen</h3>
        <div className='slotGridAdmin'>
          {Array.from({ length: tenant.slot_count || 15 }, (_, i) => i + 1).map((slotNo) => {
            const current = slotMap.get(slotNo)
            return <div className='slotAdminCard' key={slotNo}><div className='slotAdminTop'><strong>#{slotNo}</strong><span className='subtle'>{current?.product?.name || 'leer'}</span></div><select value={current?.product_id || ''} onChange={(e) => bindSlot(slotNo, e.target.value)}><option value=''>leer</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{current?.product?.image_url ? <img className='slotAdminPreview' src={current.product.image_url} alt={current.product.name} /> : <div className='slotAdminPlaceholder'>{current?.product ? current.product.name.slice(0, 2).toUpperCase() : '—'}</div>}</div>
          })}
        </div>
      </div>
      <div className='panel'>
        <h3>Bestellungen</h3>
        <div className='stack'>
          {orders.length === 0 && <div className='subtle'>Noch keine Bestellungen vorhanden.</div>}
          {orders.map((o) => <div className='panel nested' key={o.id}><div className='listRow'><div><strong>{o.id}</strong><div className='subtle'>{o.first_name} {o.last_name} · {o.phone} · {money(o.total_amount)}</div>{o.pickup_note && <div className='subtle'>{o.pickup_note}</div>}</div><select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)}><option>new</option><option>payment_marked</option><option>ready</option><option>done</option></select></div></div>)}
        </div>
      </div>
    </div>
  )
}
