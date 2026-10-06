import { createHash } from 'node:crypto'
import { env, supabase } from './_lib.js'
import { rateLimited, requestAddress } from './_rateLimit.js'
import {
  normalizeFormFields,
  parseLeadCaptureSubmission,
  rateLimitBucketKey,
  type FormSettings,
} from './_forms.js'
import { upsertContactFromLead } from './_contacts.js'
import { enqueueLeadMagnetDelivery } from './_leadMagnets.js'
import { recordConversionEvent } from './_analytics.js'

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

function hashIp(address: string): string {
  return createHash('sha256').update(`form-submit:${address}`).digest('hex').slice(0, 40)
}

async function durableRateLimited(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/rate_limit_hit`, {
      method: 'POST',
      headers: {
        apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_key: key,
        p_window_seconds: 900,
        p_max_hits: 8,
      }),
    })
    if (!res.ok) {
      // Fail closed to in-memory limiter when RPC unavailable.
      return rateLimited(key)
    }
    const limited = await res.json()
    return Boolean(limited)
  } catch {
    return rateLimited(key)
  }
}

/**
 * POST /api/form-submit
 * Lead-capture: stores submission + consent, upserts Contacts identity.
 * Never writes subscribers or sends kit email.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  const slug = typeof body.formSlug === 'string' ? body.formSlug.trim().slice(0, 120) : 'lead-capture'
  const address = requestAddress(req)
  const limitKey = rateLimitBucketKey(`form:${slug}`, address)

  if (await durableRateLimited(limitKey)) {
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
  }

  let formRow: any
  try {
    const rows = await supabase(
      `forms?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug,version,fields,settings,status&limit=1`,
    )
    formRow = rows?.[0]
  } catch (err) {
    console.error('form lookup failed', err)
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again in a minute.' })
  }

  if (!formRow) {
    return res.status(404).json({ error: 'That form is not available.' })
  }

  const fields = normalizeFormFields(formRow.fields)
  if (!fields.length) {
    return res.status(500).json({ error: 'Form is misconfigured.' })
  }

  const settings = (formRow.settings && typeof formRow.settings === 'object' ? formRow.settings : {}) as FormSettings
  const parsed = parseLeadCaptureSubmission(body, {
    fields,
    settings,
    formVersion: typeof formRow.version === 'number' ? formRow.version : 1,
  })

  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error })
  }

  // Honeypot: pretend success without storing.
  if (parsed.honeypotTriggered) {
    return res.status(200).json({ ok: true })
  }

  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {}
  const ua = typeof req.headers?.['user-agent'] === 'string' ? String(req.headers['user-agent']).slice(0, 240) : null

  let submissionId: string | null = null
  try {
    const created = await supabase('form_submissions', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        form_id: formRow.id,
        form_version: parsed.formVersion,
        payload: parsed.payload,
        consent: parsed.consent,
        utm: {
          utm_source: typeof utm.utm_source === 'string' ? utm.utm_source.slice(0, 120) : null,
          utm_medium: typeof utm.utm_medium === 'string' ? utm.utm_medium.slice(0, 120) : null,
          utm_campaign: typeof utm.utm_campaign === 'string' ? utm.utm_campaign.slice(0, 120) : null,
          utm_content: typeof utm.utm_content === 'string' ? utm.utm_content.slice(0, 120) : null,
        },
        ip_hash: hashIp(address),
        user_agent: ua,
      }),
    })
    const row = Array.isArray(created) ? created[0] : created
    submissionId = typeof row?.id === 'string' ? row.id : null
  } catch (err) {
    console.error('form submit store failed', err)
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again in a minute.' })
  }

  void recordConversionEvent({
    name: 'form_submit',
    path: typeof body.path === 'string' ? body.path : '/updates',
    utm,
    formId: formRow.id,
    submissionId,
    ip: address,
    userAgent: ua,
    meta: { formSlug: slug },
  })

  if (parsed.consent.marketing) {
    let contactId: string | null = null
    try {
      const contact = await upsertContactFromLead({
        email: parsed.payload.email || '',
        firstName: parsed.payload.firstName || null,
        consentText: parsed.consent.text,
        consentedAt: parsed.consent.at,
        formId: formRow.id,
        formVersion: parsed.formVersion,
        submissionId,
      })
      contactId = contact?.contactId ?? null
    } catch (err) {
      // Submission already stored; contact upsert is best-effort for this request.
      console.error('contact upsert after form submit failed', err)
    }

    if (contactId) {
      void recordConversionEvent({
        name: 'contact_created',
        path: typeof body.path === 'string' ? body.path : '/updates',
        utm,
        formId: formRow.id,
        contactId,
        submissionId,
        ip: address,
        userAgent: ua,
        meta: { formSlug: slug },
      })
    }

    const leadMagnetId =
      typeof settings.leadMagnetId === 'string' && settings.leadMagnetId.trim()
        ? settings.leadMagnetId.trim()
        : ''
    if (contactId && leadMagnetId) {
      try {
        await enqueueLeadMagnetDelivery({
          contactId,
          leadMagnetId,
          formId: formRow.id,
          submissionId,
          marketingOk: true,
          suppressedAt: null,
        })
      } catch (err) {
        console.error('lead magnet enqueue after form submit failed', err)
      }
    }
  }

  const successMessage =
    typeof settings.successMessage === 'string' && settings.successMessage.trim()
      ? settings.successMessage.trim()
      : 'Thanks — you are on the list.'

  return res.status(200).json({ ok: true, message: successMessage })
}
