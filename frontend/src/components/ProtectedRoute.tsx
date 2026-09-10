// Route guards — the two halves of "who is allowed to see this route".
//
// ProtectedRoute gates authenticated-only pages (the app itself).
// GuestRoute gates unauthenticated-only pages (the login form).
//
// Both share the same rule: while the session is being restored, render a
// spinner instead of deciding. Guessing during `loading` is the classic bug —
// it flashes the login page on every reload for users who are in fact signed in,
// and it would bounce a signed-in user off /login before their session resolves.
//
// Note these guards are UX, not security. The server enforces access with the
// `authenticate` preHandler on every /api/todos route; a user who bypasses the
// client guard sees an empty shell and 401s, not other people's data.

import { Navigate, useLocation, type Location } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

// Preserve the whole destination, not just the path. A user deep-linked to
// `/active?q=urgent#top` should land back there after logging in — pathname
// alone would silently drop their query and hash.
function fullPath(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`
}

function SessionSpinner({ label }: { label: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"
      role="status"
      aria-label={label}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
    </div>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <SessionSpinner label="Checking authentication" />
  }

  if (!isAuthenticated) {
    // Remember the attempted URL so LoginPage can redirect back after auth.
    return <Navigate to="/login" replace state={{ from: fullPath(location) }} />
  }

  return <>{children}</>
}

// GuestRoute — the inverse guard. An already-authenticated user has no reason
// to see the sign-in form, so send them where they were headed (or home).
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <SessionSpinner label="Checking authentication" />
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    // Normalize a self-referential destination. Redirecting to /login would
    // resolve on the next hop anyway (the new location carries no state, so
    // `from` falls back to '/'), but skipping it avoids a wasted render.
    const target = from.startsWith('/login') ? '/' : from
    return <Navigate to={target} replace />
  }

  return <>{children}</>
}
