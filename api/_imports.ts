/**
 * Kit subscribers → contacts import (service role).
 * Plan helpers mirror src/lib/imports/kitSubscriberImport.ts.
 * Never mutates or deletes kit `subscribers`.
 */
import { supabase } from './_lib.js'
import { ensureContactTag } from './_segments.js'

export const IMPORT_SOURCE_KIT_SUBSCRIBERS = 'kit_subscribers' as const

type KitSubscriber = {
  id: string
  email: string
  first_name: string | null
  consent_at: string
  unsubscribed_at: string | null
}

type ContactRow = {
  id: string
  email: string
  first_name: string | null
  marketing_ok: boolean
  suppressed_at: string | null
  first_consented_at: string | null
  last_consented_at: string | null
}

type ImportRowAction = 'create' | 'update' | 'skip' | 'suppress'

type ImportRowPlan = {
  source: typeof IMPORT_SOURCE_KIT_SUBSCRIBERS
  sourceKey: string
  email: string | null
  action: ImportRowAction
  reason: string
  contactPatch: {
    firstName: string | null
    marketingOk: boolean
    suppressedAt: string | null
    firstConsentedAt: string | null
    lastConsentedAt: string | null
  } | null
  consentEvent: {
    eventType: 'granted' | 'suppressed'
    consentText: string
    at: string
  } | null
  existingContactId: string | null
  idempotencyKey: string
}

type ImportPlanSummary = {
  total: number
  create: number
  update: number
  suppress: number
  skip: number
  wouldWrite: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200)
  if (!email || !EMAIL_RE.test(email)) return null
  return email
}

function trimName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const next = value.trim().slice(0, 80)
  return next || null
}

export function planKitSubscriberImportRow(
  source: KitSubscriber,
  opts: { existing: ContactRow | null; alreadyApplied: boolean },
): ImportRowPlan {
  const idempotencyKey = `${IMPORT_SOURCE_KIT_SUBSCRIBERS}:${source.id}`
  const email = normalizeEmail(source.email)

  if (!email) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email: null,
      action: 'skip',
      reason: 'Invalid email.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing?.id ?? null,
      idempotencyKey,
    }
  }

  if (opts.alreadyApplied) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'skip',
      reason: 'Already applied for this source key.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing?.id ?? null,
      idempotencyKey,
    }
  }

  const firstName = trimName(source.first_name) ?? opts.existing?.first_name ?? null
  const kitUnsubscribed = Boolean(source.unsubscribed_at)
  const contactSuppressed = Boolean(opts.existing?.suppressed_at) || opts.existing?.marketing_ok === false

  if (kitUnsubscribed) {
    const suppressedAt = source.unsubscribed_at || new Date().toISOString()
    if (opts.existing && contactSuppressed) {
      return {
        source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
        sourceKey: source.id,
        email,
        action: 'skip',
        reason: 'Contact already suppressed; suppression preserved.',
        contactPatch: null,
        consentEvent: null,
        existingContactId: opts.existing.id,
        idempotencyKey,
      }
    }
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'suppress',
      reason: opts.existing
        ? 'Kit unsubscribe; suppress existing contact.'
        : 'Kit unsubscribe; create suppressed contact.',
      contactPatch: {
        firstName,
        marketingOk: false,
        suppressedAt,
        firstConsentedAt: opts.existing?.first_consented_at ?? source.consent_at ?? suppressedAt,
        lastConsentedAt: opts.existing?.last_consented_at ?? source.consent_at ?? suppressedAt,
      },
      consentEvent: {
        eventType: 'suppressed',
        consentText: 'Imported from kit subscribers (unsubscribed).',
        at: suppressedAt,
      },
      existingContactId: opts.existing?.id ?? null,
      idempotencyKey,
    }
  }

  if (opts.existing && contactSuppressed) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'skip',
      reason: 'Suppression preserved; import will not re-opt-in.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing.id,
      idempotencyKey,
    }
  }

  if (!opts.existing) {
    const at = source.consent_at || new Date().toISOString()
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'create',
      reason: 'New contact from kit subscriber.',
      contactPatch: {
        firstName,
        marketingOk: true,
        suppressedAt: null,
        firstConsentedAt: at,
        lastConsentedAt: at,
      },
      consentEvent: {
        eventType: 'granted',
        consentText: 'Imported from kit subscribers (active).',
        at,
      },
      existingContactId: null,
      idempotencyKey,
    }
  }

  const nameChanged = firstName !== (opts.existing.first_name ?? null)
  if (!nameChanged && opts.existing.marketing_ok) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'skip',
      reason: 'No change.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing.id,
      idempotencyKey,
    }
  }

  const at = source.consent_at || opts.existing.last_consented_at || new Date().toISOString()
  return {
    source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
    sourceKey: source.id,
    email,
    action: 'update',
    reason: nameChanged ? 'Update contact fields from kit subscriber.' : 'Refresh marketing contact from kit.',
    contactPatch: {
      firstName,
      marketingOk: true,
      suppressedAt: null,
      firstConsentedAt: opts.existing.first_consented_at ?? at,
      lastConsentedAt: opts.existing.last_consented_at ?? at,
    },
    consentEvent: null,
    existingContactId: opts.existing.id,
    idempotencyKey,
  }
}

