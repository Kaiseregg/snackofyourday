import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Done() {
  const { orderId } = useParams()
  const nav = useNavigate()
  const { t } = useTranslation()

  return (
    <div className='center'>
      <div className='card hero'>
        <div className='heroLogo'>✅</div>
        <h2>{t('done')}</h2>
        <p className='muted'>Order: {orderId}</p>
        <button className='primary' onClick={() => nav('/kiosk')}>{t('newOrder')}</button>
      </div>
    </div>
  )
}
