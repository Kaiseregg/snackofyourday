import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../app/state.jsx'
import Modal from '../components/Modal.jsx'

function mockSlots(lang) {
  // Placeholder until Supabase wired.
  return Array.from({ length: 15 }).map((_, idx) => {
    const slotNo = idx + 1
    const active = true
    return {
      slotNo,
      productId: 'p' + slotNo,
      name: lang === 'fr' ? `Produit ${slotNo}` : `Produkt ${slotNo}`,
      price: 5 + (slotNo % 5),
      imageUrl: '',
      active,
    }
  })
}

export default function Kiosk() {
  const { t } = useTranslation()
  const { state, dispatch } = useApp()
  const slots = useMemo(() => mockSlots(state.lang), [state.lang])
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(null)
  const [qty, setQty] = useState(1)

  const openProduct = (s) => {
    setPicked(s)
    setQty(1)
    setOpen(true)
  }

  const add = () => {
    if (!picked) return
    dispatch({
      type: 'ADD_TO_CART',
      item: { slotNo: picked.slotNo, productId: picked.productId, name: picked.name, price: picked.price, imageUrl: picked.imageUrl, qty },
    })
    setOpen(false)
  }

  return (
    <div>
      <h2>{t('kiosk')}</h2>
      <div className='grid15'>
        {slots.map((s) => (
          <button key={s.slotNo} className='slot' onClick={() => openProduct(s)}>
            <div className='slotNo'>{s.slotNo}</div>
            <div className='slotBody'>
              <div className='slotName'>{s.name}</div>
              <div className='slotPrice'>CHF {s.price.toFixed(2)}</div>
            </div>
          </button>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        {picked && (
          <div>
            <div className='modalTop'>
              <div>
                <div className='modalTitle'>{picked.name}</div>
                <div className='muted'>CHF {picked.price.toFixed(2)}</div>
              </div>
              <button className='chip' onClick={() => setOpen(false)}>{t('close')}</button>
            </div>

            <div className='qtyRow'>
              <button className='chip' onClick={() => setQty((q) => Math.max(1, q - 1))}>–</button>
              <div className='qty'>{qty}</div>
              <button className='chip' onClick={() => setQty((q) => q + 1)}>+</button>
            </div>

            <button className='primary full' onClick={add}>{t('add')}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
