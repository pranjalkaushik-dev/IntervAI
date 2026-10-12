import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccessDeniedPage from '../../pages/AccessDeniedPage';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="ref-auth-loading">
        <div className="ref-loading-spinner" />
        <span>Authenticating IntervAI session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.accountRole)) {
    return <AccessDeniedPage />;
  }

  return children;
}
