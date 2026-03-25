import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTenantSlots } from '../lib/api'
import { money } from '../lib/utils'
import { useTenant } from '../components/TenantShell'
import { tenantPath } from '../lib/paths'

export default function TenantHome() {
  const { tenant, tenantSlug, addToCart } = useTenant()
  const nav = useNavigate()
  const [slots, setSlots] = useState([])
  const [picked, setPicked] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    getTenantSlots(tenant.id).then(setSlots).catch(console.error)
  }, [tenant.id])

  const slotCards = useMemo(() => {
    const count = tenant.slot_count || 15
    const map = new Map(slots.map((s) => [s.slot_no, s]))
    return Array.from({ length: count }, (_, i) => map.get(i + 1) || { slot_no: i + 1, is_active: false, product: null })
  }, [slots, tenant.slot_count])

  const selectSlot = (slot) => {
    if (!slot?.product || !slot?.is_active) return
    setPicked(slot)
    setQty(1)
  }

  const add = () => {
    if (!picked?.product) return
    addToCart({
      slot_no: picked.slot_no,
      product_id: picked.product.id,
      name: picked.product.name,
      unit_price: Number(picked.product.price),
      qty,
      image_url: picked.product.image_url || '',
    })
    setPicked(null)
  }

  return (
    <>
      <div className='hero panel'>
        <div>
          <h1>{tenant.display_name}</h1>
          <p>{tenant.welcome_text || 'Wähle deine Produkte und bestelle direkt online.'}</p>
        </div>
        <button className='btn' onClick={() => nav(tenantPath(tenantSlug, '/cart'))}>Zum Warenkorb</button>
      </div>

      <div className='slotGrid'>
        {slotCards.map((slot) => (
          <button key={slot.slot_no} className={`slotCard ${(!slot.product || !slot.is_active) ? 'empty' : ''}`} onClick={() => selectSlot(slot)}>
            <div className='slotIndex'>#{slot.slot_no}</div>
            <div className='slotBody'>
              <strong>{slot.product?.name || 'Leer'}</strong>
              <span>{slot.product ? money(slot.product.price) : 'nicht aktiv'}</span>
            </div>
          </button>
        ))}
      </div>

      {picked && (
        <div className='modalWrap' onClick={() => setPicked(null)}>
          <div className='modalCard' onClick={(e) => e.stopPropagation()}>
            <h3>{picked.product.name}</h3>
            <p>{money(picked.product.price)}</p>
            <div className='qtyLine'>
              <button className='pill ghost' onClick={() => setQty((q) => Math.max(1, q - 1))}>–</button>
              <strong>{qty}</strong>
              <button className='pill ghost' onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button className='btn block' onClick={add}>In Warenkorb</button>
          </div>
        </div>
      )}
    </>
  )
}