export function summarizeImportPlans(plans: ImportRowPlan[]): ImportPlanSummary {
  const summary: ImportPlanSummary = {
    total: plans.length,
    create: 0,
    update: 0,
    suppress: 0,
    skip: 0,
    wouldWrite: 0,
  }
  for (const plan of plans) {
    summary[plan.action] += 1
    if (plan.action === 'create' || plan.action === 'update' || plan.action === 'suppress') {
      summary.wouldWrite += 1
    }
  }
  return summary
}

async function fetchAllSubscribers(): Promise<KitSubscriber[]> {
  const pageSize = 500
  const out: KitSubscriber[] = []
  for (let offset = 0; ; offset += pageSize) {
    const rows = await supabase(
      `subscribers?select=id,email,first_name,consent_at,unsubscribed_at&order=created_at.asc&offset=${offset}&limit=${pageSize}`,
    )
    const batch = (Array.isArray(rows) ? rows : []) as KitSubscriber[]
    out.push(...batch)
    if (batch.length < pageSize) break
  }
  return out
}

async function fetchContactsByEmails(emails: string[]): Promise<Map<string, ContactRow>> {
  const map = new Map<string, ContactRow>()
  const unique = [...new Set(emails.filter(Boolean))]
  const chunk = 40
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    if (!slice.length) continue
    const or = slice.map((e) => `email.eq.${encodeURIComponent(e)}`).join(',')
    const rows = await supabase(
      `contacts?or=(${or})&select=id,email,first_name,marketing_ok,suppressed_at,first_consented_at,last_consented_at`,
    )
    for (const row of (rows || []) as ContactRow[]) {
      map.set(String(row.email).toLowerCase(), row)
    }
  }
  return map
}

async function fetchAppliedKeys(sourceKeys: string[]): Promise<Set<string>> {
  const applied = new Set<string>()
  const chunk = 40
  for (let i = 0; i < sourceKeys.length; i += chunk) {
    const slice = sourceKeys.slice(i, i + chunk)
    if (!slice.length) continue
    const or = slice.map((k) => `source_key.eq.${encodeURIComponent(k)}`).join(',')
    const rows = await supabase(
      `import_applied_keys?source=eq.${IMPORT_SOURCE_KIT_SUBSCRIBERS}&or=(${or})&select=source_key`,
    )
    for (const row of rows || []) {
      if (row?.source_key) applied.add(String(row.source_key))
    }
  }
  return applied
}

async function insertConsentEvent(
  contactId: string,
  event: { eventType: string; consentText: string; at: string },
) {
  await supabase('contact_consent_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      contact_id: contactId,
      event_type: event.eventType,
      consent_text: event.consentText,
      form_id: null,
      form_version: null,
      submission_id: null,
      occurred_at: event.at,
      meta: { import_source: IMPORT_SOURCE_KIT_SUBSCRIBERS },
    }),
  })
}

async function applyPlan(plan: ImportRowPlan): Promise<string | null> {
  if (!plan.contactPatch || !plan.email) return plan.existingContactId
  const now = new Date().toISOString()
  const patch = {
    first_name: plan.contactPatch.firstName,
    marketing_ok: plan.contactPatch.marketingOk,
    suppressed_at: plan.contactPatch.suppressedAt,
    first_consented_at: plan.contactPatch.firstConsentedAt,
    last_consented_at: plan.contactPatch.lastConsentedAt,
    updated_at: now,
  }

  if (plan.existingContactId) {
    await supabase(`contacts?id=eq.${plan.existingContactId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify(patch),
    })
    if (plan.consentEvent) {
      await insertConsentEvent(plan.existingContactId, plan.consentEvent)
    }
    return plan.existingContactId
  }

  const created = await supabase('contacts', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      email: plan.email,
      ...patch,
    }),
  })
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) throw new Error('Contact insert returned no id')
  if (plan.consentEvent) {
    await insertConsentEvent(row.id, plan.consentEvent)
  }
  return row.id as string
}

export async function dryRunKitSubscriberImport(jobId: string): Promise<{
  summary: ImportPlanSummary
  rowCount: number
}> {
  const jobs = await supabase(`import_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,status&limit=1`)
  const job = jobs?.[0]
  if (!job) throw new Error('Import job not found.')
  if (job.status === 'committed' || job.status === 'committing') {
    throw new Error('Job already committed.')
  }

  const startedAt = new Date().toISOString()
  await supabase(`import_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      status: 'dry_run',
      started_at: startedAt,
      error_message: null,
      updated_at: startedAt,
    }),
  })

  // Clear prior planned rows for re-run.
  await supabase(`import_job_rows?job_id=eq.${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  })

  const subscribers = await fetchAllSubscribers()
  const emails = subscribers.map((s) => normalizeEmail(s.email)).filter(Boolean) as string[]
  const contacts = await fetchContactsByEmails(emails)
  const applied = await fetchAppliedKeys(subscribers.map((s) => s.id))

  const plans = subscribers.map((s) => {
    const email = normalizeEmail(s.email)
    return planKitSubscriberImportRow(s, {
      existing: email ? contacts.get(email) ?? null : null,
      alreadyApplied: applied.has(s.id),
    })
  })
  const summary = summarizeImportPlans(plans)

  // Insert in chunks.
  const chunk = 100
  for (let i = 0; i < plans.length; i += chunk) {
    const slice = plans.slice(i, i + chunk)
    await supabase('import_job_rows', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(
        slice.map((plan) => ({
          job_id: jobId,
          source_key: plan.sourceKey,
          email: plan.email,
          action: plan.action,
          reason: plan.reason,
          status: plan.action === 'skip' ? 'skipped' : 'planned',
          plan,
          contact_id: plan.existingContactId,
        })),
      ),
    })
  }

  const finishedAt = new Date().toISOString()
  await supabase(`import_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      status: 'dry_run',
      summary,
      finished_at: finishedAt,
      updated_at: finishedAt,
    }),
  })

  return { summary, rowCount: plans.length }
}

