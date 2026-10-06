import {
  shouldSuppressFromProviderEvent,
  suppressContactByEmail,
} from './_newsletter.js'

function authorized(req: any): boolean {
  const secret = process.env.NEWSLETTER_WEBHOOK_SECRET || process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers?.authorization || ''
  const provided =
    header.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : typeof req.headers?.['x-newsletter-webhook-secret'] === 'string'
        ? String(req.headers['x-newsletter-webhook-secret'])
        : ''
  return provided === secret
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
 * Ingest provider bounce/complaint events and suppress Contacts.
 * Auth: Bearer NEWSLETTER_WEBHOOK_SECRET (or CRON_SECRET fallback).
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const eventType = String(body.type || body.event_type || '')
  if (!eventType) return res.status(400).json({ error: 'Missing event type' })

  if (!shouldSuppressFromProviderEvent(eventType)) {
    return res.status(200).json({ ok: true, ignored: true })
  }

  const email = extractEmail(body)
  if (!email) return res.status(400).json({ error: 'Missing email on event' })

  try {
    await suppressContactByEmail(email, eventType, body)
    return res.status(200).json({ ok: true, suppressed: true })
  } catch (err) {
    console.error('newsletter webhook failed', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
