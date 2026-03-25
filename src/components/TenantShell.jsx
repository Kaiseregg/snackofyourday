import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getTenantBySlug } from '../lib/api'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'

const TenantContext = React.createContext(null)
export const useTenant = () => React.useContext(TenantContext)

function cartKey(slug) { return `vendora_cart_${slug}` }

export default function TenantShell({ children }) {
  const { tenantSlug } = useParams()
  const location = useLocation()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cart, setCart] = useState([])

  useEffect(() => {
    const raw = localStorage.getItem(cartKey(tenantSlug))
    setCart(raw ? JSON.parse(raw) : [])
  }, [tenantSlug])

  useEffect(() => {
    localStorage.setItem(cartKey(tenantSlug), JSON.stringify(cart))
  }, [tenantSlug, cart])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getTenantBySlug(tenantSlug)
      .then((data) => {
        if (!active) return
        setTenant(data)
        if (!data) setError('Kunde nicht gefunden.')
      })
      .catch((err) => active && setError(err.message || 'Fehler beim Laden'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [tenantSlug])

  const value = useMemo(() => {
    const addToCart = (item) => {
      setCart((prev) => {
        const found = prev.find((x) => x.slot_no === item.slot_no)
        if (found) return prev.map((x) => x.slot_no === item.slot_no ? { ...x, qty: x.qty + item.qty } : x)
        return [...prev, item]
      })
    }
    const setQty = (slotNo, qty) => setCart((prev) => prev.map((x) => x.slot_no === slotNo ? { ...x, qty: Math.max(1, qty) } : x))
    const remove = (slotNo) => setCart((prev) => prev.filter((x) => x.slot_no !== slotNo))
    const clear = () => setCart([])
    return {
      tenant, tenantSlug, cart, addToCart, setQty, remove, clear,
      cartCount: cart.reduce((s, x) => s + x.qty, 0),
      cartTotal: cart.reduce((s, x) => s + Number(x.unit_price) * x.qty, 0),
    }
  }, [tenant, tenantSlug, cart])

  const isAdmin = location.pathname.includes('/admin')

  if (loading) return <div className='page'><div className='panel'>Lädt…</div></div>
  if (error || !tenant) return <div className='page'><div className='panel errorBox'>{error || 'Nicht gefunden'}</div></div>

  return (
    <TenantContext.Provider value={value}>
      <div className='appRoot' style={{ '--brand': tenant.brand_color || '#1d4ed8', '--brand2': tenant.accent_color || '#0f172a' }}>
        <header className='topbar'>
          <div>
            <div className='eyebrow'>{tenant.slug}</div>
            <div className='title'>{tenant.display_name}</div>
            <div className='subtle'>{tenant.tagline || 'Virtueller Automat'}</div>
          </div>
          <div className='topActions'>
            {!isAdmin && <Link className='pill' to={tenantPath(tenantSlug, '/cart')}>Warenkorb {value.cartCount}</Link>}
            <Link className='pill ghost' to={tenantPath(tenantSlug, '/admin/login')}>Kunden-Admin</Link>
          </div>
        </header>
        <main className='page'>{children}</main>
        <footer className='footer'>
          <span>{tenant.display_name}</span>
          {!isAdmin && <span>{money(value.cartTotal)}</span>}
        </footer>
      </div>
    </TenantContext.Provider>
  )
}
