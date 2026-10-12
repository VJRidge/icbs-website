/**
 * POST /api/import-kit-subscribers
 * Staff-only dry-run / commit for kit subscribers → contacts.
 * Body: { jobId: string, action: 'dry_run' | 'commit' }
 * Never mutates kit `subscribers`.
 */
import { env, supabase } from './_lib.js'
import { commitKitSubscriberImport, dryRunKitSubscriberImport } from './_imports.js'

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

async function canManageImports(userId: string): Promise<boolean> {
  const rows = await supabase(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
  )
  const row = rows?.[0]
  if (!row?.staff_approved || row?.disabled_at) return false
  return row.role === 'owner' || row.role === 'admin' || row.role === 'editor'
}

type Body = {
  jobId?: string
  action?: 'dry_run' | 'commit'
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const userId = await staffUserId(req.headers?.authorization)
  if (!userId || !(await canManageImports(userId))) {
    return res.status(401).json({ error: 'Staff authentication required.' })
  }

  const body: Body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
  const action = body.action
  if (!jobId || (action !== 'dry_run' && action !== 'commit')) {
    return res.status(400).json({ error: 'jobId and action (dry_run|commit) are required.' })
  }

  try {
    if (action === 'dry_run') {
      const result = await dryRunKitSubscriberImport(jobId)
      return res.status(200).json({ ok: true, ...result })
    }
    const result = await commitKitSubscriberImport(jobId)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed.'
    console.error('import-kit-subscribers failed', err)
    return res.status(400).json({ error: message })
  }
}
