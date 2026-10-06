import { env, supabase } from './_lib.js'
import {
  freezeRecipientsForIssue,
  maybeCompleteIssue,
  processNewsletterSendJobs,
} from './_newsletter.js'

function authorizedCron(req: any): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers?.authorization || '') === `Bearer ${secret}`
}

/**
 * Promote due newsletter issues and process send jobs.
 * GET/POST /api/newsletter-send  Authorization: Bearer $CRON_SECRET
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
  const dueIssues = await supabase(
    `newsletter_issues?status=eq.scheduled&scheduled_for=lte.${encodeURIComponent(now.toISOString())}&select=id,subject&limit=5`,
  )

  const started: string[] = []
  for (const issue of dueIssues || []) {
    const claimed = await supabase(
      `newsletter_issues?id=eq.${encodeURIComponent(issue.id)}&status=eq.scheduled`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({
          status: 'sending',
          updated_at: now.toISOString(),
        }),
      },
    )
    if (!Array.isArray(claimed) || claimed.length === 0) continue
    await freezeRecipientsForIssue(issue.id)
    started.push(issue.id)
  }

  const sending = await supabase(
    `newsletter_issues?status=eq.sending&select=id&limit=20`,
  )
  const result = await processNewsletterSendJobs(25)
  for (const issue of sending || []) {
    await maybeCompleteIssue(issue.id)
  }
  // Also complete any issue that just started in this run.
  for (const id of started) {
    await maybeCompleteIssue(id)
  }

  return res.status(200).json({
    ok: true,
    started,
    ...result,
    at: now.toISOString(),
  })
}
