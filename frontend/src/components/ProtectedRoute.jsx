import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-base)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
