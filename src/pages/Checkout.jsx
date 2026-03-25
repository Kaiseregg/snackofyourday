import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../app/state.jsx'

function fakeCreateOrder() {
  return 'ORD-' + Math.random().toString(16).slice(2, 8).toUpperCase()
}

export default function Checkout() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { state, dispatch, cartTotal } = useApp()
  const [busy, setBusy] = useState(false)

  const c = state.checkout

  const submit = async () => {
    if (state.cart.length === 0) return
    setBusy(true)
    // TODO: Insert into Supabase.
    const orderId = fakeCreateOrder()
    setBusy(false)
    nav(`/payment/${orderId}`)
  }

  return (
    <div>
      <h2>{t('checkout')}</h2>
      <div className='stack'>
        <div className='card form'>
          <label>{t('firstName')}<input value={c.firstName} onChange={(e) => dispatch({ type: 'SET_CHECKOUT', patch: { firstName: e.target.value } })} /></label>
          <label>{t('lastName')}<input value={c.lastName} onChange={(e) => dispatch({ type: 'SET_CHECKOUT', patch: { lastName: e.target.value } })} /></label>
          <label>{t('phone')}<input value={c.phone} onChange={(e) => dispatch({ type: 'SET_CHECKOUT', patch: { phone: e.target.value } })} /></label>

          <label>{t('location')}
            <select value={c.location} onChange={(e) => dispatch({ type: 'SET_CHECKOUT', patch: { location: e.target.value } })}>
              <option value='corbieres'>Corbières</option>
              <option value='azh_romont'>AZH Romont</option>
            </select>
          </label>

          <label>{t('timeslot')}
            <select value={c.timeslot} onChange={(e) => dispatch({ type: 'SET_CHECKOUT', patch: { timeslot: e.target.value } })}>
              <option value='09:00'>09:00</option>
              <option value='11:00'>11:00</option>
              <option value='13:30'>13:30</option>
            </select>
          </label>
        </div>

        <div className='card row'>
          <div className='strong'>Total</div>
          <div className='strong'>CHF {cartTotal.toFixed(2)}</div>
        </div>

        <button className='primary full' disabled={busy || state.cart.length === 0} onClick={submit}>{t('createOrder')}</button>
      </div>
    </div>
  )
}
