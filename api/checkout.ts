/**
 * GET|POST /api/checkout
 * Creates a Stripe Checkout Session for the book and redirects (GET) or returns JSON (POST).
 * Safe without keys: returns 503 with a clear message so you can add STRIPE_* later.
 */
import { createBookCheckoutSession, stripeSecretConfigured } from './_stripe.js'

function clip(v: unknown, n: number) {
  return typeof v === 'string' ? v.trim().slice(0, n) : ''
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripeSecretConfigured()) {
    const message =
      'Stripe checkout is not configured yet. Set STRIPE_SECRET_KEY and STRIPE_BOOK_PRICE_ID, then redeploy.'
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(503).send(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#F4EFE3;color:#0E0D0B;padding:48px 20px;text-align:center"><h1>Checkout coming soon</h1><p>${message}</p><p><a href="/#buy">Back to the sales page</a></p></body>`,
      )
    }
    return res.status(503).json({ error: message })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const email =
      clip(req.query?.email, 200) ||
      clip(body.email, 200) ||
      null
    const session = await createBookCheckoutSession({
      customerEmail: email,
    })

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store')
      res.statusCode = 303
      res.setHeader('Location', session.url)
      return res.end()
    }
    return res.status(200).json({ ok: true, url: session.url, sessionId: session.sessionId })
  } catch (err) {
    console.error('checkout failed', err)
    const message = err instanceof Error ? err.message : 'Checkout failed.'
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      const shown = message.replace(/</g, '&lt;').slice(0, 280)
      return res.status(500).send(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#F4EFE3;color:#0E0D0B;padding:48px 20px;text-align:center"><h1>Checkout unavailable</h1><p>Something went wrong starting payment.</p><p>${shown}</p><p><a href="/#buy">Back</a></p></body>`,
      )
    }
    return res.status(500).json({ error: message })
  }
}
