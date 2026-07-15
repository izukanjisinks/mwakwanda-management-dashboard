import type { ApiError } from '@/types/auth'
import { handleSessionExpired } from './sessionExpiry'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081/api/v1'
const TOKEN_KEY = 'lodge_token'

/**
 * Fetches a file response (e.g. CSV) and triggers a browser download.
 * Uses the same auth + base URL convention as apiClient, but returns a blob
 * instead of JSON. The filename comes from the Content-Disposition header when
 * present, otherwise a sensible fallback is derived from the path.
 */
export async function downloadFile(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<void> {
  const headers: Record<string, string> = {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.append(key, String(value))
  })
  const qs = searchParams.toString()
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`

  const response = await fetch(url, { method: 'GET', headers, credentials: 'include' })

  if (response.status === 401) {
    handleSessionExpired(TOKEN_KEY, '/login')
    return new Promise<void>(() => {})
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

  // Prefer the server-provided filename from Content-Disposition.
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match?.[1] ?? `${path.split('/').filter(Boolean).pop() || 'export'}.csv`

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
