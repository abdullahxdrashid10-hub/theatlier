import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminSupabase } from './adminClient'
import { formatPKR } from '../utils/formatPKR'

export default function Paintings() {
  const [paintings, setPaintings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    adminSupabase
      .from('paintings')
      .select('*, painting_images(url, sort_order)')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(err.message || 'Failed to load paintings.')
        else setPaintings(data || [])
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Unable to retrieve catalog paintings.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Paintings</h1>
        <Link to="/admin/paintings/new" className="admin-btn admin-btn--primary">
          + Add New Painting
        </Link>
      </div>

      {error && (
        <div style={{ background: '#261616', border: '1px solid #732a2a', color: '#e57d7d', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem 0', color: '#8c8c93' }}>Loading catalog works…</div>
      ) : paintings.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: '#8c8c93', marginBottom: '1rem' }}>No paintings in catalog yet.</p>
          <Link to="/admin/paintings/new" className="admin-btn admin-btn--primary">
            Create First Painting
          </Link>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Artwork</th>
                <th>Medium</th>
                <th>Size</th>
                <th>Price</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paintings.map((painting) => {
                const sortedImages = (painting.painting_images || []).sort(
                  (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
                )
                const mainImage = sortedImages[0]?.url || ''

                return (
                  <tr key={painting.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt=""
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', background: '#202026' }}
                          />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: '#202026', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c93', fontSize: '0.7rem' }}>
                            No img
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/admin/paintings/${painting.id}`}
                            style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, display: 'block' }}
                          >
                            {painting.title}
                          </Link>
                          <span style={{ color: '#8c8c93', fontSize: '0.8rem' }}>/{painting.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#a0a0a5', fontSize: '0.85rem' }}>{painting.medium}</td>
                    <td style={{ color: '#a0a0a5', whiteSpace: 'nowrap' }}>
                      {painting.width_cm} × {painting.height_cm} cm
                    </td>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {formatPKR(painting.price_pkr)}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${painting.status}`}>
                        {painting.status}
                      </span>
                    </td>
                    <td>
                      {painting.featured ? (
                        <span style={{ color: '#d4af37', fontSize: '0.85rem' }}>★ Yes</span>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>No</span>
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/admin/paintings/${painting.id}`}
                        className="admin-btn admin-btn--secondary"
                        style={{ minHeight: '40px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
