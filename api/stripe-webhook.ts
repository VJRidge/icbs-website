/**
 * POST /api/stripe-webhook
 * Verifies Stripe signatures and fulfills paid Checkout Sessions.
 * Fulfillment is webhook-driven (not the success page).
 */
import { buffer } from 'node:stream/consumers'
import { constructStripeEvent, fulfillFromStripeEvent, stripeWebhookConfigured } from './_stripe.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body)
  if (req.readable) return buffer(req)
  return Buffer.from(JSON.stringify(req.body ?? {}))
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!stripeWebhookConfigured()) {
    return res.status(503).json({ error: 'STRIPE_WEBHOOK_SECRET is not set.' })
  }

  const signature = req.headers?.['stripe-signature']
  if (typeof signature !== 'string' || !signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header.' })
  }

  try {
    const rawBody = await readRawBody(req)
    const event = constructStripeEvent(rawBody, signature)
    const result = await fulfillFromStripeEvent(event)
    return res.status(200).json({ ok: true, ...result })
  } catch (err) {
    console.error('stripe-webhook failed', err)
    const message = err instanceof Error ? err.message : 'Webhook failed.'
    return res.status(400).json({ error: message })
  }
}
