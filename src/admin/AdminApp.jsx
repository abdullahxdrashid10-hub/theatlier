import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { checkIsAdmin } from './adminClient'
import Login from './Login'
import AdminLayout from './AdminLayout'
import Dashboard from './Dashboard'
import Orders from './Orders'
import OrderDetail from './OrderDetail'
import Paintings from './Paintings'
import PaintingEdit from './PaintingEdit'
import './admin.css'

export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking

  useEffect(() => {
    let active = true

    // Set robots meta tag to noindex,nofollow for admin
    let metaTag = document.querySelector('meta[name="robots"]')
    let created = false
    if (!metaTag) {
      metaTag = document.createElement('meta')
      metaTag.name = 'robots'
      document.head.appendChild(metaTag)
      created = true
    }
    const previousContent = metaTag.getAttribute('content')
    metaTag.setAttribute('content', 'noindex,nofollow')

    checkIsAdmin().then((isAdmin) => {
      if (active) setIsAuthenticated(isAdmin)
    })

    return () => {
      active = false
      if (created) {
        metaTag.remove()
      } else if (previousContent) {
        metaTag.setAttribute('content', 'index,follow')
      } else {
        metaTag.removeAttribute('content')
      }
    }
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: '#8c8c93' }}>Verifying authorization…</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <Routes>
      <Route element={<AdminLayout onLogout={() => setIsAuthenticated(false)} />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="paintings" element={<Paintings />} />
        <Route path="paintings/new" element={<PaintingEdit />} />
        <Route path="paintings/:id" element={<PaintingEdit />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
