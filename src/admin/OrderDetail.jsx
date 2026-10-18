import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminSupabase, assertTouched } from './adminClient'
import { formatPKR } from '../utils/formatPKR'

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogState, setDialogState] = useState(null) // { nextStatus, consequence }
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    adminSupabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchErr }) => {
        if (!active) return
        if (fetchErr) setError(fetchErr.message || 'Order not found.')
        else setOrder(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Unable to load order details.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, reloadKey])

  const handleStatusChange = async (nextStatus) => {
    if (!order) return
    setActionLoading(true)
    setError(null)

    try {
      // Stale edit protection: .eq('updated_at', order.updated_at).select()
      const { data, error: updateErr } = await adminSupabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', order.id)
        .eq('updated_at', order.updated_at)
        .select()

      if (updateErr) throw new Error(updateErr.message || 'Failed to update order status.')
      assertTouched(data, 'Status update')

      setDialogState(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.message || 'Update failed. The order may have been modified by another session.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTogglePaymentStatus = async () => {
    if (!order) return
    setActionLoading(true)
    setError(null)

    const nextPaymentStatus = order.payment_status === 'paid' ? 'unpaid' : 'paid'

    try {
      const { data, error: updateErr } = await adminSupabase
        .from('orders')
        .update({ payment_status: nextPaymentStatus })
        .eq('id', order.id)
        .eq('updated_at', order.updated_at)
        .select()

      if (updateErr) throw new Error(updateErr.message || 'Failed to update payment status.')
      assertTouched(data, 'Payment status update')

      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.message || 'Update failed. The order may have been modified by another session.')
    } finally {
      setActionLoading(false)
    }
  }

  const openStatusConfirm = (nextStatus) => {
    const itemTitles = (order.order_items || []).map((i) => i.title_snapshot).join(', ') || 'selected artworks'
    let consequence = ''

    if (nextStatus === 'confirmed') {
      consequence = `Confirming marks ${itemTitles} as SOLD in the studio catalog.`
    } else if (nextStatus === 'cancelled') {
      consequence = `Cancelling frees ${itemTitles} for sale and returns it to AVAILABLE in the catalog.`
    } else if (nextStatus === 'shipped') {
      consequence = `Marking as SHIPPED updates the order to in transit.`
    } else if (nextStatus === 'delivered') {
      consequence = `Marking as DELIVERED completes the order fulfilment.`
    }

    setDialogState({ nextStatus, consequence })
  }

  if (loading) {
    return <div style={{ padding: '2rem 0', color: '#8c8c93' }}>Loading order…</div>
  }

  if (error && !order) {
    return (
      <div className="admin-card" style={{ borderColor: '#732a2a' }}>
        <h2 style={{ color: '#e57d7d', marginTop: 0 }}>Error</h2>
        <p>{error}</p>
        <Link to="/admin/orders" className="admin-btn admin-btn--secondary">
          ← Back to Orders
        </Link>
      </div>
    )
  }

  const cleanPhone = String(order.customer_phone || '').replace(/\D/g, '')
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <Link to="/admin/orders" style={{ color: '#8c8c93', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← All Orders
          </Link>
          <h1 className="admin-page-title" style={{ marginTop: '0.25rem' }}>
            Order {order.reference}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className={`admin-badge admin-badge--${order.status}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
            {order.status}
          </span>
          <span className={`admin-badge admin-badge--${order.payment_status || 'unpaid'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
            {order.payment_status || 'unpaid'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#261616', border: '1px solid #732a2a', color: '#e57d7d', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Status Transition Control Bar */}
      <div className="admin-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: '#8c8c93', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
            Order Status Actions
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {order.status === 'pending' && (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => openStatusConfirm('confirmed')}
                  disabled={actionLoading}
                >
                  Confirm Order
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={() => openStatusConfirm('cancelled')}
                  disabled={actionLoading}
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'confirmed' && (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => openStatusConfirm('shipped')}
                  disabled={actionLoading}
                >
                  Mark as Shipped
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={() => openStatusConfirm('cancelled')}
                  disabled={actionLoading}
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'shipped' && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => openStatusConfirm('delivered')}
                disabled={actionLoading}
              >
                Mark as Delivered
              </button>
            )}

            {(order.status === 'delivered' || order.status === 'cancelled') && (
              <span style={{ color: '#8c8c93', fontSize: '0.9rem' }}>
                No further status transitions available.
              </span>
            )}
          </div>
        </div>

        <div>
          <span style={{ color: '#8c8c93', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
            Payment Status
          </span>
          <button
            type="button"
            className={`admin-btn ${order.payment_status === 'paid' ? 'admin-btn--secondary' : 'admin-btn--primary'}`}
            onClick={handleTogglePaymentStatus}
            disabled={actionLoading}
          >
            {order.payment_status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
          </button>
        </div>
      </div>

      <div className="admin-grid-2">
        {/* Customer Information */}
        <div className="admin-card">
          <h2 className="admin-card-title">Customer & Delivery</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <span style={{ color: '#8c8c93', fontSize: '0.8rem', display: 'block' }}>Name</span>
              <strong style={{ fontSize: '1.05rem' }}>{order.customer_name}</strong>
            </div>

            <div>
              <span style={{ color: '#8c8c93', fontSize: '0.8rem', display: 'block' }}>Phone</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <a
                  href={`tel:${order.customer_phone}`}
                  style={{ color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
                >
                  📞 {order.customer_phone}
                </a>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6edb8f', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>

            {order.customer_email && (
              <div>
                <span style={{ color: '#8c8c93', fontSize: '0.8rem', display: 'block' }}>Email</span>
                <a
                  href={`mailto:${order.customer_email}`}
                  style={{ color: '#78aee8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}
                >
                  ✉️ {order.customer_email}
                </a>
              </div>
            )}

            <div>
              <span style={{ color: '#8c8c93', fontSize: '0.8rem', display: 'block' }}>City</span>
              <div>{order.city}</div>
            </div>

            <div>
              <span style={{ color: '#8c8c93', fontSize: '0.8rem', display: 'block' }}>Address</span>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{order.address}</div>
            </div>

            {order.notes && (
              <div>
                <span style={{ color: '#8c8c93', fontSize: '0.8rem', display: 'block' }}>Customer Notes</span>
                <div style={{ background: '#0e0e11', padding: '0.75rem', borderRadius: '4px', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                  {order.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items & Financials */}
        <div className="admin-card">
          <h2 className="admin-card-title">Order Items & Total</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
            {(order.order_items || []).map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #232328',
                }}
              >
                <div>
                  <strong style={{ display: 'block' }}>{item.title_snapshot}</strong>
                  <span style={{ color: '#8c8c93', fontSize: '0.8rem' }}>Painting ID: {item.painting_id}</span>
                </div>
                <div style={{ fontWeight: 600 }}>{formatPKR(item.price_snapshot_pkr)}</div>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.25rem', fontWeight: 600, borderTop: '1px solid #32323a', paddingTop: '1rem' }}>
            <span>Total</span>
            <span style={{ color: '#d4af37' }}>{formatPKR(order.total_pkr)}</span>
          </div>

          <div style={{ marginTop: '1rem', color: '#8c8c93', fontSize: '0.85rem' }}>
            Payment method: <strong style={{ color: '#fff' }}>{order.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery'}</strong>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {dialogState && (
        <div className="admin-dialog-backdrop">
          <div className="admin-dialog" role="dialog" aria-modal="true">
            <h2 className="admin-dialog-title">Confirm Status Change</h2>
            <p style={{ color: '#e5e5e7', fontSize: '1rem', lineHeight: 1.5 }}>
              {dialogState.consequence}
            </p>
            <div className="admin-dialog-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setDialogState(null)}
                disabled={actionLoading}
              >
                Keep Current Status
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => handleStatusChange(dialogState.nextStatus)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating…' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
