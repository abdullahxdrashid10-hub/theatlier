import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminSupabase } from './adminClient'
import { formatPKR } from '../utils/formatPKR'

const STATUS_FILTERS = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [releaseMessage, setReleaseMessage] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    adminSupabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (!active) return
        if (fetchErr) setError(fetchErr.message || 'Failed to fetch orders.')
        else setOrders(data || [])
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Unable to load orders.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const handleReleaseStale = async () => {
    setReleasing(true)
    setReleaseMessage(null)
    try {
      const { data, error: rpcErr } = await adminSupabase.rpc('release_stale_reservations', {
        p_hours: 48,
      })
      if (rpcErr) throw new Error(rpcErr.message || 'Failed to release stale reservations.')
      setReleaseMessage(`Released ${data} stale pending reservation${data === 1 ? '' : 's'}.`)
      setReleaseConfirmOpen(false)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setReleaseMessage(`Error: ${err.message}`)
    } finally {
      setReleasing(false)
    }
  }

  const filteredOrders = useMemo(() => {
    let result = orders

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter((o) => {
        const refMatch = String(o.reference || '').toLowerCase().includes(query)
        const phoneMatch = String(o.customer_phone || '').toLowerCase().includes(query)
        const nameMatch = String(o.customer_name || '').toLowerCase().includes(query)
        return refMatch || phoneMatch || nameMatch
      })
    }

    return result
  }, [orders, statusFilter, searchQuery])

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Orders</h1>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => setReleaseConfirmOpen(true)}
        >
          Release Stale Reservations
        </button>
      </div>

      {releaseMessage && (
        <div style={{ background: '#1c241c', border: '1px solid #2e592e', color: '#8fe88f', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {releaseMessage}
        </div>
      )}

      {error && (
        <div style={{ background: '#261616', border: '1px solid #732a2a', color: '#e57d7d', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="admin-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`admin-btn ${statusFilter === f.value ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
              style={{ minHeight: '44px', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div>
          <input
            type="search"
            placeholder="Search by reference, phone (+92...), or name…"
            className="admin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search orders"
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem 0', color: '#8c8c93' }}>Loading orders…</div>
      ) : filteredOrders.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: '#8c8c93', margin: 0 }}>No orders matching current filter or search.</p>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {order.reference}
                    </Link>
                  </td>
                  <td style={{ color: '#a0a0a5', whiteSpace: 'nowrap' }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div>{order.customer_name}</div>
                    <div style={{ color: '#8c8c93', fontSize: '0.8rem' }}>{order.customer_phone}</div>
                  </td>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {formatPKR(order.total_pkr)}
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge--${order.payment_status || 'unpaid'}`}>
                      {order.payment_status || 'unpaid'}
                    </span>{' '}
                    <span style={{ color: '#8c8c93', fontSize: '0.75rem' }}>
                      ({order.payment_method})
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge--${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="admin-btn admin-btn--secondary"
                      style={{ minHeight: '40px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog for Release Stale Reservations */}
      {releaseConfirmOpen && (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true">
            <h2 className="admin-dialog-title">Release Stale Reservations?</h2>
            <p style={{ color: '#a0a0a5' }}>
              This will automatically cancel all <strong>pending</strong> orders older than 48 hours.
              Associated artworks will be returned to <strong>available</strong> status immediately.
            </p>
            <div className="admin-dialog-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setReleaseConfirmOpen(false)}
                disabled={releasing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={handleReleaseStale}
                disabled={releasing}
              >
                {releasing ? 'Releasing…' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
