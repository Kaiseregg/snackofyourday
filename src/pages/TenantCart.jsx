import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTenant } from '../components/TenantShell'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

export default function TenantCart() {
  const { cart, cartTotal, setQty, remove, tenantSlug } = useTenant()
  const nav = useNavigate()
  return (
    <div className='stack'>
      <div className='panel'><h2>Warenkorb</h2></div>
      {cart.length === 0 ? <div className='panel'>Noch nichts im Warenkorb.</div> : cart.map((item) => (
        <div className='panel listRow' key={item.slot_no}>
          <div>
            <strong>#{item.slot_no} {item.name}</strong>
            <div className='subtle'>{money(item.unit_price)}</div>
          </div>
          <div className='qtyLine'>
            <button className='pill ghost' onClick={() => setQty(item.slot_no, item.qty - 1)}>–</button>
            <span>{item.qty}</span>
            <button className='pill ghost' onClick={() => setQty(item.slot_no, item.qty + 1)}>+</button>
            <button className='pill danger' onClick={() => remove(item.slot_no)}>X</button>
          </div>
        </div>
      ))}
      <div className='panel listRow'><strong>Total</strong><strong>{money(cartTotal)}</strong></div>
      <div className='actionRow'>
        <Link className='pill ghost' to={tenantPath(tenantSlug)}>Weiter einkaufen</Link>
        <button className='btn' disabled={!cart.length} onClick={() => nav(tenantPath(tenantSlug, '/checkout'))}>Zur Kasse</button>
      </div>
    </div>
  )
}
