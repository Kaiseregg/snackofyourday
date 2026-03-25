import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '../components/TenantShell'
import { getOrderById } from '../lib/api'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

export default function TenantDone() {
  const { orderId } = useParams()
  const { tenantSlug, tenant } = useTenant()
  const nav = useNavigate()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    getOrderById(orderId).then(setOrder).catch(console.error)
  }, [orderId])

  return (
    <div className='panel centerPanel stack'>
      <h2>Bestellung bestätigt</h2>
      <p>{tenant.order_success_text || 'Deine Bestellung wurde erfolgreich erfasst und an den Kunden übergeben.'}</p>
      <div className='paymentEditor'>
        <strong>Bestell-ID: {orderId}</strong>
        {order && (
          <>
            <div>Total: {money(order.total_amount)}</div>
            {order.pickup_location_label && <div>Abholort: {order.pickup_location_label}</div>}
            <div>Status: {order.status}</div>
          </>
        )}
      </div>
      <button className='btn' onClick={() => nav(tenantPath(tenantSlug))}>Neue Bestellung</button>
    </div>
  )
}
