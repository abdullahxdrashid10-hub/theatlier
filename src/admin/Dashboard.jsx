import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminSupabase } from './adminClient'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    paintings: { total: 0, available: 0, reserved: 0, sold: 0 },
    orders: { total: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 },
  })

  useEffect(() => {
    let active = true

    async function loadStats() {
      try {
        setLoading(true)
        setError(null)

        // Query paintings count by status
        const { data: paintings, error: pError } = await adminSupabase
          .from('paintings')
          .select('status')

        if (pError) throw new Error(`Failed to load paintings: ${pError.message}`)

        // Query orders count by status
        const { data: orders, error: oError } = await adminSupabase
          .from('orders')
          .select('status')

        if (oError) throw new Error(`Failed to load orders: ${oError.message}`)

        if (!active) return

        const pStats = { total: paintings.length, available: 0, reserved: 0, sold: 0 }
        paintings.forEach((p) => {
          if (pStats[p.status] !== undefined) pStats[p.status]++
        })

        const oStats = { total: orders.length, pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 }
        orders.forEach((o) => {
          if (oStats[o.status] !== undefined) oStats[o.status]++
        })

        setStats({ paintings: pStats, orders: oStats })
      } catch (err) {
        if (active) setError(err.message || 'Unable to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStats()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <div style={{ padding: '2rem 0', color: '#8c8c93' }}>Loading studio dashboard…</div>
  }

  if (error) {
    return (
      <div className="admin-card" style={{ borderColor: '#732a2a' }}>
        <h2 style={{ color: '#e57d7d', marginTop: 0 }}>Dashboard Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Studio Dashboard</h1>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="admin-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Paintings Overview
          </h2>
          <Link to="/admin/paintings" className="admin-btn admin-btn--secondary">
            Manage Paintings →
          </Link>
        </div>
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Works</div>
            <div className="admin-stat-value">{stats.paintings.total}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Available</div>
            <div className="admin-stat-value" style={{ color: '#6edb8f' }}>{stats.paintings.available}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Reserved</div>
            <div className="admin-stat-value" style={{ color: '#eec86b' }}>{stats.paintings.reserved}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Sold</div>
            <div className="admin-stat-value" style={{ color: '#e57d7d' }}>{stats.paintings.sold}</div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="admin-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Orders Overview
          </h2>
          <Link to="/admin/orders" className="admin-btn admin-btn--secondary">
            View Orders →
          </Link>
        </div>
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Orders</div>
            <div className="admin-stat-value">{stats.orders.total}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Pending</div>
            <div className="admin-stat-value" style={{ color: '#eec86b' }}>{stats.orders.pending}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Confirmed</div>
            <div className="admin-stat-value" style={{ color: '#6edb8f' }}>{stats.orders.confirmed}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Shipped</div>
            <div className="admin-stat-value" style={{ color: '#78aee8' }}>{stats.orders.shipped}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Delivered</div>
            <div className="admin-stat-value" style={{ color: '#6edb8f' }}>{stats.orders.delivered}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Cancelled</div>
            <div className="admin-stat-value" style={{ color: '#8c8c93' }}>{stats.orders.cancelled}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
