import { env, sendEmail, supabase } from './_lib.js'
import { leadMagnetEmail } from './_emails.js'
import {
  nextAttemptAtIso,
  shouldMarkFailed,
  signPrivateMediaPath,
} from './_leadMagnets.js'
import { PRIVATE_MEDIA_BUCKET } from './_privateMedia.js'

function authorizedCron(req: any): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers?.authorization || ''
  return header === `Bearer ${secret}`
}

type JobRow = {
  id: string
  contact_id: string
  lead_magnet_id: string
  lead_magnet_version_id: string
  attempts: number
  max_attempts: number
  status: string
}

/**
 * Process pending lead-magnet delivery jobs.
 * GET/POST /api/lead-magnet-deliver  Authorization: Bearer $CRON_SECRET
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
  env('SITE_URL')

  const now = new Date()
  const due = (await supabase(
    `delivery_jobs?status=eq.pending&next_attempt_at=lte.${encodeURIComponent(now.toISOString())}&select=id,contact_id,lead_magnet_id,lead_magnet_version_id,attempts,max_attempts,status&order=next_attempt_at.asc&limit=20`,
  )) as JobRow[] | null

  const sent: string[] = []
  const skipped: string[] = []
  const failed: string[] = []
  const retried: string[] = []

  for (const job of due || []) {
    const claimed = await supabase(
      `delivery_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.pending`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({
          status: 'processing',
          attempts: job.attempts + 1,
          updated_at: now.toISOString(),
        }),
      },
    )
    if (!Array.isArray(claimed) || claimed.length === 0) {
      skipped.push(job.id)
      continue
    }
    const attempts = job.attempts + 1

    try {
      const contacts = await supabase(
        `contacts?id=eq.${encodeURIComponent(job.contact_id)}&select=id,email,first_name,marketing_ok,suppressed_at,unsubscribe_token&limit=1`,
      )
      const contact = contacts?.[0]
      if (!contact?.email) throw new Error('Contact missing')
      if (!contact.marketing_ok || contact.suppressed_at) {
        await supabase(`delivery_jobs?id=eq.${encodeURIComponent(job.id)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: 'skipped',
            last_error: 'Contact suppressed or marketing off',
            updated_at: now.toISOString(),
          }),
        })
        skipped.push(job.id)
        continue
      }

      const magnets = await supabase(
        `lead_magnets?id=eq.${encodeURIComponent(job.lead_magnet_id)}&select=id,title,status&limit=1`,
      )
      const magnet = magnets?.[0]
      if (!magnet || magnet.status !== 'published') throw new Error('Lead magnet not published')

      const versions = await supabase(
        `lead_magnet_versions?id=eq.${encodeURIComponent(job.lead_magnet_version_id)}&select=id,media_id&limit=1`,
      )
      const version = versions?.[0]
      if (!version?.media_id) throw new Error('Version media missing')

      const mediaRows = await supabase(
        `media?id=eq.${encodeURIComponent(version.media_id)}&select=id,bucket,path,title&limit=1`,
      )
      const media = mediaRows?.[0]
      if (!media?.path || media.bucket !== PRIVATE_MEDIA_BUCKET) {
        throw new Error('Lead magnet media must live in media-private')
      }

      const downloadUrl = await signPrivateMediaPath(media.path, 3600)
      const site = env('SITE_URL').replace(/\/+$/, '')
      const unsubscribeUrl = `${site}/api/contact-unsubscribe?token=${contact.unsubscribe_token}`
      const mail = leadMagnetEmail({
        firstName: contact.first_name || '',
        title: magnet.title || media.title || 'Your download',
        downloadUrl,
        unsubscribeUrl,
        postalAddress: env('POSTAL_ADDRESS'),
      })
      await sendEmail({ to: contact.email, ...mail, unsubscribeUrl })

      await supabase(`delivery_jobs?id=eq.${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: 'sent',
          sent_at: now.toISOString(),
          last_error: null,
          updated_at: now.toISOString(),
        }),
      })
      sent.push(job.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'delivery failed'
      const terminal = shouldMarkFailed(attempts, job.max_attempts || 5)
      await supabase(`delivery_jobs?id=eq.${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: terminal ? 'failed' : 'pending',
          last_error: message.slice(0, 500),
          next_attempt_at: terminal ? now.toISOString() : nextAttemptAtIso(attempts, now),
          updated_at: now.toISOString(),
        }),
      })
      if (terminal) failed.push(job.id)
      else retried.push(job.id)
    }
  }

  return res.status(200).json({
    ok: true,
    sent,
    skipped,
    failed,
    retried,
    at: now.toISOString(),
  })
}
