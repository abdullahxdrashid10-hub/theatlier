import { useState } from 'react'
import { adminSignIn } from './adminClient'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      await adminSignIn(email, password)
      onLoginSuccess()
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
      <div className="admin-card" style={{ maxWidth: '420px', width: '100%', margin: 0 }}>
        <h1 className="admin-card-title" style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          Studio Portal
        </h1>

        {error && (
          <div style={{ background: '#2b1818', border: '1px solid #732a2a', color: '#e57d7d', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
