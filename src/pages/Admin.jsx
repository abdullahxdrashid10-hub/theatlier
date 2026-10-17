import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ADMIN_PASSCODE, buildWhatsAppMessage } from '../config/site'
import {
  getAllPaintings,
  createPainting,
  updatePainting,
  updatePaintingStatus,
  deletePainting,
  getAllOrders,
  updateOrderStatus,
} from '../data/api'
import { formatPKR } from '../utils/formatPKR'
import '../styles/admin.css'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('the_atelier_admin_auth') === 'true'
    }
    return false
  })
  const [passcodeInput, setPasscodeInput] = useState('')
  const [gateError, setGateError] = useState(false)

  // Data State
  const [paintings, setPaintings] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('catalog') // 'catalog' | 'orders'
  const [filter, setFilter] = useState('all') // 'all' | 'available' | 'reserved' | 'sold'
  const [search, setSearch] = useState('')

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    status: 'available',
    medium: 'Heavy acrylic impasto on Italian linen',
    widthCm: '90',
    heightCm: '120',
    year: String(new Date().getFullYear()),
    description: '',
    imageUrl: '',
    perspectiveUrl: '',
    featured: false,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Load Data on authentication
  useEffect(() => {
    if (!isAuthenticated) return
    let active = true

    Promise.all([
      getAllPaintings({ force: true }),
      getAllOrders(),
    ])
      .then(([allPaintings, allOrders]) => {
        if (!active) return
        setPaintings(allPaintings)
        setOrders(allOrders)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        console.error('Admin load error:', err)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  // Show temporary toast notification
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Handle Passcode Unlock
  const handleUnlock = (e) => {
    e.preventDefault()
    if (passcodeInput.trim() === ADMIN_PASSCODE.trim()) {
      sessionStorage.setItem('the_atelier_admin_auth', 'true')
      setIsAuthenticated(true)
      setGateError(false)
    } else {
      setGateError(true)
    }
  }

  const handleSignOut = () => {
    sessionStorage.removeItem('the_atelier_admin_auth')
    setIsAuthenticated(false)
    setPasscodeInput('')
  }

  // Quick 1-Click Status Switcher
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updatePaintingStatus(id, newStatus)
      setPaintings((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      )
      showToast(`Artwork status updated to ${newStatus.toUpperCase()}`)
    } catch (err) {
      console.error('Status update failed:', err)
      showToast('Status update failed. Please retry.')
    }
  }

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      title: '',
      price: '',
      status: 'available',
      medium: 'Heavy acrylic impasto on Italian linen',
      widthCm: '90',
      heightCm: '120',
      year: String(new Date().getFullYear()),
      description: '',
      imageUrl: '',
      perspectiveUrl: '',
      featured: false,
    })
    setModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = (painting) => {
    setEditingItem(painting)
    setFormData({
      title: painting.title || '',
      price: String(painting.price || ''),
      status: painting.status || 'available',
      medium: painting.medium || 'Heavy acrylic impasto on Italian linen',
      widthCm: String(painting.widthCm || ''),
      heightCm: String(painting.heightCm || ''),
      year: String(painting.year || new Date().getFullYear()),
      description: painting.description || '',
      imageUrl: painting.images?.[0] || '',
      perspectiveUrl: painting.images?.[1] || '',
      featured: Boolean(painting.featured),
    })
    setModalOpen(true)
  }

  // Save Modal Form
  const handleSaveArtwork = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Please enter a title for the artwork.')
      return
    }

    setSaving(true)
    const existingAdditional = editingItem?.images ? editingItem.images.slice(2) : []
    const images = [formData.imageUrl.trim()]
    if (formData.perspectiveUrl.trim()) {
      images.push(formData.perspectiveUrl.trim())
    }
    if (existingAdditional.length > 0) {
      images.push(...existingAdditional)
    }

    const payload = {
      title: formData.title.trim(),
      price: Number(formData.price) || 0,
      status: formData.status,
      medium: formData.medium.trim(),
      widthCm: Number(formData.widthCm) || 0,
      heightCm: Number(formData.heightCm) || 0,
      year: Number(formData.year) || new Date().getFullYear(),
      description: formData.description.trim(),
      images: images.filter(Boolean),
      featured: formData.featured,
    }

    try {
      if (editingItem) {
        const updated = await updatePainting(editingItem.id, payload)
        setPaintings((prev) =>
          prev.map((p) => (p.id === editingItem.id ? { ...p, ...updated } : p))
        )
        showToast('Artwork updated successfully.')
      } else {
        const created = await createPainting(payload)
        setPaintings((prev) => [created, ...prev])
        showToast('New artwork added to catalog.')
      }
      setModalOpen(false)
    } catch (err) {
      console.error('Failed to save artwork:', err)
      showToast('Error saving artwork.')
    } finally {
      setSaving(false)
    }
  }

  // Delete Artwork
  const handleDeleteArtwork = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the catalog?`)) {
      return
    }
    try {
      await deletePainting(id)
      setPaintings((prev) => prev.filter((p) => p.id !== id))
      showToast(`Artwork "${title}" removed.`)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Failed to delete artwork.')
    }
  }

  // Update Order Status
  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId || o.reference === orderId ? { ...o, status: newStatus } : o))
      )
      showToast(`Order ${orderId} updated to ${newStatus.toUpperCase()}`)
    } catch (err) {
      console.error('Order status update error:', err)
    }
  }

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = paintings.length
    const available = paintings.filter((p) => p.status === 'available').length
    const reserved = paintings.filter((p) => p.status === 'reserved').length
    const sold = paintings.filter((p) => p.status === 'sold').length
    const inventoryValuation = paintings
      .filter((p) => p.status === 'available')
      .reduce((sum, p) => sum + (Number(p.price) || 0), 0)

    return { total, available, reserved, sold, inventoryValuation }
  }, [paintings])

  // Filtered Paintings
  const filteredPaintings = useMemo(() => {
    return paintings.filter((p) => {
      const matchesFilter = filter === 'all' || p.status === filter
      const matchesSearch =
        !search.trim() ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.medium?.toLowerCase().includes(search.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [paintings, filter, search])

  // -------------------------------------------------------------------------
  // Render: Passcode Gate Screen
  // -------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <main className="admin-page">
        <title>Studio Portal — The Atelier by SK</title>
        <section className="admin-gate">
          <div className="admin-gate__card">
            <div className="admin-gate__icon-wrap">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="admin-gate__eyebrow">The Atelier by SK</span>
            <h1 className="admin-gate__title">Studio Portal</h1>
            <p className="admin-gate__desc">
              Please enter the studio passcode to manage artwork stock, adjust prices, and view customer orders.
            </p>

            <form onSubmit={handleUnlock} className="admin-gate__form">
              <div className="admin-gate__input-wrap">
                <input
                  type="password"
                  placeholder="Studio Passcode"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value)
                    if (gateError) setGateError(false)
                  }}
                  className="admin-gate__input"
                  autoFocus
                />
              </div>

              {gateError && (
                <p className="admin-gate__error" role="alert">
                  Incorrect studio passcode. Please try again.
                </p>
              )}

              <button type="submit" className="btn btn--gilded admin-gate__btn">
                <span>Unlock Studio Portal</span>
                <span className="btn__arrow">→</span>
              </button>
            </form>
          </div>
        </section>
      </main>
    )
  }

  // -------------------------------------------------------------------------
  // Render: Authenticated Studio Dashboard
  // -------------------------------------------------------------------------
  return (
    <main className="admin-page">
      <title>Studio Dashboard — The Atelier by SK</title>

      {/* Instant Feedback Toast */}
      {toast && (
        <div className="cart-toast" role="status" style={{ zIndex: 200 }}>
          <span className="cart-toast__text">{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header__top">
          <div className="admin-header__brand-wrap">
            <span className="admin-header__eyebrow">Studio Management</span>
            <h1 className="admin-header__title">The Atelier Control</h1>
          </div>

          <div className="admin-header__actions">
            <Link to="/shop" target="_blank" rel="noopener noreferrer" className="btn btn--framed">
              <span>View Live Gallery ↗</span>
            </Link>
            <button type="button" onClick={handleSignOut} className="admin-header__signout-btn">
              Lock & Sign Out
            </button>
          </div>
        </div>

        {/* Studio Metrics Grid */}
        <div className="admin-metrics">
          <div className="admin-metric">
            <span className="admin-metric__label">Total Collection</span>
            <p className="admin-metric__value">{metrics.total}</p>
          </div>
          <div className="admin-metric">
            <span className="admin-metric__label">Available</span>
            <p className="admin-metric__value" style={{ color: '#81c784' }}>{metrics.available}</p>
          </div>
          <div className="admin-metric">
            <span className="admin-metric__label">Reserved</span>
            <p className="admin-metric__value" style={{ color: '#ffb74d' }}>{metrics.reserved}</p>
          </div>
          <div className="admin-metric">
            <span className="admin-metric__label">Acquired (Sold)</span>
            <p className="admin-metric__value" style={{ color: '#e57373' }}>{metrics.sold}</p>
          </div>
          <div className="admin-metric admin-metric--gold">
            <span className="admin-metric__label">Available Inventory</span>
            <p className="admin-metric__value">{formatPKR(metrics.inventoryValuation)}</p>
          </div>
        </div>

        {/* Tab Switcher: Catalog vs Orders */}
        <div className="admin-nav-bar">
          <div className="admin-tab-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'catalog'}
              className={`admin-tab-btn ${activeTab === 'catalog' ? 'admin-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <span>Artworks Catalog</span>
              <span className="admin-tab-badge">({paintings.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              className={`admin-tab-btn ${activeTab === 'orders' ? 'admin-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <span>Customer Orders</span>
              <span className="admin-tab-badge">({orders.length})</span>
            </button>
          </div>

          {activeTab === 'catalog' && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn--gilded"
              style={{ padding: '10px 22px' }}
            >
              <span>+ Add New Artwork</span>
            </button>
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------------------
          Tab 1: Artworks Catalog
          --------------------------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <section aria-label="Catalog Inventory">
          {/* Toolbar: Sculpted Palette Arch Filter Toggles & Search */}
          <div className="admin-toolbar">
            <div className="gallery-toggles" role="tablist" aria-label="Filter stock by availability">
              <button
                type="button"
                className={`gallery-toggle-btn ${filter === 'all' ? 'gallery-toggle-btn--active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All <span className="gallery-toggle-btn__count">({paintings.length})</span>
              </button>
              <button
                type="button"
                className={`gallery-toggle-btn ${filter === 'available' ? 'gallery-toggle-btn--active' : ''}`}
                onClick={() => setFilter('available')}
              >
                Available <span className="gallery-toggle-btn__count">({metrics.available})</span>
              </button>
              <button
                type="button"
                className={`gallery-toggle-btn ${filter === 'reserved' ? 'gallery-toggle-btn--active' : ''}`}
                onClick={() => setFilter('reserved')}
              >
                Reserved <span className="gallery-toggle-btn__count">({metrics.reserved})</span>
              </button>
              <button
                type="button"
                className={`gallery-toggle-btn ${filter === 'sold' ? 'gallery-toggle-btn--active' : ''}`}
                onClick={() => setFilter('sold')}
              >
                Sold <span className="gallery-toggle-btn__count">({metrics.sold})</span>
              </button>
            </div>

            <input
              type="search"
              placeholder="Filter by title or medium..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-search-input"
              aria-label="Search artworks"
            />
          </div>

          {/* Catalog Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--taupe)' }}>
              Loading studio inventory...
            </div>
          ) : filteredPaintings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--taupe)' }}>
              No artworks match your criteria.
            </div>
          ) : (
            <div className="admin-artworks-grid">
              {filteredPaintings.map((painting) => {
                const primaryImage = painting.images?.[0] || '/placeholders/placeholder-01.svg'
                return (
                  <article key={painting.id} className="admin-card">
                    {/* Media Thumbnail */}
                    <div className="admin-card__media">
                      <img
                        src={primaryImage}
                        alt={painting.title}
                        className="admin-card__img"
                        loading="lazy"
                      />
                      {painting.featured && (
                        <span className="admin-card__featured-tag">Featured</span>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="admin-card__body">
                      <div className="admin-card__header">
                        <div>
                          <h2 className="admin-card__title">{painting.title}</h2>
                          <p className="admin-card__meta">
                            {painting.medium} · {painting.widthCm} × {painting.heightCm} cm ({painting.year})
                          </p>
                        </div>
                      </div>

                      {painting.description && (
                        <p className="admin-card__desc">{painting.description}</p>
                      )}

                      {/* Price Row */}
                      <div className="admin-card__price-row">
                        <span className="admin-card__price-label">Price</span>
                        <span className="admin-card__price">{formatPKR(painting.price)}</span>
                      </div>

                      {/* 1-Click Status Toggles */}
                      <div className="admin-card__status-bar" role="group" aria-label="Quick Status Toggle">
                        <button
                          type="button"
                          className={`admin-card__status-btn ${painting.status === 'available' ? 'admin-card__status-btn--active-available' : ''}`}
                          onClick={() => handleStatusChange(painting.id, 'available')}
                        >
                          Available
                        </button>
                        <button
                          type="button"
                          className={`admin-card__status-btn ${painting.status === 'reserved' ? 'admin-card__status-btn--active-reserved' : ''}`}
                          onClick={() => handleStatusChange(painting.id, 'reserved')}
                        >
                          Reserved
                        </button>
                        <button
                          type="button"
                          className={`admin-card__status-btn ${painting.status === 'sold' ? 'admin-card__status-btn--active-sold' : ''}`}
                          onClick={() => handleStatusChange(painting.id, 'sold')}
                        >
                          Sold
                        </button>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="admin-card__actions">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(painting)}
                          className="btn btn--framed admin-card__edit-btn"
                        >
                          Edit Details
                        </button>
                        <Link
                          to={`/painting/${painting.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-card__view-btn"
                          title="View live artwork page"
                        >
                          View ↗
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteArtwork(painting.id, painting.title)}
                          className="admin-card__del-btn"
                          title="Delete artwork"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------------
          Tab 2: Customer Orders View
          --------------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <section aria-label="Customer Orders Registry">
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--taupe)' }}>
              No customer orders received yet.
            </div>
          ) : (
            <div className="admin-orders-list">
              {orders.map((order) => {
                const waEnquiry = buildWhatsAppMessage({
                  name: order.customer_name,
                  message: `Hello ${order.customer_name}, this is SK from The Atelier regarding your order reference ${order.reference}.`,
                })

                return (
                  <article key={order.id || order.reference} className="admin-order-card">
                    <div className="admin-order-card__header">
                      <div>
                        <h2 className="admin-order-card__ref">{order.reference}</h2>
                        <span className="admin-order-card__date">
                          Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <select
                        value={order.status}
                        onChange={(e) => handleOrderStatusUpdate(order.id || order.reference, e.target.value)}
                        className="admin-order-card__status-select"
                        aria-label="Update Order Status"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="admin-order-card__grid">
                      {/* Customer Details */}
                      <div className="admin-order-card__section">
                        <span className="admin-order-card__label">Customer</span>
                        <p className="admin-order-card__value">
                          <strong>{order.customer_name}</strong>
                          <br />
                          {order.customer_phone}
                          {order.customer_email && <><br />{order.customer_email}</>}
                        </p>
                      </div>

                      {/* Delivery Address */}
                      <div className="admin-order-card__section">
                        <span className="admin-order-card__label">Delivery Address</span>
                        <p className="admin-order-card__value">
                          {order.address}, {order.city}
                          {order.notes && (
                            <><br /><em style={{ color: 'var(--taupe)' }}>Note: {order.notes}</em></>
                          )}
                        </p>
                      </div>

                      {/* Payment & Amount */}
                      <div className="admin-order-card__section">
                        <span className="admin-order-card__label">Payment & Value</span>
                        <p className="admin-order-card__value">
                          <strong>{formatPKR(order.total_pkr)}</strong>
                          <br />
                          Method: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                        </p>
                      </div>

                      {/* Ordered Artworks */}
                      <div className="admin-order-card__section">
                        <span className="admin-order-card__label">Artworks Included</span>
                        <ul className="admin-order-card__items">
                          {(order.items || []).map((item, idx) => (
                            <li key={item.id || idx} className="admin-order-card__item">
                              <span>{item.title}</span>
                              <span style={{ color: 'var(--gold)' }}>{formatPKR(item.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="admin-order-card__footer">
                      <a
                        href={waEnquiry.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-order-card__wa-btn"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.02 18.06c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.13.82.83-3.05-.2-.32a7.89 7.89 0 0 1-1.22-4.26c0-4.38 3.57-7.95 7.97-7.95 2.13 0 4.13.83 5.64 2.33a7.93 7.93 0 0 1 2.33 5.64c0 4.38-3.56 7.95-7.97 7.95zm4.37-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                        </svg>
                        <span>WhatsApp Buyer Directly</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------------
          Add / Edit Artwork Modal Drawer
          --------------------------------------------------------------------- */}
      {modalOpen && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <header className="admin-modal__header">
              <h2 className="admin-modal__title">
                {editingItem ? 'Edit Artwork' : 'Add New Original to Stock'}
              </h2>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSaveArtwork} className="admin-modal__body" noValidate>
              {/* Image URL & Live Preview */}
              <div className="admin-preview-row">
                <div className="admin-preview-box">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </div>

                <div className="admin-field">
                  <label className="admin-field__label">Primary Image URL or Path *</label>
                  <input
                    type="text"
                    placeholder="e.g. /artworks/photo.jpg or https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="admin-field__control"
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--taupe)' }}>
                    Paste a direct image link (e.g. from Supabase Storage, Imgur, or direct URL/relative path).
                  </span>
                </div>
              </div>

              {/* Extra Perspective Image URL */}
              <div className="admin-field">
                <label className="admin-field__label">Secondary Detail / Perspective Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. /artworks/detail.jpg or https://..."
                  value={formData.perspectiveUrl}
                  onChange={(e) => setFormData({ ...formData, perspectiveUrl: e.target.value })}
                  className="admin-field__control"
                />
              </div>

              {/* Form Grid: Title & Price */}
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label className="admin-field__label">Artwork Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ember Field"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="admin-field__control"
                    required
                  />
                </div>

                <div className="admin-field">
                  <label className="admin-field__label">Price (PKR) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 185000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="admin-field__control"
                    required
                  />
                </div>
              </div>

              {/* Form Grid: Status & Medium */}
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label className="admin-field__label">Inventory Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="admin-field__control"
                  >
                    <option value="available">Available for Acquisition</option>
                    <option value="reserved">Reserved by Collector</option>
                    <option value="sold">Sold (Archive)</option>
                  </select>
                </div>

                <div className="admin-field">
                  <label className="admin-field__label">Medium</label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy acrylic impasto on Italian linen"
                    value={formData.medium}
                    onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                    className="admin-field__control"
                  />
                </div>
              </div>

              {/* Form Grid: Dimensions & Year */}
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label className="admin-field__label">Width × Height (cm)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Width (cm)"
                      value={formData.widthCm}
                      onChange={(e) => setFormData({ ...formData, widthCm: e.target.value })}
                      className="admin-field__control"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      placeholder="Height (cm)"
                      value={formData.heightCm}
                      onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                      className="admin-field__control"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label className="admin-field__label">Creation Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="admin-field__control"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="admin-field">
                <label className="admin-field__label">Artwork Description / Curator Note</label>
                <textarea
                  rows={4}
                  placeholder="Describe the texture, palette knife strokes, inspiration, and mood of this piece..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="admin-field__control admin-field__textarea"
                />
              </div>

              {/* Featured Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--champagne)', fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--gold)' }}
                />
                Feature this artwork on the Homepage curated gallery
              </label>

              {/* Modal Footer */}
              <div className="admin-modal__footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn--framed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn--gilded"
                >
                  <span>{saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Publish Artwork'}</span>
                  <span className="btn__arrow">→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
