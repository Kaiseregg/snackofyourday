import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../app/state.jsx'

export default function Payment() {
  const { orderId } = useParams()
  const nav = useNavigate()
  const { t } = useTranslation()
  const { twint, dispatch } = useApp()

  const copy = async () => {
    try { await navigator.clipboard.writeText(twint.number) } catch (_) {}
  }

  const paid = () => {
    // TODO: update order status in Supabase
    dispatch({ type: 'CLEAR_CART' })
    nav(`/done/${orderId}`)
  }

  return (
    <div>
      <h2>{t('payment')}</h2>
      <div className='stack'>
        <div className='card'>
          <div className='muted'>Order</div>
          <div className='strong'>{orderId}</div>
        </div>

        <div className='card'>
          <div className='strong'>TWINT — {twint.label}</div>
          <div className='twintNum'>{twint.number}</div>
          <button className='chip' onClick={copy}>{t('copy')}</button>
          <div className='muted' style={{ marginTop: 8 }}>
            Bitte TWINT senden, danach bestätigen.
          </div>
        </div>

        <button className='primary full' onClick={paid}>{t('paid')}</button>
      </div>
    </div>
  )
}
