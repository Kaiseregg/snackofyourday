import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../components/TenantShell'
import { getTenantPayments } from '../lib/api'
import { money, orderCode } from '../lib/utils'
import { assertSupabase } from '../lib/supabase'
import { tenantPath } from '../lib/paths'

export default function TenantCheckout() {
  const { tenant, tenantSlug, cart, cartTotal } = useTenant()
  const nav = useNavigate()
  const [payments, setPayments] = useState([])
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', pickup_note: '', payment_method_id: '' })

  useEffect(() => {
    getTenantPayments(tenant.id).then((rows) => {
      setPayments(rows)
      setForm((f) => ({ ...f, payment_method_id: rows[0]?.id || '' }))
    }).catch(console.error)
  }, [tenant.id])

  const submit = async () => {
    if (!cart.length) return
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
        pickup_note: form.pickup_note,
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
      <div className='panel formGrid'>
        <label>Vorname<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></label>
        <label>Name<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></label>
        <label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Abholhinweis<input value={form.pickup_note} onChange={(e) => setForm({ ...form, pickup_note: e.target.value })} placeholder='z.B. 11:30 / Empfang' /></label>
        <label>Zahlungsart<select value={form.payment_method_id} onChange={(e) => setForm({ ...form, payment_method_id: e.target.value })}>{payments.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      </div>
      <div className='panel listRow'><strong>Total</strong><strong>{money(cartTotal)}</strong></div>
      <button className='btn block' disabled={busy || !cart.length || !form.payment_method_id} onClick={submit}>Bestellung erstellen</button>
    </div>
  )
}
