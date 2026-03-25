import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase.js'

function TabBtn({ on, children, ...props }) {
  return <button className={on ? 'chip on' : 'chip'} {...props}>{children}</button>
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('slots')
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (mounted) setUser(data?.user || null)
    })()
    return () => { mounted = false }
  }, [])

  const logout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    location.href = '/admin/login'
  }

  return (
    <div>
      <div className='row' style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{t('admin')}</h2>
        <div className='rowRight'>
          {user && <div className='muted'>{user.email}</div>}
          <button className='chip' onClick={logout}>{t('logout')}</button>
        </div>
      </div>

      <div className='row' style={{ marginTop: 12 }}>
        <TabBtn on={tab === 'slots'} onClick={() => setTab('slots')}>{t('slots')}</TabBtn>
        <TabBtn on={tab === 'products'} onClick={() => setTab('products')}>{t('products')}</TabBtn>
        <TabBtn on={tab === 'orders'} onClick={() => setTab('orders')}>{t('orders')}</TabBtn>
      </div>

      <div style={{ marginTop: 12 }}>
        {tab === 'slots' && <SlotsStub />}
        {tab === 'products' && <ProductsStub />}
        {tab === 'orders' && <OrdersStub />}
      </div>
    </div>
  )
}

function SlotsStub() {
  return (
    <div className='card'>
      <div className='strong'>Slots Editor (Stub)</div>
      <div className='muted'>Als nächster Schritt verbinden wir das mit Supabase: slots + products + image upload.</div>
      <div className='grid15' style={{ marginTop: 12 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className='slot' style={{ cursor: 'default' }}>
            <div className='slotNo'>{i + 1}</div>
            <div className='slotBody'>
              <div className='slotName'>—</div>
              <div className='slotPrice'>—</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductsStub() {
  return (
    <div className='card'>
      <div className='strong'>Produkte (Stub)</div>
      <div className='muted'>CRUD + DE/FR + Preis + Bild.</div>
    </div>
  )
}

function OrdersStub() {
  return (
    <div className='card'>
      <div className='strong'>Bestellungen (Stub)</div>
      <div className='muted'>Filter nach Ort/Status + Live Updates + Konfliktschutz.</div>
    </div>
  )
}
