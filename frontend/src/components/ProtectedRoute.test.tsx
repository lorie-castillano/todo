import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute, GuestRoute } from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

// Tests for the route guards.
//
// We mock `useAuth` rather than mounting AuthProvider + MSW. The guard's job is
// a pure decision over (loading, isAuthenticated), so stubbing the hook lets us
// drive all three states deterministically with no async timing. Session
// restoration itself is covered by the AuthContext/apiFetch tests.

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

type AuthState = { loading: boolean; isAuthenticated: boolean }

function setAuth({ loading, isAuthenticated }: AuthState) {
  mockUseAuth.mockReturnValue({
    loading,
    isAuthenticated,
    user: isAuthenticated ? { id: 'user-1', email: 'a@b.com' } : null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  })
}

type InitialEntry = string | { pathname: string; search?: string; hash?: string; state?: unknown }

// Render the guard inside a real router so <Navigate> actually navigates and we
// can assert on the resulting location — not just that a redirect was requested.
//
// Only the route under test is wrapped in the guard; the redirect target is
// left unguarded. Guarding both ends would let a redirect bounce a second time
// and mask where the navigation actually stopped.
function renderGuarded(guard: 'protected' | 'guest', initialEntry: InitialEntry) {
  const routes =
    guard === 'protected'
      ? [
          { path: '/login', element: <div>Login page</div> },
          {
            path: '*',
            element: (
              <ProtectedRoute>
                <div>Protected content</div>
              </ProtectedRoute>
            ),
          },
        ]
      : [
          {
            path: '/login',
            element: (
              <GuestRoute>
                <div>Login form</div>
              </GuestRoute>
            ),
          },
          { path: '*', element: <div>Protected content</div> },
        ]

  const router = createMemoryRouter(routes, {
    initialEntries: [initialEntry as string],
  })

  render(<RouterProvider router={router} />)
  return router
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a spinner while the session is being restored', () => {
    setAuth({ loading: true, isAuthenticated: false })
    renderGuarded('protected', '/')

    // The spinner matters: without it, a reload with a valid session would
    // flash the login page before the session resolves.
    expect(screen.getByRole('status', { name: /checking authentication/i })).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('does not redirect while loading, even when unauthenticated', () => {
    setAuth({ loading: true, isAuthenticated: false })
    const router = renderGuarded('protected', '/active')

    expect(router.state.location.pathname).toBe('/active')
  })

  it('renders children when authenticated', () => {
    setAuth({ loading: false, isAuthenticated: true })
    renderGuarded('protected', '/')

    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    setAuth({ loading: false, isAuthenticated: false })
    const router = renderGuarded('protected', '/')

    expect(router.state.location.pathname).toBe('/login')
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('replaces history on redirect so Back does not bounce', () => {
    setAuth({ loading: false, isAuthenticated: false })
    const router = renderGuarded('protected', '/')

    // A pushed redirect would leave the guarded URL in history, so pressing
    // Back would hit the guard again and ping-pong the user.
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('remembers the attempted path so login can return the user there', () => {
    setAuth({ loading: false, isAuthenticated: false })
    const router = renderGuarded('protected', '/completed')

    expect(router.state.location.state).toEqual({ from: '/completed' })
  })

  it('preserves query string and hash in the remembered destination', () => {
    setAuth({ loading: false, isAuthenticated: false })
    const router = renderGuarded('protected', '/active?q=urgent#top')

    // pathname alone would silently drop the user's filter and anchor.
    expect(router.state.location.state).toEqual({ from: '/active?q=urgent#top' })
  })
})

describe('GuestRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a spinner while the session is being restored', () => {
    setAuth({ loading: true, isAuthenticated: false })
    renderGuarded('guest', '/login')

    expect(screen.getByRole('status', { name: /checking authentication/i })).toBeInTheDocument()
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('renders the login form for unauthenticated visitors', () => {
    setAuth({ loading: false, isAuthenticated: false })
    renderGuarded('guest', '/login')

    expect(screen.getByText('Login form')).toBeInTheDocument()
  })

  it('redirects an authenticated user away from /login', () => {
    setAuth({ loading: false, isAuthenticated: true })
    const router = renderGuarded('guest', '/login')

    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })

  it('sends an authenticated user back to their original destination', () => {
    setAuth({ loading: false, isAuthenticated: true })
    const router = renderGuarded('guest', {
      pathname: '/login',
      state: { from: '/completed' },
    })

    expect(router.state.location.pathname).toBe('/completed')
  })

  it('sends the user home when the remembered destination is /login itself', () => {
    setAuth({ loading: false, isAuthenticated: true })
    const router = renderGuarded('guest', {
      pathname: '/login',
      state: { from: '/login' },
    })

    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByText('Login form')).not.toBeInTheDocument()
  })
})
