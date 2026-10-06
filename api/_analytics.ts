/** Service-role conversion event writes. Mirrors src/lib/analytics/conversionEvents.ts. */
import { createHash } from 'node:crypto'
import { supabase } from './_lib.js'

const TRACKABLE = new Set(['page_view', 'form_start', 'form_submit', 'contact_created', 'kit_subscribe'])
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|wget|curl|python-requests|scrapy/i

function clip(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().slice(0, max)
  return v || null
}

function normalizePath(raw: unknown): string | null {
  const path = clip(raw, 512)
  if (!path || !path.startsWith('/')) return null
  if (path.includes('://') || path.includes('\\') || path.includes('..')) return null
  return path.replace(/\/{2,}/g, '/') || '/'
}

export type RecordConversionEventInput = {
  name: string
  path?: string | null
  referrer?: string | null
  sessionId?: string | null
  utm?: Record<string, unknown> | null
  formId?: string | null
  contactId?: string | null
  submissionId?: string | null
  contentId?: string | null
  meta?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
}

export async function recordConversionEvent(input: RecordConversionEventInput): Promise<boolean> {
  if (!TRACKABLE.has(input.name)) return false
  const ua = clip(input.userAgent, 240)
  const utm = input.utm && typeof input.utm === 'object' ? input.utm : {}
  const ipHash = input.ip
    ? createHash('sha256').update(`analytics:${input.ip}`).digest('hex').slice(0, 40)
    : null

  try {
    await supabase('conversion_events', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        name: input.name,
        path: normalizePath(input.path),
        referrer: clip(input.referrer, 500),
        session_id: clip(input.sessionId, 80),
        utm_source: clip(utm.utm_source, 120),
        utm_medium: clip(utm.utm_medium, 120),
        utm_campaign: clip(utm.utm_campaign, 120),
        utm_content: clip(utm.utm_content, 120),
        form_id: input.formId ?? null,
        contact_id: input.contactId ?? null,
        submission_id: input.submissionId ?? null,
        content_id: input.contentId ?? null,
        meta: input.meta && typeof input.meta === 'object' ? input.meta : {},
        ip_hash: ipHash,
        user_agent: ua,
        bot_suspect: ua ? BOT_UA.test(ua) : false,
      }),
    })
    return true
  } catch (err) {
    console.error('recordConversionEvent failed', err)
    return false
  }
}
