import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { getTenantBySlug } from '../lib/api'
import { money } from '../lib/utils'
import { tenantPath } from '../lib/paths'
import { useApp } from '../app/state'
import { assertSupabase } from '../lib/supabase'

const TenantContext = React.createContext(null)
export const useTenant = () => React.useContext(TenantContext)

function cartKey(slug) { return `vendora_cart_${slug}` }

function setDynamicFavicon(tenant) {
  if (!tenant) return
  const title = tenant.display_name || 'SnackOfYourDay'
  document.title = title
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const gradient = ctx.createLinearGradient(0, 0, 64, 64)
  gradient.addColorStop(0, tenant.brand_color || '#1d4ed8')
  gradient.addColorStop(1, tenant.accent_color || '#0f172a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px Inter, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const initials = title.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  ctx.fillText(initials || 'S', 32, 33)
  let link = document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'icon')
    document.head.appendChild(link)
  }
  link.setAttribute('href', canvas.toDataURL('image/png'))
}

export default function TenantShell({ children }) {
  const { tenantSlug } = useParams()
  const location = useLocation()
  const nav = useNavigate()
  const { profile } = useApp()
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

  useEffect(() => {
    if (tenant) setDynamicFavicon(tenant)
  }, [tenant])

  const isAdmin = location.pathname.includes('/admin')
  const isTenantAdmin = profile?.role === 'customer_admin' && profile?.tenant_id === tenant?.id

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
            {isTenantAdmin ? (
              <>
                <Link className='pill ghost' to={tenantPath(tenantSlug, '/admin/dashboard')}>Admin-Dashboard</Link>
                <button className='pill ghost' onClick={async () => { await assertSupabase().auth.signOut(); nav(tenantPath(tenantSlug)) }}>Logout</button>
              </>
            ) : (
              <Link className='pill ghost' to={tenantPath(tenantSlug, '/admin/login')}>Kunden-Admin</Link>
            )}
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
