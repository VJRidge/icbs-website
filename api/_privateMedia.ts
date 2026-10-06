/** Mirrors src/lib/media/privateSignedUrl.ts for Vercel API routes. */

export const PRIVATE_MEDIA_BUCKET = 'media-private' as const

export const SIGNED_URL_EXPIRES_MIN = 60
export const SIGNED_URL_EXPIRES_MAX = 3600
export const SIGNED_URL_EXPIRES_DEFAULT = 300

const UNSAFE_SEGMENT = /(?:^|\/)\.\.(?:\/|$)/

export type PrivateMediaSignRequest = {
  bucket: string
  path: string
  expiresIn?: number | null
}

export type PrivateMediaSignParsed =
  | { ok: true; bucket: typeof PRIVATE_MEDIA_BUCKET; path: string; expiresIn: number }
  | { ok: false; error: string }

export function clampSignedUrlExpiresIn(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : SIGNED_URL_EXPIRES_DEFAULT
  if (n < SIGNED_URL_EXPIRES_MIN) return SIGNED_URL_EXPIRES_MIN
  if (n > SIGNED_URL_EXPIRES_MAX) return SIGNED_URL_EXPIRES_MAX
  return n
}

function normalizeObjectPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/^\/+/, '')
  if (!trimmed || trimmed.length > 1024) return null
  if (trimmed.includes('\\') || trimmed.includes('\0')) return null
  if (trimmed.includes('://')) return null
  if (UNSAFE_SEGMENT.test(trimmed)) return null
  if (trimmed.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) return null
  return trimmed
}

export function parsePrivateMediaSignRequest(input: PrivateMediaSignRequest): PrivateMediaSignParsed {
  if (input.bucket !== PRIVATE_MEDIA_BUCKET) {
    return { ok: false, error: 'Only the media-private bucket can be signed.' }
  }
  const path = normalizeObjectPath(input.path)
  if (!path) {
    return { ok: false, error: 'A safe storage object path is required.' }
  }
  return {
    ok: true,
    bucket: PRIVATE_MEDIA_BUCKET,
    path,
    expiresIn: clampSignedUrlExpiresIn(input.expiresIn),
  }
}

export function absoluteSignedStorageUrl(supabaseUrl: string, signedURL: string): string {
  const base = supabaseUrl.replace(/\/+$/, '')
  if (signedURL.startsWith('http://') || signedURL.startsWith('https://')) return signedURL
  const path = signedURL.startsWith('/') ? signedURL : `/${signedURL}`
  if (path.startsWith('/storage/v1/')) return `${base}${path}`
  return `${base}/storage/v1${path}`
}
