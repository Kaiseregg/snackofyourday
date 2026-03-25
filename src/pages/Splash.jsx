import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Splash() {
  const nav = useNavigate()
  const { t } = useTranslation()

  return (
    <div className='center'>
      <div className='card hero'>
        <div className='heroLogo'>🛒</div>
        <h1>{t('brand')}</h1>
        <p className='muted'>{t('sub')}</p>
        <button className='primary' onClick={() => nav('/kiosk')}>{t('start')}</button>
      </div>
    </div>
  )
}
