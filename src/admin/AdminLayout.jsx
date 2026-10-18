import { NavLink, Outlet } from 'react-router-dom'
import { adminSignOut } from './adminClient'

export default function AdminLayout({ onLogout }) {
  const handleLogout = async () => {
    await adminSignOut()
    if (onLogout) onLogout()
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav" aria-label="Studio Admin Navigation">
        <NavLink to="/admin" className="admin-nav__brand">
          THE ATELIER · ADMIN
        </NavLink>

        <div className="admin-nav__links">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/orders"
            className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
          >
            Orders
          </NavLink>
          <NavLink
            to="/admin/paintings"
            className={({ isActive }) => `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
          >
            Paintings
          </NavLink>
          <button
            type="button"
            className="admin-nav__logout"
            onClick={handleLogout}
            title="Sign out of admin"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
