/**
 * POST /api/import-contact-list-csv
 * Staff-only dry-run / commit for CSV → Contacts + static list membership.
 * Body: { segmentId, csvText, action: 'dry_run'|'commit', confirmMarketingConsent: boolean }
 */
import { env, supabase } from './_lib.js'
import { commitContactListCsvImport, dryRunContactListCsvImport } from './_contactLists.js'

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

async function canManageLists(userId: string): Promise<boolean> {
  const rows = await supabase(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
  )
  const row = rows?.[0]
  if (!row?.staff_approved || row?.disabled_at) return false
  return row.role === 'owner' || row.role === 'admin' || row.role === 'editor'
}

type Body = {
  segmentId?: string
  csvText?: string
  action?: 'dry_run' | 'commit'
  confirmMarketingConsent?: boolean
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const userId = await staffUserId(req.headers?.authorization)
  if (!userId || !(await canManageLists(userId))) {
    return res.status(401).json({ error: 'Staff authentication required.' })
  }

  const body: Body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const segmentId = typeof body.segmentId === 'string' ? body.segmentId.trim() : ''
  const csvText = typeof body.csvText === 'string' ? body.csvText : ''
  const action = body.action
  const confirmMarketingConsent = body.confirmMarketingConsent === true

  if (!segmentId || !csvText.trim() || (action !== 'dry_run' && action !== 'commit')) {
    return res.status(400).json({
      error: 'segmentId, csvText, and action (dry_run|commit) are required.',
    })
  }
  if (csvText.length > 1_500_000) {
    return res.status(400).json({ error: 'CSV is too large (max ~1.5MB).' })
  }

  try {
    if (action === 'dry_run') {
      const result = await dryRunContactListCsvImport(segmentId, csvText, confirmMarketingConsent)
      return res.status(200).json({ ok: true, ...result })
    }
    const result = await commitContactListCsvImport(segmentId, csvText, confirmMarketingConsent)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed.'
    console.error('import-contact-list-csv failed', err)
    return res.status(400).json({ error: message })
  }
}
