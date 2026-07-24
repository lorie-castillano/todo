// ProtectedRoute — gates its children behind authentication.
//
// Behavior:
// - While the session is being restored (loading), render a spinner. This
//   prevents a flash of the login page on reload when a valid token exists.
// - If not authenticated, redirect to /login, remembering where the user was
//   headed so we can send them back after login.
// - Otherwise, render the protected content.

import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"
        role="status"
        aria-label="Checking authentication"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Remember the attempted URL so LoginPage can redirect back after auth.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
