import { randomBytes } from 'node:crypto'
import { env, supabase } from './_lib.js'

type PreviewBody = {
  contentId?: string | null
  title?: string
  document?: unknown
  post?: unknown
}

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

async function canMintPreview(userId: string): Promise<boolean> {
  const rows = await supabase(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
  )
  const row = rows?.[0]
  if (!row?.staff_approved || row?.disabled_at) return false
  // Mirror content.create capability from Phase 2 matrix.
  return row.role === 'owner' || row.role === 'admin' || row.role === 'editor' || row.role === 'author'
}

function newToken(): string {
  return randomBytes(24).toString('base64url')
}

// GET /api/cms-preview?token=…  — public token read (noindex client)
// POST /api/cms-preview         — staff mint (Bearer JWT)
export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')

  if (req.method === 'GET') {
    const token = typeof req.query?.token === 'string' ? req.query.token : ''
    if (!token) return res.status(400).json({ error: 'Missing preview token.' })
    const rows = await supabase(
      `content_previews?token=eq.${encodeURIComponent(token)}&select=title,document,post_meta,expires_at&limit=1`,
    )
    const row = rows?.[0]
    if (!row) return res.status(404).json({ error: 'Preview not found.' })
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: 'Preview expired.' })
    }
    return res.status(200).json({
      title: row.title,
      document: row.document,
      post: row.post_meta ?? undefined,
      expiresAt: row.expires_at,
    })
  }

  if (req.method === 'POST') {
    const userId = await staffUserId(req.headers?.authorization)
    if (!userId || !(await canMintPreview(userId))) {
      return res.status(401).json({ error: 'Staff authentication required.' })
    }
    const body: PreviewBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    if (!body.title || typeof body.title !== 'string' || !body.document || typeof body.document !== 'object') {
      return res.status(400).json({ error: 'Preview title and document are required.' })
    }
    const token = newToken()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()
    await supabase('content_previews', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        token,
        content_id: body.contentId || null,
        title: body.title.slice(0, 300),
        document: body.document,
        post_meta: body.post ?? null,
        created_by: userId,
        expires_at: expiresAt,
      }),
    })
    return res.status(201).json({ token, expiresAt, path: `/preview?token=${encodeURIComponent(token)}` })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
