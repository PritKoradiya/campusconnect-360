import { Navigate, Outlet } from 'react-router-dom';
import { getDashboardPath, useAuth } from '../../context/AuthContext';

function ProtectedRoute({ allowedRoles = [] }) {
  const { loading, token, user } = useAuth();

  if (loading) {
    return null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
