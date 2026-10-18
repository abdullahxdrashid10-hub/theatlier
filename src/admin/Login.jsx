import { useState } from 'react'
import { Link } from 'react-router-dom'
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
      setError(err.message || 'Login failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg" aria-hidden="true" />
      <div className="admin-login-overlay" aria-hidden="true" />

      <div className="admin-login-container">
        <div className="admin-login-card">
          <header className="admin-login-header">
            <img
              src="/logo.webp"
              alt="The Atelier by SK"
              className="admin-login-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="admin-login-brand">The Atelier by SK</div>
            <h1 className="admin-login-title">Studio Portal</h1>
            <p className="admin-login-subtitle">Private Curatorial &amp; Order Administration</p>
          </header>

          {error && (
            <div
              style={{
                background: '#2b1818',
                border: '1px solid #732a2a',
                color: '#e57d7d',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="admin-field">
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                className="admin-input"
                placeholder="curator@theatelier.com"
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
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ width: '100%', marginTop: '0.75rem', letterSpacing: '0.04em' }}
              disabled={loading}
            >
              {loading ? 'Verifying Authorization…' : 'Sign In to Portal'}
            </button>
          </form>

          <footer className="admin-login-footer">
            <Link to="/" className="admin-login-return">
              ← Return to Public Gallery
            </Link>
            <div className="admin-login-note">
              Restricted portal. Accounts are provisioned via Supabase Auth.
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

