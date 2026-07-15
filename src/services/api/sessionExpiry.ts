const SESSION_EXPIRED_FLAG = 'lodge_session_expired'

let isRedirecting = false

/**
 * Called when a request that required auth comes back 401 mid-session.
 * Clears the stale token and does a hard redirect to the given login page,
 * flagging that the login view should tell the user why they're there.
 * A hard redirect (not router.push) guarantees every store/composable in the
 * app resets, since a token can go stale from any screen.
 */
export function handleSessionExpired(tokenKey: string, loginPath: string): void {
  localStorage.removeItem(tokenKey)

  if (window.location.pathname === loginPath || isRedirecting) return
  isRedirecting = true

  sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1')
  const redirect = window.location.pathname + window.location.search
  window.location.href = `${loginPath}?redirect=${encodeURIComponent(redirect)}`
}

/** Read (and clear) the session-expired flag — call once when a login view mounts. */
export function consumeSessionExpiredFlag(): boolean {
  const wasSet = sessionStorage.getItem(SESSION_EXPIRED_FLAG) === '1'
  if (wasSet) sessionStorage.removeItem(SESSION_EXPIRED_FLAG)
  return wasSet
}
