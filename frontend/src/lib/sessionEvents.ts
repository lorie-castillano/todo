// Session events — a tiny pub/sub channel for "your session just died".
//
// Why this exists:
// The fetch layer is the first to learn that a session is unrecoverable (a 401
// whose refresh attempt also failed). But it lives outside React, so it cannot
// call setState. Clearing localStorage is not enough: `isAuthenticated` derives
// from AuthContext's `user` state, so without a re-render the user keeps staring
// at a dead UI where every request fails.
//
// Why a separate module instead of putting this in authToken.ts?
// Import direction. AuthContext imports apiFetch/authApi; if the token module
// reached back into React state we would risk a cycle. A standalone channel
// keeps the dependency graph acyclic: apiFetch publishes, AuthContext subscribes,
// and neither knows about the other.

type SessionExpiredListener = () => void

const listeners = new Set<SessionExpiredListener>()

/**
 * Subscribe to session expiry. Returns an unsubscribe function, which makes it
 * drop-in compatible with a `useEffect` cleanup.
 */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Announce that the session is gone for good. Listeners are isolated so one
 * throwing subscriber cannot stop the others from clearing their state.
 */
export function emitSessionExpired(): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // A broken listener must not block the rest of the logout path.
    }
  }
}
