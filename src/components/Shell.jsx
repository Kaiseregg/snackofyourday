import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../app/state.jsx'

export default function Shell({ children }) {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const { state, dispatch } = useApp()
  const cartCount = state.cart.reduce((sum, i) => sum + i.qty, 0)

  const setLang = (lang) => {
    i18n.changeLanguage(lang)
    dispatch({ type: 'SET_LANG', lang })
  }

  const isAdmin = pathname.startsWith('/admin')

  return (
    <div className='app'>
      <header className='topbar'>
        <div className='brand'>
          <div className='brandTitle'>{t('brand')}</div>
          <div className='brandSub'>{t('sub')}</div>
        </div>
        <div className='topbarRight'>
          <div className='lang'>
            <button className={state.lang === 'de' ? 'chip on' : 'chip'} onClick={() => setLang('de')}>DE</button>
            <button className={state.lang === 'fr' ? 'chip on' : 'chip'} onClick={() => setLang('fr')}>FR</button>
          </div>
          {!isAdmin && (
            <Link className='cartBtn' to='/cart'>
              {t('cart')} <span className='badge'>{cartCount}</span>
            </Link>
          )}
          <Link className='adminLink' to='/admin/login'>{t('admin')}</Link>
        </div>
      </header>
      <main className='content'>{children}</main>
    </div>
  )
}
