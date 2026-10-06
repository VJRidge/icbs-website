import { env } from './_lib.js'
import {
  absoluteSignedStorageUrl,
  parsePrivateMediaSignRequest,
  PRIVATE_MEDIA_BUCKET,
} from './_privateMedia.js'

async function staffUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const jwt = authHeader.slice('Bearer '.length).trim()
  if (!jwt) return null
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${jwt}`,
    },
  })
  if (!res.ok) return null
  const user = (await res.json()) as { id?: string }
  return user.id || null
}

async function isApprovedStaff(userId: string): Promise<boolean> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  const res = await fetch(
    `${env('SUPABASE_URL')}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  )
  if (!res.ok) return false
  const rows = (await res.json()) as Array<{ staff_approved?: boolean; disabled_at?: string | null; role?: string }>
  const row = rows?.[0]
  return Boolean(row?.staff_approved && !row?.disabled_at && row?.role)
}

/**
 * POST /api/cms-media-sign
 * Staff Bearer JWT → short-lived signed URL for media-private objects only.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await staffUserId(req.headers?.authorization)
  if (!userId || !(await isApprovedStaff(userId))) {
    return res.status(401).json({ error: 'Staff authentication required.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const parsed = parsePrivateMediaSignRequest({
    bucket: typeof body.bucket === 'string' ? body.bucket : PRIVATE_MEDIA_BUCKET,
    path: typeof body.path === 'string' ? body.path : '',
    expiresIn: typeof body.expiresIn === 'number' ? body.expiresIn : undefined,
  })
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error })
  }

  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  const signRes = await fetch(
    `${env('SUPABASE_URL')}/storage/v1/object/sign/${encodeURIComponent(parsed.bucket)}/${parsed.path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: parsed.expiresIn }),
    },
  )

  if (!signRes.ok) {
    const detail = await signRes.text()
    return res.status(signRes.status === 404 ? 404 : 502).json({
      error: signRes.status === 404 ? 'Private media object not found.' : 'Could not sign private media URL.',
      detail: detail.slice(0, 300),
    })
  }

  const payload = (await signRes.json()) as { signedURL?: string; signedUrl?: string }
  const signed = payload.signedURL || payload.signedUrl
  if (!signed) {
    return res.status(502).json({ error: 'Storage sign response missing signedURL.' })
  }

  return res.status(200).json({
    bucket: parsed.bucket,
    path: parsed.path,
    expiresIn: parsed.expiresIn,
    signedUrl: absoluteSignedStorageUrl(env('SUPABASE_URL'), signed),
  })
}
