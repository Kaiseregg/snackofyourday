import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './state.jsx'
import TenantShell from '../components/TenantShell.jsx'
import SuperadminShell from '../components/SuperadminShell.jsx'
import TenantHome from '../pages/TenantHome.jsx'
import TenantCart from '../pages/TenantCart.jsx'
import TenantCheckout from '../pages/TenantCheckout.jsx'
import TenantPayment from '../pages/TenantPayment.jsx'
import TenantDone from '../pages/TenantDone.jsx'
import TenantAdminLogin from '../pages/TenantAdminLogin.jsx'
import TenantAdminDashboard from '../pages/TenantAdminDashboard.jsx'
import SuperadminLogin from '../pages/SuperadminLogin.jsx'
import SuperadminDashboard from '../pages/SuperadminDashboard.jsx'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path='/' element={<Navigate to='/demo' replace />} />
        <Route path='/superadmin/login' element={<SuperadminShell><SuperadminLogin /></SuperadminShell>} />
        <Route path='/superadmin/dashboard' element={<SuperadminShell><SuperadminDashboard /></SuperadminShell>} />

        <Route path='/:tenantSlug' element={<TenantShell><TenantHome /></TenantShell>} />
        <Route path='/:tenantSlug/cart' element={<TenantShell><TenantCart /></TenantShell>} />
        <Route path='/:tenantSlug/checkout' element={<TenantShell><TenantCheckout /></TenantShell>} />
        <Route path='/:tenantSlug/payment/:orderId' element={<TenantShell><TenantPayment /></TenantShell>} />
        <Route path='/:tenantSlug/done/:orderId' element={<TenantShell><TenantDone /></TenantShell>} />
        <Route path='/:tenantSlug/admin/login' element={<TenantShell><TenantAdminLogin /></TenantShell>} />
        <Route path='/:tenantSlug/admin/dashboard' element={<TenantShell><TenantAdminDashboard /></TenantShell>} />
        <Route path='*' element={<Navigate to='/demo' replace />} />
      </Routes>
    </AppProvider>
  )
}
