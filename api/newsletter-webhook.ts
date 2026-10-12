import { supabase } from './_lib.js'
import {
  extractProviderMessageId,
  recordProviderEvent,
  resolveIssueIdFromProviderMessage,
  shouldRecordProviderEvent,
  shouldSuppressFromProviderEvent,
  suppressContactByEmail,
} from './_newsletter.js'
import { authorizeNewsletterWebhook } from './_newsletterWebhookAuth.js'

function header(req: any, name: string): string {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()]
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? String(raw[0] || '') : ''
}

function authorized(req: any, rawBody: string): boolean {
  // Dedicated secret only — do not fall back to CRON_SECRET (SUP-004).
  return authorizeNewsletterWebhook({
    secret: process.env.NEWSLETTER_WEBHOOK_SECRET,
    authorizationHeader: header(req, 'authorization'),
    customSecretHeader: header(req, 'x-newsletter-webhook-secret'),
    svixId: header(req, 'svix-id'),
    svixTimestamp: header(req, 'svix-timestamp'),
    svixSignature: header(req, 'svix-signature'),
    rawBody,
  })
}

function extractEmail(payload: any): string | null {
  const direct =
    payload?.data?.email ||
    payload?.data?.to ||
    payload?.email ||
    (Array.isArray(payload?.data?.to) ? payload.data.to[0] : null)
  if (typeof direct === 'string' && direct.includes('@')) return direct
  return null
}

/**
 * POST /api/newsletter-webhook
 * Ingest Resend delivery/engagement events for analytics; suppress on bounce/complaint.
 * Auth: NEWSLETTER_WEBHOOK_SECRET via Svix signatures (preferred) or Bearer /
 * x-newsletter-webhook-secret. Never accepts CRON_SECRET.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody =
    typeof req.body === 'string'
      ? req.body
      : req.rawBody
        ? String(req.rawBody)
        : JSON.stringify(req.body || {})

  if (!authorized(req, rawBody)) return res.status(401).json({ error: 'Unauthorized' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const eventType = String(body.type || body.event_type || '')
  if (!eventType) return res.status(400).json({ error: 'Missing event type' })

  if (!shouldRecordProviderEvent(eventType)) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const email = extractEmail(body)

  try {
    if (shouldSuppressFromProviderEvent(eventType)) {
      if (!email) return res.status(400).json({ error: 'Missing email on event' })
      await suppressContactByEmail(email, eventType, body)
      return res.status(200).json({ ok: true, suppressed: true, recorded: true })
    }

    const messageId = extractProviderMessageId(body)
    const linked = await resolveIssueIdFromProviderMessage(messageId)
    let contactId = linked.contactId
    if (!contactId && email) {
      const contacts = await supabase(
        `contacts?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=id&limit=1`,
      )
      contactId = typeof contacts?.[0]?.id === 'string' ? contacts[0].id : null
    }

    await recordProviderEvent({
      eventType,
      email,
      contactId,
      issueId: linked.issueId,
      payload: body,
      occurredAt:
        typeof body.created_at === 'string'
          ? body.created_at
          : typeof body.data?.created_at === 'string'
            ? body.data.created_at
            : undefined,
    })

    return res.status(200).json({
      ok: true,
      recorded: true,
      issueId: linked.issueId,
    })
  } catch (err) {
    console.error('newsletter webhook failed', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
