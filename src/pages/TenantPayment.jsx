import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '../components/TenantShell'
import { assertSupabase } from '../lib/supabase'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

export default function TenantPayment() {
  const { orderId } = useParams()
  const { tenantSlug, clear } = useTenant()
  const nav = useNavigate()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    const supabase = assertSupabase()
    supabase.from('orders').select('*, payment_method:tenant_payment_methods(*)').eq('id', orderId).maybeSingle().then(({ data }) => setOrder(data))
  }, [orderId])

  const markPaid = async () => {
    const supabase = assertSupabase()
    const { error } = await supabase.from('orders').update({ status: 'payment_marked' }).eq('id', orderId)
    if (error) return alert(error.message)
    clear()
    nav(tenantPath(tenantSlug, `/done/${orderId}`))
  }

  if (!order) return <div className='panel'>Lädt…</div>
  const method = order.payment_method
  return (
    <div className='stack'>
      <div className='panel'><h2>Zahlung</h2></div>
      <div className='panel'>
        <strong>Bestellung {orderId}</strong>
        <div className='subtle'>{money(order.total_amount)}</div>
      </div>
      <div className='panel'>
        <strong>{method?.label}</strong>
        <p>{method?.instructions || 'Bitte gemäss Anweisung bezahlen.'}</p>
        {method?.payment_value && <div className='paymentCode'>{method.payment_value}</div>}
      </div>
      <button className='btn block' onClick={markPaid}>Ich habe bezahlt</button>
    </div>
  )
}
