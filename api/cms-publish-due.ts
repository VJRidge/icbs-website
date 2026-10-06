import { env, supabase } from './_lib.js'

function authorizedCron(req: any): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers?.authorization || ''
  return header === `Bearer ${secret}`
}

function isDue(status: string, scheduledFor: string | null | undefined, now: Date): boolean {
  if (!scheduledFor) return false
  if (status !== 'scheduled' && status !== 'published') return false
  const due = new Date(scheduledFor)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() <= now.getTime()
}

function promoteDocument(doc: any): any {
  if (!doc || typeof doc !== 'object') return { format: 'blocks', blocks: [], html: '' }
  const pending = doc._schedule?.pending_document
  if (pending && typeof pending === 'object') {
    const { _schedule: _drop, ...rest } = pending
    void _drop
    return rest
  }
  const { _schedule: _drop, ...rest } = doc
  void _drop
  return rest
}

/**
 * Promote due scheduled contents. Idempotent.
 * GET/POST /api/cms-publish-due  Authorization: Bearer $CRON_SECRET
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!authorizedCron(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  env('SUPABASE_URL')
  env('SUPABASE_SERVICE_ROLE_KEY')

  const now = new Date()
  const due = await supabase(
    `contents?scheduled_for=not.is.null&scheduled_for=lte.${encodeURIComponent(now.toISOString())}&select=id,status,scheduled_for,published_document,published_at,doc_version&limit=50`,
  )

  const promoted: string[] = []
  const skipped: string[] = []

  for (const row of due || []) {
    if (!isDue(row.status, row.scheduled_for, now) || !row.published_document) {
      skipped.push(row.id)
      continue
    }

    const expectedVersion = Math.max(1, Number(row.doc_version) || 1)
    const nextDoc = promoteDocument(row.published_document)
    try {
      const updated = await supabase(
        `contents?id=eq.${encodeURIComponent(row.id)}&doc_version=eq.${expectedVersion}&scheduled_for=eq.${encodeURIComponent(row.scheduled_for)}`,
        {
          method: 'PATCH',
          prefer: 'return=representation',
          body: JSON.stringify({
            status: 'published',
            scheduled_for: null,
            published_at: now.toISOString(),
            published_document: nextDoc,
            doc_version: expectedVersion + 1,
          }),
        },
      )
      if (!Array.isArray(updated) || updated.length === 0) {
        skipped.push(row.id)
        continue
      }
      try {
        await supabase('content_publish_jobs', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: JSON.stringify({
            content_id: row.id,
            scheduled_for: row.scheduled_for,
            status: 'done',
            attempts: 1,
            completed_at: now.toISOString(),
          }),
        })
      } catch {
        /* outbox optional */
      }
      promoted.push(row.id)
    } catch (err) {
      skipped.push(row.id)
      try {
        await supabase('content_publish_jobs', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=minimal',
          body: JSON.stringify({
            content_id: row.id,
            scheduled_for: row.scheduled_for,
            status: 'failed',
            attempts: 1,
            last_error: err instanceof Error ? err.message : 'publish failed',
          }),
        })
      } catch {
        /* ignore */
      }
    }
  }

  return res.status(200).json({ ok: true, promoted, skipped, at: now.toISOString() })
}
