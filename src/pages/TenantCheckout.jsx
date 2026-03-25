import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../components/TenantShell'
import { getTenantPayments, getTenantPickupLocations } from '../lib/api'
import { money, orderCode } from '../lib/utils'
import { assertSupabase } from '../lib/supabase'
import { tenantPath } from '../lib/paths'

export default function TenantCheckout() {
  const { tenant, tenantSlug, cart, cartTotal } = useTenant()
  const nav = useNavigate()
  const [payments, setPayments] = useState([])
  const [locations, setLocations] = useState([])
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    contact_email: '',
    pickup_note: '',
    pickup_location_id: '',
    payment_method_id: '',
  })

  useEffect(() => {
    Promise.all([
      getTenantPayments(tenant.id),
      getTenantPickupLocations(tenant.id),
    ]).then(([paymentRows, locationRows]) => {
      setPayments(paymentRows)
      setLocations(locationRows)
      setForm((f) => ({
        ...f,
        payment_method_id: f.payment_method_id || paymentRows[0]?.id || '',
        pickup_location_id: f.pickup_location_id || locationRows[0]?.id || '',
      }))
    }).catch(console.error)
  }, [tenant.id])

  const selectedPayment = useMemo(() => payments.find((p) => p.id === form.payment_method_id), [payments, form.payment_method_id])
  const selectedLocation = useMemo(() => locations.find((loc) => loc.id === form.pickup_location_id), [locations, form.pickup_location_id])

  const submit = async () => {
    if (!cart.length) return
    if (!form.first_name || !form.last_name || !form.phone) return alert('Bitte Vorname, Name und Telefon ausfüllen.')
    if (!form.pickup_location_id && locations.length) return alert('Bitte Abholort wählen.')
    setBusy(true)
    try {
      const supabase = assertSupabase()
      const code = orderCode()
      const { error } = await supabase.from('orders').insert({
        id: code,
        tenant_id: tenant.id,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        contact_email: form.contact_email || null,
        pickup_note: form.pickup_note || null,
        pickup_location_id: selectedLocation?.id || null,
        pickup_location_label: selectedLocation?.label || null,
        payment_method_id: form.payment_method_id,
        total_amount: cartTotal,
        status: 'new',
      })
      if (error) throw error
      const { error: itemErr } = await supabase.from('order_items').insert(
        cart.map((item) => ({
          order_id: code,
          tenant_id: tenant.id,
          product_id: item.product_id,
          slot_no: item.slot_no,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.unit_price * item.qty,
        })),
      )
      if (itemErr) throw itemErr
      nav(tenantPath(tenantSlug, `/payment/${code}`))
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='stack'>
      <div className='panel'><h2>Kasse</h2></div>
      {tenant.pickup_hint && <div className='hintBox'>Abholhinweis dieses Kunden: {tenant.pickup_hint}</div>}
      <div className='gridTwo'>
        <div className='panel formGrid'>
          <label>Vorname<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
          <label>Name<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
          <label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>E-Mail<input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder='name@firma.ch' /></label>
          <label>Abholort
            <select value={form.pickup_location_id} onChange={(e) => setForm({ ...form, pickup_location_id: e.target.value })}>
              {!locations.length && <option value=''>Kein Abholort hinterlegt</option>}
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
            </select>
          </label>
          <label>Hinweis zur Bestellung<input value={form.pickup_note} onChange={(e) => setForm({ ...form, pickup_note: e.target.value })} placeholder='z.B. 11:30 / Empfang' /></label>
          <label>Zahlungsart<select value={form.payment_method_id} onChange={(e) => setForm({ ...form, payment_method_id: e.target.value })}>{payments.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        </div>
        <div className='panel stack'>
          <div className='listRow'><strong>Total</strong><strong>{money(cartTotal)}</strong></div>
          {selectedLocation && (
            <div className='hintBox'>
              <strong>{selectedLocation.label}</strong>
              {selectedLocation.details && <div>{selectedLocation.details}</div>}
            </div>
          )}
          {selectedPayment && (
            <div className='paymentEditor'>
              <strong>{selectedPayment.label}</strong>
              <div className='subtle'>{selectedPayment.instructions || 'Zahlungsanweisung folgt im nächsten Schritt.'}</div>
            </div>
          )}
        </div>
      </div>
      <button className='btn block' disabled={busy || !cart.length || !form.payment_method_id} onClick={submit}>Bestellung erstellen</button>
    </div>
  )
}
