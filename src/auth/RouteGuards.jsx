import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from './AuthContext';
import Loading from '../components/Loading';

/** Signed-in users only. Others go to /login and come back afterwards. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading label="Checking your session" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Only the listed roles; anyone else is sent to their own home page. */
export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}

/** Login / register: signed-in users are sent on to their home. */
export function GuestOnly() {
  const { status, user } = useAuth();
  if (status === 'loading') return <Loading label="Checking your session" />;
  if (status === 'authenticated') return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
