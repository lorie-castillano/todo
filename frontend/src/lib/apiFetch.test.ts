import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiFetch } from './apiFetch'
import { getToken, setToken, clearToken } from './authToken'
import { onSessionExpired } from './sessionEvents'
import * as authApi from './authApi'

// Tests for apiFetch's silent-refresh behavior (Lesson 5.5).
//
// We mock refreshSession (the network refresh) and the global fetch, then drive
// the three key paths: happy request, 401 → refresh → retry, and 401 → refresh
// fails → token cleared.

vi.mock('./authApi', () => ({
  refreshSession: vi.fn(),
}))

const mockedRefresh = vi.mocked(authApi.refreshSession)

// Build a minimal Response-like object with a given status.
function res(status: number): Response {
  return new Response(null, { status })
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockedRefresh.mockReset()
    clearToken()
  })

  it('attaches the Bearer token to the request', async () => {
    setToken('abc123')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200))

    await apiFetch('/api/todos')

    const init = fetchSpy.mock.calls[0]![1] as RequestInit
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer abc123')
  })

  it('returns the response directly on success (no refresh)', async () => {
    setToken('abc123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200))

    const response = await apiFetch('/api/todos')

    expect(response.status).toBe(200)
    expect(mockedRefresh).not.toHaveBeenCalled()
  })

  it('on 401, refreshes the token and retries the request once', async () => {
    setToken('expired')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(res(401)) // first attempt: expired token
      .mockResolvedValueOnce(res(200)) // retry after refresh

    mockedRefresh.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      accessToken: 'fresh-token',
    })

    const response = await apiFetch('/api/todos')

    expect(mockedRefresh).toHaveBeenCalledOnce()
    expect(response.status).toBe(200)
    // The retry used the newly-stored token.
    expect(getToken()).toBe('fresh-token')
    const retryInit = fetchSpy.mock.calls[1]![1] as RequestInit
    expect(new Headers(retryInit.headers).get('Authorization')).toBe('Bearer fresh-token')
  })

  it('clears the token when refresh fails', async () => {
    setToken('expired')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(401))
    mockedRefresh.mockResolvedValue(null) // refresh cookie also invalid

    const response = await apiFetch('/api/todos')

    expect(response.status).toBe(401)
    expect(getToken()).toBeNull()
  })

  it('announces session expiry when refresh fails so React can react', async () => {
    setToken('expired')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(401))
    mockedRefresh.mockResolvedValue(null)

    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await apiFetch('/api/todos')

    // Clearing localStorage alone would leave AuthContext holding a stale user,
    // so the protected route would never re-render and never redirect.
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('does not announce expiry when the refresh succeeds', async () => {
    setToken('expired')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(res(401))
      .mockResolvedValueOnce(res(200))
    mockedRefresh.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      accessToken: 'fresh-token',
    })

    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await apiFetch('/api/todos')

    // A silent refresh must stay silent — logging the user out here would
    // defeat the whole point of short-lived access tokens.
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})
