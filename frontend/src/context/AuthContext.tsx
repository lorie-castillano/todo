// Auth context — global authentication state for the app.
//
// Responsibilities:
// - Hold the current user (or null if logged out)
// - Expose login / register / logout actions
// - Restore the session on mount by validating the stored token
// - Track a `loading` flag so protected routes can wait before redirecting
//
// Why context instead of a store like Zustand?
// - Auth is a cross-cutting concern read by many components (guards, header).
// - Context is the idiomatic React answer for dependency-injected singletons.
// - The value changes rarely (login/logout), so re-render cost is negligible.

/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  loginUser,
  registerUser,
  fetchMe,
  refreshSession,
  logoutRequest,
  type AuthUser,
  type Credentials,
} from '../lib/authApi'
import { setToken, clearToken } from '../lib/authToken'
import { logger } from '../lib/logger'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (creds: Credentials) => Promise<void>
  register: (creds: Credentials) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore the session. Two-step:
  // 1. Try the stored access token via /me (fast path, still valid).
  // 2. If that fails (expired/absent token), try /refresh — the httpOnly
  //    cookie may still be valid, giving us a new access token without a login.
  useEffect(() => {
    let cancelled = false

    async function restore(): Promise<AuthUser | null> {
      const me = await fetchMe()
      if (me) return me

      // Access token missing/expired — attempt a silent refresh via cookie.
      const session = await refreshSession()
      if (session) {
        setToken(session.accessToken)
        return session.user
      }
      return null
    }

    restore()
      .then((restored) => {
        if (!cancelled) setUser(restored)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (creds: Credentials) => {
    const { user: loggedIn, accessToken } = await loginUser(creds)
    setToken(accessToken)
    setUser(loggedIn)
    logger.info('User logged in', { userId: loggedIn.id })
  }, [])

  const register = useCallback(async (creds: Credentials) => {
    // Register creates the account, then we immediately log in to get a token.
    await registerUser(creds)
    const { user: loggedIn, accessToken } = await loginUser(creds)
    setToken(accessToken)
    setUser(loggedIn)
    logger.info('User registered and logged in', { userId: loggedIn.id })
  }, [])

  const logout = useCallback(() => {
    // Fire-and-forget server revocation, then clear local state immediately so
    // the UI responds instantly regardless of network latency.
    void logoutRequest()
    clearToken()
    setUser(null)
    logger.info('User logged out')
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook for consuming the auth context. Throws if used outside the provider,
// which catches wiring mistakes early.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
