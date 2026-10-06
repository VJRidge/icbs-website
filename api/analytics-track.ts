import { recordConversionEvent } from './_analytics.js'
import { rateLimited, requestAddress } from './_rateLimit.js'

const PUBLIC_EVENTS = new Set(['page_view', 'form_start'])

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

/**
 * POST /api/analytics-track
 * Public beacon for page_view / form_start only. Server writes other events.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const address = requestAddress(req)
  if (rateLimited(`analytics:${address}`)) {
    return res.status(429).json({ error: 'Too many attempts.' })
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!PUBLIC_EVENTS.has(name)) {
    return res.status(400).json({ error: 'That event cannot be tracked from the browser.' })
  }

  const ua = typeof req.headers?.['user-agent'] === 'string' ? String(req.headers['user-agent']) : null
  const ok = await recordConversionEvent({
    name,
    path: typeof body.path === 'string' ? body.path : null,
    referrer: typeof body.referrer === 'string' ? body.referrer : null,
    sessionId: typeof body.sessionId === 'string' ? body.sessionId : null,
    utm: body.utm && typeof body.utm === 'object' ? body.utm : null,
    meta: body.meta && typeof body.meta === 'object' ? body.meta : null,
    ip: address,
    userAgent: ua,
  })

  // Always 204-ish success to avoid leaking internals to beacons.
  return res.status(ok ? 204 : 204).end()
}
