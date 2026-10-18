import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminSupabase, assertTouched } from './adminClient'

const ALLOWED_MEDIUMS = [
  'Acrylic on canvas',
  'Mixed media on canvas',
  'Textured calligraphy on canvas',
]

function generateSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function resizeAndConvertToWebp(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image exceeds maximum allowed size of 15 MB.')
  }

  const bitmap = await createImageBitmap(file)
  const maxEdge = 2000
  let { width, height } = bitmap

  if (width > maxEdge || height > maxEdge) {
    if (width >= height) {
      height = Math.round((height * maxEdge) / width)
      width = maxEdge
    } else {
      width = Math.round((width * maxEdge) / height)
      height = maxEdge
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error('Canvas image conversion to WebP failed.'))
      },
      'image/webp',
      0.85
    )
  })

  return blob
}

export default function PaintingEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    price_pkr: 0,
    width_cm: 60,
    height_cm: 80,
    medium: ALLOWED_MEDIUMS[0],
    year: new Date().getFullYear(),
    status: 'available',
    featured: false,
  })

  const [images, setImages] = useState([])
  const [activeOrder, setActiveOrder] = useState(null)
  const [hasAnyOrders, setHasAnyOrders] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Load painting and associated orders if editing
  useEffect(() => {
    if (isNew) return

    let active = true

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const { data: p, error: pErr } = await adminSupabase
          .from('paintings')
          .select('*, painting_images(*)')
          .eq('id', id)
          .single()

        if (pErr) throw new Error(pErr.message || 'Artwork not found.')

        if (!active) return

        setForm({
          title: p.title || '',
          slug: p.slug || '',
          description: p.description || '',
          price_pkr: p.price_pkr || 0,
          width_cm: p.width_cm || 0,
          height_cm: p.height_cm || 0,
          medium: ALLOWED_MEDIUMS.includes(p.medium) ? p.medium : ALLOWED_MEDIUMS[0],
          year: p.year || new Date().getFullYear(),
          status: p.status || 'available',
          featured: Boolean(p.featured),
        })

        const sortedImages = (p.painting_images || []).sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
        setImages(sortedImages)

        // Check if painting has active or historical orders
        const { data: orderItems, error: oErr } = await adminSupabase
          .from('order_items')
          .select('order_id, orders(id, reference, status)')
          .eq('painting_id', id)

        if (!oErr && orderItems && orderItems.length > 0) {
          setHasAnyOrders(true)
          const activeOrderItem = orderItems.find((oi) => {
            const st = oi.orders?.status
            return st === 'pending' || st === 'confirmed'
          })
          if (activeOrderItem?.orders) {
            setActiveOrder(activeOrderItem.orders)
          }
        }
      } catch (err) {
        if (active) setError(err.message || 'Unable to load artwork.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [id, isNew])

  const handleTitleChange = (val) => {
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: slugManuallyEdited ? prev.slug : generateSlug(val),
    }))
  }

  const handleSlugChange = (val) => {
    setSlugManuallyEdited(true)
    setForm((prev) => ({ ...prev, slug: generateSlug(val) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      if (!form.title.trim()) throw new Error('Title is required.')
      if (!form.slug.trim()) throw new Error('Slug is required.')
      if (!ALLOWED_MEDIUMS.includes(form.medium)) {
        throw new Error(`Medium must be one of: ${ALLOWED_MEDIUMS.join(', ')}`)
      }

      // Check slug uniqueness
      let slugQuery = adminSupabase
        .from('paintings')
        .select('id')
        .eq('slug', form.slug.trim())

      if (!isNew) {
        slugQuery = slugQuery.neq('id', id)
      }

      const { data: existingSlug, error: slugErr } = await slugQuery
      if (slugErr) throw new Error(`Slug verification failed: ${slugErr.message}`)
      if (existingSlug && existingSlug.length > 0) {
        throw new Error(`The slug "${form.slug}" is already in use by another painting. Please choose a unique slug.`)
      }

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        price_pkr: Math.round(Number(form.price_pkr) || 0),
        width_cm: Number(form.width_cm) || null,
        height_cm: Number(form.height_cm) || null,
        medium: form.medium,
        year: Number(form.year) || new Date().getFullYear(),
        featured: Boolean(form.featured),
      }

      // Only include status if not locked by active order
      if (!activeOrder) {
        payload.status = form.status
      }

      if (isNew) {
        const { data, error: insertErr } = await adminSupabase
          .from('paintings')
          .insert(payload)
          .select()

        if (insertErr) throw new Error(insertErr.message || 'Failed to create painting.')
        const created = assertTouched(data, 'Painting creation')
        setSuccess('Painting created successfully.')
        navigate(`/admin/paintings/${created[0].id}`)
      } else {
        const { data, error: updateErr } = await adminSupabase
          .from('paintings')
          .update(payload)
          .eq('id', id)
          .select()

        if (updateErr) throw new Error(updateErr.message || 'Failed to update painting.')
        assertTouched(data, 'Painting update')
        setSuccess('Painting details saved.')
      }
    } catch (err) {
      setError(err.message || 'Failed to save painting.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePainting = async () => {
    if (hasAnyOrders) {
      setError('This painting is associated with orders and cannot be deleted.')
      return
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${form.title}"? This cannot be undone.`)
    if (!confirmed) return

    setSaving(true)
    setError(null)

    try {
      // Remove any storage images first
      const storagePaths = images.map((img) => img.storage_path).filter(Boolean)
      if (storagePaths.length > 0) {
        await adminSupabase.storage.from('paintings').remove(storagePaths)
      }

      const { data, error: delErr } = await adminSupabase
        .from('paintings')
        .delete()
        .eq('id', id)
        .select()

      if (delErr) throw new Error(delErr.message || 'Failed to delete painting.')
      assertTouched(data, 'Painting deletion')

      navigate('/admin/paintings')
    } catch (err) {
      setError(err.message || 'Deletion failed.')
      setSaving(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !id || isNew) return

    setUploadingImage(true)
    setError(null)
    try {
      const webpBlob = await resizeAndConvertToWebp(file)
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`

      const { error: uploadErr } = await adminSupabase.storage
        .from('paintings')
        .upload(fileName, webpBlob, {
          contentType: 'image/webp',
          upsert: false,
        })

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

      const { data: { publicUrl } } = adminSupabase.storage
        .from('paintings')
        .getPublicUrl(fileName)

      const nextSortOrder = images.length > 0
        ? Math.max(...images.map((img) => img.sort_order ?? 0)) + 1
        : 0

      const { data: insertedImg, error: imgErr } = await adminSupabase
        .from('painting_images')
        .insert({
          painting_id: id,
          url: publicUrl,
          storage_path: fileName,
          sort_order: nextSortOrder,
          alt: form.title,
        })
        .select()

      if (imgErr) {
        // Rollback uploaded storage object if row insert fails
        await adminSupabase.storage.from('paintings').remove([fileName])
        throw new Error(`Database image registration failed: ${imgErr.message}`)
      }

      assertTouched(insertedImg, 'Image insertion')
      setImages((prev) => [...prev, insertedImg[0]])
      setSuccess('Photo uploaded and processed as WebP.')
    } catch (err) {
      setError(err.message || 'Image processing failed.')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleDeleteImage = async (img) => {
    const confirmed = window.confirm('Delete this image?')
    if (!confirmed) return

    setError(null)
    try {
      if (img.storage_path) {
        await adminSupabase.storage.from('paintings').remove([img.storage_path])
      }

      const { data, error: delErr } = await adminSupabase
        .from('painting_images')
        .delete()
        .eq('id', img.id)
        .select()

      if (delErr) throw new Error(delErr.message || 'Failed to delete image record.')
      assertTouched(data, 'Image deletion')

      setImages((prev) => prev.filter((i) => i.id !== img.id))
      setSuccess('Image deleted.')
    } catch (err) {
      setError(err.message || 'Image deletion failed.')
    }
  }

  const handleMakeMain = async (targetImg) => {
    setError(null)
    try {
      const reordered = [
        targetImg,
        ...images.filter((i) => i.id !== targetImg.id),
      ]

      for (let idx = 0; idx < reordered.length; idx++) {
        const item = reordered[idx]
        const { data, error: updateErr } = await adminSupabase
          .from('painting_images')
          .update({ sort_order: idx })
          .eq('id', item.id)
          .select()

        if (updateErr) throw new Error(updateErr.message)
        assertTouched(data, 'Reorder image')
      }

      setImages(reordered.map((img, idx) => ({ ...img, sort_order: idx })))
      setSuccess('Main image updated.')
    } catch (err) {
      setError(err.message || 'Failed to update image order.')
    }
  }

  const handleMoveImage = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= images.length) return

    setError(null)
    try {
      const copy = [...images]
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp

      for (let idx = 0; idx < copy.length; idx++) {
        const item = copy[idx]
        const { data, error: updateErr } = await adminSupabase
          .from('painting_images')
          .update({ sort_order: idx })
          .eq('id', item.id)
          .select()

        if (updateErr) throw new Error(updateErr.message)
        assertTouched(data, 'Sort image')
      }

      setImages(copy.map((img, idx) => ({ ...img, sort_order: idx })))
    } catch (err) {
      setError(err.message || 'Failed to update image position.')
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem 0', color: '#8c8c93' }}>Loading artwork details…</div>
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <Link to="/admin/paintings" style={{ color: '#8c8c93', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← All Paintings
          </Link>
          <h1 className="admin-page-title" style={{ marginTop: '0.25rem' }}>
            {isNew ? 'New Painting' : `Edit: ${form.title}`}
          </h1>
        </div>

        {!isNew && (
          <button
            type="button"
            className="admin-btn admin-btn--danger"
            onClick={handleDeletePainting}
            disabled={saving || hasAnyOrders}
            title={hasAnyOrders ? 'Paintings with orders cannot be deleted' : undefined}
          >
            Delete Painting
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#261616', border: '1px solid #732a2a', color: '#e57d7d', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#1c241c', border: '1px solid #2e592e', color: '#8fe88f', padding: '0.85rem 1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="admin-grid-2">
          {/* Left Column: Core Fields */}
          <div className="admin-card">
            <h2 className="admin-card-title">Artwork Details</h2>

            <div className="admin-field">
              <label htmlFor="p-title">Title *</label>
              <input
                id="p-title"
                type="text"
                required
                className="admin-input"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="p-slug">Slug (unique URL path) *</label>
              <input
                id="p-slug"
                type="text"
                required
                className="admin-input"
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="p-medium">Medium *</label>
              <select
                id="p-medium"
                className="admin-select"
                value={form.medium}
                onChange={(e) => setForm((prev) => ({ ...prev, medium: e.target.value }))}
              >
                {ALLOWED_MEDIUMS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-field">
                <label htmlFor="p-width">Width (cm)</label>
                <input
                  id="p-width"
                  type="number"
                  min="1"
                  step="0.5"
                  className="admin-input"
                  value={form.width_cm}
                  onChange={(e) => setForm((prev) => ({ ...prev, width_cm: e.target.value }))}
                />
              </div>

              <div className="admin-field">
                <label htmlFor="p-height">Height (cm)</label>
                <input
                  id="p-height"
                  type="number"
                  min="1"
                  step="0.5"
                  className="admin-input"
                  value={form.height_cm}
                  onChange={(e) => setForm((prev) => ({ ...prev, height_cm: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-field">
                <label htmlFor="p-price">Price (PKR whole) *</label>
                <input
                  id="p-price"
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="admin-input"
                  value={form.price_pkr}
                  onChange={(e) => setForm((prev) => ({ ...prev, price_pkr: e.target.value }))}
                />
              </div>

              <div className="admin-field">
                <label htmlFor="p-year">Creation Year</label>
                <input
                  id="p-year"
                  type="number"
                  min="2000"
                  max="2030"
                  className="admin-input"
                  value={form.year}
                  onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
                />
              </div>
            </div>

            <div className="admin-field">
              <label htmlFor="p-desc">Description</label>
              <textarea
                id="p-desc"
                rows="4"
                className="admin-textarea"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="admin-field" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <input
                id="p-featured"
                type="checkbox"
                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                checked={form.featured}
                onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
              />
              <label htmlFor="p-featured" style={{ margin: 0, cursor: 'pointer', color: '#fff' }}>
                Featured on studio homepage
              </label>
            </div>
          </div>

          {/* Right Column: Status & Photos */}
          <div>
            <div className="admin-card">
              <h2 className="admin-card-title">Artwork Availability</h2>

              {activeOrder ? (
                <div style={{ background: '#2e2612', border: '1px solid #4a3c17', padding: '1rem', borderRadius: '4px' }}>
                  <div style={{ color: '#eec86b', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Status Locked by Active Order
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#e5e5e7' }}>
                    Reserved by order{' '}
                    <Link
                      to={`/admin/orders/${activeOrder.id}`}
                      style={{ color: '#d4af37', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      {activeOrder.reference}
                    </Link>
                  </p>
                  <span style={{ fontSize: '0.8rem', color: '#a0a0a5' }}>
                    Painting status transitions automatically when the order is confirmed or cancelled.
                  </span>
                </div>
              ) : (
                <div className="admin-field">
                  <label htmlFor="p-status">Status</label>
                  <select
                    id="p-status"
                    className="admin-select"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="available">Available (ready for acquisition)</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              )}
            </div>

            {/* Photos Manager */}
            {!isNew && (
              <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 className="admin-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                    Artwork Photography
                  </h2>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="photo-upload"
                    className={`admin-btn admin-btn--secondary ${uploadingImage ? 'admin-btn--disabled' : ''}`}
                    style={{ cursor: 'pointer', width: '100%' }}
                  >
                    {uploadingImage ? 'Processing & Uploading WebP…' : '📷 Upload High-Res Photo (Canvas WebP)'}
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <span style={{ display: 'block', color: '#8c8c93', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Images are automatically resized to max 2000px and converted to WebP (0.85 quality). Max file: 15 MB.
                  </span>
                </div>

                {images.length === 0 ? (
                  <p style={{ color: '#8c8c93', fontSize: '0.9rem', margin: 0 }}>No photos uploaded yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {images.map((img, idx) => (
                      <li
                        key={img.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: '#0e0e11',
                          padding: '0.75rem',
                          borderRadius: '4px',
                          border: '1px solid #232328',
                        }}
                      >
                        <img
                          src={img.url}
                          alt=""
                          style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {idx === 0 ? (
                              <span style={{ color: '#d4af37' }}>★ Main Image (sort: 0)</span>
                            ) : (
                              <span style={{ color: '#a0a0a5' }}>Image #{idx + 1} (sort: {img.sort_order})</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {idx !== 0 && (
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary"
                              style={{ minHeight: '36px', minWidth: '36px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                              onClick={() => handleMakeMain(img)}
                              title="Make Main"
                            >
                              Main
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{ minHeight: '36px', minWidth: '36px', padding: '0.3rem 0.6rem' }}
                            disabled={idx === 0}
                            onClick={() => handleMoveImage(idx, -1)}
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            style={{ minHeight: '36px', minWidth: '36px', padding: '0.3rem 0.6rem' }}
                            disabled={idx === images.length - 1}
                            onClick={() => handleMoveImage(idx, 1)}
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger"
                            style={{ minHeight: '36px', minWidth: '36px', padding: '0.3rem 0.6rem' }}
                            onClick={() => handleDeleteImage(img)}
                            title="Delete Photo"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link to="/admin/paintings" className="admin-btn admin-btn--secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={saving}
          >
            {saving ? 'Saving Artwork…' : isNew ? 'Create Painting' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
