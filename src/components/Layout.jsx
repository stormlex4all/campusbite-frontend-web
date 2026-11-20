import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import Button from './Button';

const NAV = {
  student: [{ to: '/stores', label: 'Stores' }],
  vendor: [
    { to: '/my-store', label: 'My store' },
    { to: '/menu', label: 'Menu items' },
    { to: '/listings', label: 'Listings' },
    { to: '/stores', label: 'All stores' },
  ],
  admin: [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/vendors/new', label: 'Add vendor' },
    { to: '/admin/audit', label: 'Audit log' },
    { to: '/stores', label: 'Stores' },
  ],
};

/** Announces the new page title to screen readers after client-side navigation. */
function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [text, setText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setText(document.title), 150);
    return () => clearTimeout(t);
  }, [pathname]);
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="route-announcer">
      {text}
    </div>
  );
}

export default function Layout() {
  const { status, user, logout } = useAuth();
  const links = status === 'authenticated' ? NAV[user.role] || [] : [];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <NavLink to="/" className="brand" aria-label="CampusBite home">
            <span aria-hidden="true">🥪</span> CampusBite
          </NavLink>
          <nav aria-label="Main">
            <ul className="nav-list">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
              {status === 'authenticated' ? (
                <>
                  <li>
                    <NavLink to="/account" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                      Account
                    </NavLink>
                  </li>
                  <li>
                    <Button variant="ghost" onClick={logout}>
                      Sign out
                    </Button>
                  </li>
                </>
              ) : status === 'anonymous' ? (
                <>
                  <li>
                    <NavLink to="/login" className="nav-link">
                      Sign in
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/register" className="nav-link">
                      Create account
                    </NavLink>
                  </li>
                </>
              ) : null}
            </ul>
          </nav>
        </div>
      </header>
      <RouteAnnouncer />
      <main id="main" className="container main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">CampusBite helps rescue surplus campus food. Dietary details are provided by vendors and are not a guarantee.</div>
      </footer>
    </>
  );
}
