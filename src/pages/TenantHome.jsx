import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTenantSlots } from '../lib/api'
import { money } from '../lib/utils'
import { useTenant } from '../components/TenantShell'
import { tenantPath } from '../lib/paths'

function buildSlotRows(slots, slotCount) {
  const perRow = slotCount <= 10 ? 5 : 3
  const rows = []
  for (let i = 0; i < slotCount; i += perRow) rows.push(slots.slice(i, i + perRow))
  return rows
}

export default function TenantHome() {
  const { tenant, tenantSlug, addToCart, cartCount, cartTotal } = useTenant()
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

  const rows = useMemo(() => buildSlotRows(slotCards, tenant.slot_count || 15), [slotCards, tenant.slot_count])

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
    <div className='tenantStage'>
      <section className='machineIntro panel'>
        <div>
          <div className='eyebrow'>Digitaler Firmenautomat</div>
          <h1>{tenant.display_name}</h1>
          <p>{tenant.welcome_text || 'Bestellen ohne physischen Automaten. Schnell, modern und direkt für deine Mitarbeitenden.'}</p>
        </div>
        <div className='machineIntroStats'>
          <div className='statChip'><span>Slots</span><strong>{tenant.slot_count || 15}</strong></div>
          <div className='statChip'><span>Aktuell</span><strong>{slotCards.filter((slot) => slot.product && slot.is_active).length}</strong></div>
          <button className='btn' onClick={() => nav(tenantPath(tenantSlug, '/cart'))}>Zum Warenkorb</button>
        </div>
      </section>

      <section className='machineWrap'>
        <div className='machineShell'>
          <div className='machineHeader'>
            <div>
              <div className='machineBrand'>{tenant.display_name}</div>
              <div className='machineSub'>SnackOfYourDay · App-Style Automat</div>
            </div>
            <div className='machineDisplay'>
              <span>Online</span>
              <strong>{money(cartTotal)}</strong>
            </div>
          </div>

          <div className='machineBody'>
            <div className='machineShelves'>
              {rows.map((row, rowIndex) => (
                <div className='machineShelf' key={`row-${rowIndex}`}>
                  <div className='shelfRail' />
                  <div className='shelfSlots'>
                    {row.map((slot) => {
                      const active = !!slot?.product && !!slot?.is_active
                      return (
                        <button
                          key={slot.slot_no}
                          className={`machineSlot ${active ? 'isActive' : 'isEmpty'}`}
                          onClick={() => selectSlot(slot)}
                        >
                          <div className='slotBadge'>#{slot.slot_no}</div>
                          <div className='slotVisual'>
                            {active ? (
                              slot.product.image_url ? (
                                <img src={slot.product.image_url} alt={slot.product.name} className='slotImage' />
                              ) : (
                                <div className='slotPackshot'>{slot.product.name.slice(0, 2).toUpperCase()}</div>
                              )
                            ) : (
                              <div className='slotEmptyPlate'>Leer</div>
                            )}
                          </div>
                          <div className='slotMeta'>
                            <strong>{active ? slot.product.name : 'Nicht belegt'}</strong>
                            <span>{active ? money(slot.product.price) : 'inaktiv'}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <aside className='machineSidePanel'>
              <div className='sideScreen'>
                <span>Kunde</span>
                <strong>{tenant.display_name}</strong>
              </div>
              <button className='sideCartButton' onClick={() => nav(tenantPath(tenantSlug, '/cart'))}>
                <span>Warenkorb</span>
                <strong>{cartCount}</strong>
              </button>
              <div className='paymentStack'>
                <div className='payChip'>TWINT</div>
                <div className='payChip'>Card</div>
                <div className='payChip'>Pickup</div>
              </div>
              <div className='machineInfoCard'>
                <span>Total</span>
                <strong>{money(cartTotal)}</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {picked && (
        <div className='modalWrap' onClick={() => setPicked(null)}>
          <div className='modalCard' onClick={(e) => e.stopPropagation()}>
            <div className='productDialogTop'>
              <div>
                <div className='eyebrow'>Slot #{picked.slot_no}</div>
                <h3>{picked.product.name}</h3>
              </div>
              <div className='dialogPrice'>{money(picked.product.price)}</div>
            </div>
            {picked.product.image_url ? (
              <img src={picked.product.image_url} alt={picked.product.name} className='dialogImage' />
            ) : (
              <div className='dialogPlaceholder'>{picked.product.name.slice(0, 2).toUpperCase()}</div>
            )}
            <div className='qtyLine'>
              <button className='pill ghost' onClick={() => setQty((q) => Math.max(1, q - 1))}>–</button>
              <strong>{qty}</strong>
              <button className='pill ghost' onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
            <button className='btn block' onClick={add}>In Warenkorb legen</button>
          </div>
        </div>
      )}
    </div>
  )
}
