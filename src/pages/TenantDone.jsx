import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '../components/TenantShell'
import { tenantPath } from '../lib/paths'

export default function TenantDone() {
  const { orderId } = useParams()
  const { tenantSlug } = useTenant()
  const nav = useNavigate()
  return (
    <div className='panel centerPanel'>
      <h2>Danke</h2>
      <p>Bestellung {orderId} wurde erfasst.</p>
      <button className='btn' onClick={() => nav(tenantPath(tenantSlug))}>Neue Bestellung</button>
    </div>
  )
}
