/**
 * Service-role contact upsert / unsubscribe.
 * Keeps kit `subscribers` untouched — contacts are a separate identity store.
 * Plan helpers mirror `src/lib/contacts/contactIdentity.ts`.
 */
import { supabase } from './_lib.js'

type ContactRow = {
  id: string
  email: string
  first_name: string | null
  marketing_ok: boolean
  suppressed_at: string | null
  first_consented_at: string | null
  last_consented_at: string | null
  unsubscribe_token: string
}

export type LeadContactInput = {
  email: string
  firstName?: string | null
  consentText: string
  consentedAt: string
  formId: string
  formVersion: number
  submissionId?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200)
  if (!email || !EMAIL_RE.test(email)) return null
  return email
}

async function fetchContactByEmail(email: string): Promise<ContactRow | null> {
  const rows = await supabase(
    `contacts?email=eq.${encodeURIComponent(email)}&select=id,email,first_name,marketing_ok,suppressed_at,first_consented_at,last_consented_at,unsubscribe_token&limit=1`,
  )
  return (rows?.[0] as ContactRow) ?? null
}

async function fetchContactByToken(token: string): Promise<ContactRow | null> {
  const rows = await supabase(
    `contacts?unsubscribe_token=eq.${encodeURIComponent(token)}&select=id,email,first_name,marketing_ok,suppressed_at,first_consented_at,last_consented_at,unsubscribe_token&limit=1`,
  )
  return (rows?.[0] as ContactRow) ?? null
}

async function insertConsentEvent(
  contactId: string,
  event: {
    eventType: string
    consentText: string
    formId: string | null
    formVersion: number | null
    submissionId: string | null
    at: string
  },
) {
  await supabase('contact_consent_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      contact_id: contactId,
      event_type: event.eventType,
      consent_text: event.consentText,
      form_id: event.formId,
      form_version: event.formVersion,
      submission_id: event.submissionId,
      occurred_at: event.at,
    }),
  })
}

/**
 * Upsert a marketing contact after a successful lead-capture store.
 * Never writes to `subscribers` and never sends email.
 */
export async function upsertContactFromLead(
  input: LeadContactInput,
): Promise<{ contactId: string; marketingOk: true; suppressedAt: null } | null> {
  const email = normalizeEmail(input.email)
  if (!email || !input.consentText.trim() || !input.formId) return null

  const existing = await fetchContactByEmail(email)
  const at = input.consentedAt || new Date().toISOString()
  const firstName =
    typeof input.firstName === 'string' && input.firstName.trim()
      ? input.firstName.trim().slice(0, 80)
      : existing?.first_name ?? null
  const firstConsentedAt = existing?.first_consented_at ?? at
  const consentEvent = {
    eventType: 'granted',
    consentText: input.consentText.trim().slice(0, 500),
    formId: input.formId,
    formVersion: Math.max(1, Math.floor(input.formVersion || 1)),
    submissionId: input.submissionId ?? null,
    at,
  }
  const now = new Date().toISOString()

  if (existing) {
    await supabase(`contacts?id=eq.${existing.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        first_name: firstName,
        marketing_ok: true,
        suppressed_at: null,
        first_consented_at: firstConsentedAt,
        last_consented_at: at,
        source_form_id: consentEvent.formId,
        updated_at: now,
      }),
    })
    await insertConsentEvent(existing.id, consentEvent)
    return { contactId: existing.id, marketingOk: true, suppressedAt: null }
  }

  const created = await supabase('contacts', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      email,
      first_name: firstName,
      marketing_ok: true,
      suppressed_at: null,
      first_consented_at: firstConsentedAt,
      last_consented_at: at,
      source_form_id: consentEvent.formId,
      updated_at: now,
    }),
  })
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) throw new Error('Contact insert returned no id')
  await insertConsentEvent(row.id, consentEvent)
  return { contactId: row.id, marketingOk: true, suppressedAt: null }
}

export async function suppressContactByToken(token: string): Promise<'ok' | 'invalid' | 'missing'> {
  if (!UUID_RE.test(token)) return 'invalid'
  const existing = await fetchContactByToken(token)
  if (!existing) return 'missing'
  const at = new Date().toISOString()
  await supabase(`contacts?id=eq.${existing.id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      marketing_ok: false,
      suppressed_at: at,
      updated_at: at,
    }),
  })
  await insertConsentEvent(existing.id, {
    eventType: 'suppressed',
    consentText: 'Unsubscribed via preference link.',
    formId: null,
    formVersion: null,
    submissionId: null,
    at,
  })
  return 'ok'
}
