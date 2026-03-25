import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../app/state.jsx'

export default function Cart() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { state, dispatch, cartTotal } = useApp()

  return (
    <div>
      <h2>{t('cart')}</h2>

      {state.cart.length === 0 ? (
        <div className='card muted'>—</div>
      ) : (
        <div className='stack'>
          {state.cart.map((i) => (
            <div key={i.slotNo} className='card row'>
              <div>
                <div className='strong'>#{i.slotNo} — {i.name}</div>
                <div className='muted'>CHF {i.price.toFixed(2)}</div>
              </div>
              <div className='rowRight'>
                <button className='chip' onClick={() => dispatch({ type: 'SET_QTY', slotNo: i.slotNo, qty: i.qty - 1 })}>–</button>
                <div className='qty'>{i.qty}</div>
                <button className='chip' onClick={() => dispatch({ type: 'SET_QTY', slotNo: i.slotNo, qty: i.qty + 1 })}>+</button>
                <button className='chip danger' onClick={() => dispatch({ type: 'REMOVE_ITEM', slotNo: i.slotNo })}>✕</button>
              </div>
            </div>
          ))}

          <div className='card row'>
            <div className='strong'>Total</div>
            <div className='strong'>CHF {cartTotal.toFixed(2)}</div>
          </div>

          <div className='row'>
            <Link className='chip' to='/kiosk'>{t('continue')}</Link>
            <button className='primary' onClick={() => nav('/checkout')}>{t('toCheckout')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