export async function commitKitSubscriberImport(jobId: string): Promise<{
  summary: ImportPlanSummary
  applied: number
}> {
  const jobs = await supabase(
    `import_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,status,summary&limit=1`,
  )
  const job = jobs?.[0]
  if (!job) throw new Error('Import job not found.')
  if (job.status === 'committed') throw new Error('Job already committed.')
  if (job.status !== 'dry_run') throw new Error('Run a dry-run before commit.')

  const startedAt = new Date().toISOString()
  await supabase(`import_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      status: 'committing',
      started_at: startedAt,
      error_message: null,
      updated_at: startedAt,
    }),
  })

  try {
    const rows = await supabase(
      `import_job_rows?job_id=eq.${encodeURIComponent(jobId)}&select=id,source_key,action,status,plan,contact_id&order=created_at.asc`,
    )
    let applied = 0
    const counts: ImportPlanSummary = {
      total: Array.isArray(rows) ? rows.length : 0,
      create: 0,
      update: 0,
      suppress: 0,
      skip: 0,
      wouldWrite: 0,
    }

    for (const row of rows || []) {
      const plan = row.plan as ImportRowPlan
      if (plan.action === 'skip' || row.status === 'skipped') {
        counts.skip += 1
        continue
      }
      if (row.status === 'applied') {
        counts[plan.action as ImportRowAction] += 1
        counts.wouldWrite += 1
        applied += 1
        continue
      }

      // Re-check global idempotency at commit time.
      const existingKey = await supabase(
        `import_applied_keys?source=eq.${IMPORT_SOURCE_KIT_SUBSCRIBERS}&source_key=eq.${encodeURIComponent(row.source_key)}&select=source_key&limit=1`,
      )
      if (existingKey?.[0]) {
        await supabase(`import_job_rows?id=eq.${row.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: 'skipped',
            reason: 'Already applied for this source key.',
          }),
        })
        counts.skip += 1
        continue
      }

      const contactId = await applyPlan(plan)
      if (contactId) {
        try {
          await ensureContactTag(contactId, 'kit', 'Free kit')
        } catch {
          /* tagging is best-effort */
        }
      }
      const at = new Date().toISOString()
      await supabase(`import_job_rows?id=eq.${row.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: 'applied',
          contact_id: contactId,
          applied_at: at,
        }),
      })
      await supabase('import_applied_keys', {
        method: 'POST',
        prefer: 'resolution=ignore-duplicates,return=minimal',
        body: JSON.stringify({
          source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
          source_key: row.source_key,
          contact_id: contactId,
          applied_job_id: jobId,
          applied_at: at,
        }),
      })
      counts[plan.action as ImportRowAction] += 1
      counts.wouldWrite += 1
      applied += 1
    }

    const finishedAt = new Date().toISOString()
    await supabase(`import_jobs?id=eq.${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        status: 'committed',
        summary: { ...counts, applied },
        finished_at: finishedAt,
        updated_at: finishedAt,
      }),
    })

    return { summary: counts, applied }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Commit failed.'
    const failedAt = new Date().toISOString()
    await supabase(`import_jobs?id=eq.${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        status: 'failed',
        error_message: message,
        finished_at: failedAt,
        updated_at: failedAt,
      }),
    })
    throw err
  }
}

export function importModuleMutatesSubscribers(): boolean {
  return false
}
