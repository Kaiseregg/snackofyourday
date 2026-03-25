import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function SuperadminShell({ children }) {
  const location = useLocation()

  useEffect(() => {
    document.title = 'SnackOfYourDay Admin'
  }, [])

  return (
    <div className='appRoot adminRoot'>
      <header className='topbar'>
        <div>
          <div className='eyebrow'>snackofyourday</div>
          <div className='title'>Superadmin</div>
          <div className='subtle'>Plattform Verwaltung</div>
        </div>
        <div className='topActions'>
          {location.pathname !== '/superadmin/login' && <Link className='pill ghost' to='/superadmin/login'>Login</Link>}
          <Link className='pill' to='/demo'>Demo Tenant</Link>
        </div>
      </header>
      <main className='page'>{children}</main>
    </div>
  )
}
