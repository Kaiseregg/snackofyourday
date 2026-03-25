import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/state'
import { useTenant } from '../components/TenantShell'
import { getTenantOrders, getTenantPayments, getTenantProducts, getTenantSlots } from '../lib/api'
import { assertSupabase } from '../lib/supabase'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

export default function TenantAdminDashboard() {
  const { authUser, profile, authReady } = useApp()
  const { tenant, tenantSlug } = useTenant()
  const nav = useNavigate()
  const [products, setProducts] = useState([])
  const [slots, setSlots] = useState([])
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [newProduct, setNewProduct] = useState({ name: '', price: '0.00' })

  const allowed = profile && (profile.role === 'superadmin' || profile.tenant_id === tenant.id)

  const loadAll = async () => {
    const [a,b,c,d] = await Promise.all([
      getTenantProducts(tenant.id), getTenantSlots(tenant.id), getTenantOrders(tenant.id), getTenantPayments(tenant.id),
    ])
    setProducts(a); setSlots(b); setOrders(c); setPayments(d)
  }

  useEffect(() => {
    if (authReady && !authUser) nav(tenantPath(tenantSlug, '/admin/login'))
  }, [authReady, authUser, nav, tenantSlug])

  useEffect(() => { if (allowed) loadAll().catch(console.error) }, [allowed, tenant.id])

  if (!authReady) return <div className='panel'>Lädt…</div>
  if (!allowed) return <div className='panel errorBox'>Kein Zugriff auf diesen Kunden.</div>

  const addProduct = async () => {
    const supabase = assertSupabase()
    const { error } = await supabase.from('products').insert({ tenant_id: tenant.id, name: newProduct.name, price: Number(newProduct.price), is_active: true })
    if (error) return alert(error.message)
    setNewProduct({ name: '', price: '0.00' })
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

  return (
    <div className='stack'>
      <div className='panel listRow'><h2>{tenant.display_name} Admin</h2><button className='pill ghost' onClick={async()=>{await assertSupabase().auth.signOut(); nav(tenantPath(tenantSlug,'/admin/login'))}}>Logout</button></div>
      <div className='gridTwo'>
        <div className='panel'>
          <h3>Produkt hinzufügen</h3>
          <label>Name<input value={newProduct.name} onChange={(e)=>setNewProduct({...newProduct,name:e.target.value})} /></label>
          <label>Preis<input value={newProduct.price} onChange={(e)=>setNewProduct({...newProduct,price:e.target.value})} /></label>
          <button className='btn block' onClick={addProduct}>Speichern</button>
        </div>
        <div className='panel'>
          <h3>Zahlungsarten</h3>
          {payments.map((p)=><div className='miniRow' key={p.id}><strong>{p.label}</strong><span>{p.type}</span></div>)}
        </div>
      </div>
      <div className='panel'>
        <h3>Slots</h3>
        <div className='slotGrid'>
          {Array.from({ length: tenant.slot_count || 15 }, (_, i) => i + 1).map((slotNo) => {
            const current = slots.find((s) => s.slot_no === slotNo)
            return <div className='slotAdmin' key={slotNo}><strong>#{slotNo}</strong><select value={current?.product_id || ''} onChange={(e)=>bindSlot(slotNo, e.target.value)}><option value=''>leer</option>{products.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          })}
        </div>
      </div>
      <div className='panel'>
        <h3>Bestellungen</h3>
        <div className='stack'>
          {orders.map((o)=><div className='panel nested' key={o.id}><div className='listRow'><div><strong>{o.id}</strong><div className='subtle'>{o.first_name} {o.last_name} · {money(o.total_amount)}</div></div><select value={o.status} onChange={(e)=>setOrderStatus(o.id,e.target.value)}><option>new</option><option>payment_marked</option><option>ready</option><option>done</option></select></div></div>)}
        </div>
      </div>
    </div>
  )
}
