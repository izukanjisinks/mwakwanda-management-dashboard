import type { ApiError } from '@/types/auth'
import { handleSessionExpired } from './sessionExpiry'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081/api/v1'
const BACKOFFICE_PREFIX = '/backoffice'
const TOKEN_KEY = 'lodge_backoffice_token'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface RequestOptions {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params } = options

  const token = localStorage.getItem(TOKEN_KEY)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let url = `${BASE_URL}${BACKOFFICE_PREFIX}${path}`
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

  if (response.status === 401 && path !== '/auth/login') {
    handleSessionExpired(TOKEN_KEY, '/backoffice/login')
    return new Promise<T>(() => {})
  }

  if (!response.ok) {
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

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const backofficeClient = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>('GET', path, { params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, { body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>('PUT', path, { body }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),

  delete: <T>(path: string) =>
    request<T>('DELETE', path),
}
