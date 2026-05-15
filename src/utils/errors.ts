import type { ApiError } from '@/types/auth'

export function getApiError(err: unknown, fallback: string): string {
  if (err == null) return fallback

  if (typeof err === 'object') {
    // ApiError shape: { error: { code, message, details? } }
    if ('error' in err) {
      const e = (err as ApiError).error
      if (e?.message) {
        const details = e.details?.length ? `: ${e.details.join('; ')}` : ''
        return `${e.message}${details}`
      }
    }
    // Native Error / TypeError (e.g. network failure) or any { message: string }
    if ('message' in err && typeof (err as Record<string, unknown>).message === 'string') {
      const msg = (err as Record<string, unknown>).message as string
      if (msg) return msg
    }
  }

  if (typeof err === 'string' && err) return err

  return fallback
}
