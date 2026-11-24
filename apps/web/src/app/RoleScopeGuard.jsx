import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthSessionContext.jsx';
import { LoadingState } from '../shared/index.js';

export function RoleScopeGuard({ allowedRoles = null, requiredPermission = null, children }) {
  const { user, loading, sessionExpiredFlag, can, pendingRedirectPath, clearPendingRedirect } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (pendingRedirectPath && location.pathname === pendingRedirectPath) {
      clearPendingRedirect();
    }
  }, [pendingRedirectPath, location.pathname, clearPendingRedirect]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <LoadingState message="Memeriksa sesi dan izin akses..." />
      </div>
    );
  }

  if (sessionExpiredFlag) {
    return <Navigate to="/session-expired" replace state={{ from: location.pathname }} />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (pendingRedirectPath && location.pathname !== pendingRedirectPath) {
    return <Navigate to={pendingRedirectPath} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, reason: 'role' }} />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, reason: requiredPermission }} />;
  }

  return children;
}
