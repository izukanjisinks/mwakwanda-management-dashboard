import type { ApiError } from '@/types/auth'
import { useForbiddenHandler } from '@/composables/useForbiddenHandler'
import { handleSessionExpired } from './sessionExpiry'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081/api/v1'
const TOKEN_KEY = 'lodge_token'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestOptions {
  body?: unknown
  requiresAuth?: boolean
  params?: Record<string, string | number | boolean | undefined>
}

// UUID or plain numeric path segment — used to skip resource IDs when
// deriving a human-readable resource name for the Access Denied screen.
function isIdSegment(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment)
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, requiresAuth = true, params } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (requiresAuth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // Build URL with query params
  let url = `${BASE_URL}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  // A 401 on a request that expected to be authenticated means the token
  // expired or was revoked mid-session — bounce to login rather than let the
  // caller treat this as a generic failed request.
  if (response.status === 401 && requiresAuth) {
    handleSessionExpired(TOKEN_KEY, '/login')
    return new Promise<T>(() => {})
  }

  if (!response.ok) {
    // Handle 403 Forbidden errors — regardless of HTTP method, so a blocked
    // POST/PUT/PATCH/DELETE shows the same Access Denied screen a blocked
    // GET does.
    if (response.status === 403) {
      const { showForbidden } = useForbiddenHandler()
      const pathParts = path.split('/').filter(Boolean)
      // Walk back from the end past ID-like segments (UUIDs, numeric IDs) so
      // e.g. DELETE /users/{uuid} still resolves to "Users", not the id.
      const resourceSegment = [...pathParts].reverse().find(p => !isIdSegment(p)) ?? pathParts[pathParts.length - 1]
      const resourceName = resourceSegment
        ?.replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())

      showForbidden(resourceName)
    }

    const text = await response.text().catch(() => '')
    let errorData: ApiError
    try {
      const parsed = JSON.parse(text)
      errorData = parsed?.error
        ? parsed
        : { error: { code: 'UNKNOWN_ERROR', message: (parsed?.message ?? text) || `HTTP ${response.status}` } }
    } catch {
      errorData = { error: { code: 'UNKNOWN_ERROR', message: text || `HTTP ${response.status}` } }
    }
    throw errorData
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, options?: { requiresAuth?: boolean; params?: Record<string, string | number | boolean | undefined> }) =>
    request<T>('GET', path, { requiresAuth: options?.requiresAuth, params: options?.params }),

  post: <T>(path: string, body?: unknown, requiresAuth = true) =>
    request<T>('POST', path, { body, requiresAuth }),

  put: <T>(path: string, body?: unknown, requiresAuth = true) =>
    request<T>('PUT', path, { body, requiresAuth }),

  patch: <T>(path: string, body?: unknown, requiresAuth = true) =>
    request<T>('PATCH', path, { body, requiresAuth }),

  delete: <T>(path: string, requiresAuth = true) =>
    request<T>('DELETE', path, { requiresAuth }),
}
