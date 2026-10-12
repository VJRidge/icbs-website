/**
 * Static contact-list CSV import (service role).
 * Plan helpers mirror src/lib/contacts/contactListCsv.ts.
 * Never mutates kit subscribers.
 */
import { supabase } from './_lib.js'
import { ensureContactTag } from './_segments.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_ROWS = 2000
const CONSENT_TEXT =
  'Staff CSV import into a contact list with confirmed prior marketing consent.'

type ParsedRow = { email: string | null; firstName: string | null; line: number }

type ContactRow = {
  id: string
  email: string
  first_name: string | null
  marketing_ok: boolean
  suppressed_at: string | null
}

type PlanAction = 'create' | 'update' | 'add_member' | 'skip'

type Plan = {
  email: string | null
  action: PlanAction
  reason: string
  firstName: string | null
  marketingOk: boolean
  addToList: boolean
  existingContactId: string | null
  contactPatch: { firstName: string | null; marketingOk: boolean } | null
  line: number
}

type Summary = {
  total: number
  create: number
  update: number
  add_member: number
  skip: number
  wouldWrite: number
}

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

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function headerIndex(headers: string[], names: string[]): number {
  const lowered = headers.map((h) => h.trim().toLowerCase())
  for (const name of names) {
    const idx = lowered.indexOf(name)
    if (idx >= 0) return idx
  }
  return -1
}

function parseContactListCsv(text: string): ParsedRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (!lines.length) return []

  let start = 0
  let emailIdx = 0
  let nameIdx = -1
  const firstCells = splitCsvLine(lines[0] || '')
  const looksLikeHeader =
    firstCells.some((c) => /^(e-?mail|email_address)$/i.test(c.trim())) ||
    firstCells.some((c) => /^(first[_\s-]?name|fname|name)$/i.test(c.trim()))

  if (looksLikeHeader) {
    emailIdx = headerIndex(firstCells, ['email', 'e-mail', 'email_address'])
    if (emailIdx < 0) emailIdx = 0
    nameIdx = headerIndex(firstCells, ['first_name', 'first name', 'firstname', 'fname', 'name'])
    start = 1
  } else if (firstCells[0] && !normalizeEmail(firstCells[0])) {
    start = 1
    emailIdx = 0
    nameIdx = firstCells.length > 1 ? 1 : -1
  }

  const rows: ParsedRow[] = []
  for (let i = start; i < lines.length; i += 1) {
    const raw = lines[i]
    if (!raw || !raw.trim()) continue
    const cells = splitCsvLine(raw)
    if (!cells.length || cells.every((c) => !c.trim())) continue
    if (rows.length >= MAX_ROWS) {
      throw new Error(`CSV exceeds ${MAX_ROWS} data rows. Split the file and import in batches.`)
    }
    rows.push({
      email: normalizeEmail(cells[emailIdx] || ''),
      firstName: nameIdx >= 0 ? trimName(cells[nameIdx]) : null,
      line: i + 1,
    })
  }
  return rows
}

function dedupeRows(rows: ParsedRow[]): ParsedRow[] {
  const byEmail = new Map<string, ParsedRow>()
  const invalid: ParsedRow[] = []
  for (const row of rows) {
    if (!row.email) {
      invalid.push(row)
      continue
    }
    byEmail.set(row.email, row)
  }
  return [...invalid, ...byEmail.values()].sort((a, b) => a.line - b.line)
}

function planRow(
  row: ParsedRow,
  opts: { existing: ContactRow | null; alreadyMember: boolean; confirmMarketingConsent: boolean },
): Plan {
  const email = row.email
  const firstName = trimName(row.firstName)
  if (!email) {
    return {
      email: null,
      action: 'skip',
      reason: 'Invalid email',
      firstName,
      marketingOk: false,
      addToList: false,
      existingContactId: null,
      contactPatch: null,
      line: row.line,
    }
  }
  if (!opts.existing) {
    if (!opts.confirmMarketingConsent) {
      return {
        email,
        action: 'skip',
        reason: 'Marketing consent confirmation required for new contacts',
        firstName,
        marketingOk: false,
        addToList: false,
        existingContactId: null,
        contactPatch: null,
        line: row.line,
      }
    }
    return {
      email,
      action: 'create',
      reason: 'New contact + list membership',
      firstName,
      marketingOk: true,
      addToList: true,
      existingContactId: null,
      contactPatch: { firstName, marketingOk: true },
      line: row.line,
    }
  }

  const suppressed = Boolean(opts.existing.suppressed_at) || !opts.existing.marketing_ok
  if (suppressed) {
    if (opts.alreadyMember) {
      return {
        email,
        action: 'skip',
        reason: 'Already on list (suppressed; not re-opted-in)',
        firstName: opts.existing.first_name,
        marketingOk: false,
        addToList: false,
        existingContactId: opts.existing.id,
        contactPatch: null,
        line: row.line,
      }
    }
    return {
      email,
      action: 'add_member',
      reason: 'Add to list only (suppressed; not re-opted-in)',
      firstName: opts.existing.first_name,
      marketingOk: false,
      addToList: true,
      existingContactId: opts.existing.id,
      contactPatch: null,
      line: row.line,
    }
  }

  const nameNeedsUpdate = Boolean(firstName) && firstName !== (opts.existing.first_name || null)
  if (opts.alreadyMember && !nameNeedsUpdate) {
    return {
      email,
      action: 'skip',
      reason: 'Already on list',
      firstName: opts.existing.first_name,
      marketingOk: true,
      addToList: false,
      existingContactId: opts.existing.id,
      contactPatch: null,
      line: row.line,
    }
  }
  if (nameNeedsUpdate) {
    return {
      email,
      action: 'update',
      reason: opts.alreadyMember ? 'Update name' : 'Update name + list membership',
      firstName,
      marketingOk: true,
      addToList: !opts.alreadyMember,
      existingContactId: opts.existing.id,
      contactPatch: { firstName, marketingOk: true },
      line: row.line,
    }
  }
  return {
    email,
    action: 'add_member',
    reason: 'Add to list',
    firstName: opts.existing.first_name,
    marketingOk: true,
    addToList: true,
    existingContactId: opts.existing.id,
    contactPatch: null,
    line: row.line,
  }
}

function summarize(plans: Plan[]): Summary {
  const summary: Summary = {
    total: plans.length,
    create: 0,
    update: 0,
    add_member: 0,
    skip: 0,
    wouldWrite: 0,
  }
  for (const p of plans) {
    summary[p.action] += 1
    if (p.action !== 'skip') summary.wouldWrite += 1
  }
  return summary
}

async function loadSegment(segmentId: string): Promise<{ id: string; list_kind: string }> {
  const rows = await supabase(
    `audience_segments?id=eq.${encodeURIComponent(segmentId)}&select=id,list_kind&limit=1`,
  )
  const row = rows?.[0]
  if (!row?.id) throw new Error('Contact list not found.')
  if (row.list_kind !== 'static') {
    throw new Error('CSV upload is only supported for static contact lists.')
  }
  return { id: String(row.id), list_kind: String(row.list_kind) }
}

async function loadContactsByEmails(emails: string[]): Promise<Map<string, ContactRow>> {
  const map = new Map<string, ContactRow>()
  const chunk = 40
  for (let i = 0; i < emails.length; i += chunk) {
    const slice = emails.slice(i, i + chunk)
    if (!slice.length) continue
    const or = slice.map((e) => `email.eq.${encodeURIComponent(e)}`).join(',')
    const rows = await supabase(
      `contacts?or=(${or})&select=id,email,first_name,marketing_ok,suppressed_at`,
    )
    for (const row of rows || []) {
      const email = String(row.email || '')
        .trim()
        .toLowerCase()
      if (!email) continue
      map.set(email, {
        id: String(row.id),
        email,
        first_name: row.first_name ?? null,
        marketing_ok: Boolean(row.marketing_ok),
        suppressed_at: row.suppressed_at ?? null,
      })
    }
  }
  return map
}

async function loadMemberIds(segmentId: string, contactIds: string[]): Promise<Set<string>> {
  const set = new Set<string>()
  const chunk = 40
  for (let i = 0; i < contactIds.length; i += chunk) {
    const slice = contactIds.slice(i, i + chunk)
    if (!slice.length) continue
    const or = slice.map((id) => `contact_id.eq.${encodeURIComponent(id)}`).join(',')
    const rows = await supabase(
      `audience_segment_members?segment_id=eq.${encodeURIComponent(segmentId)}&or=(${or})&select=contact_id`,
    )
    for (const row of rows || []) {
      if (row?.contact_id) set.add(String(row.contact_id))
    }
  }
  return set
}

async function buildPlans(
  segmentId: string,
  csvText: string,
  confirmMarketingConsent: boolean,
): Promise<{ plans: Plan[]; summary: Summary }> {
  await loadSegment(segmentId)
  const parsed = dedupeRows(parseContactListCsv(csvText))
  if (!parsed.length) throw new Error('CSV contained no rows.')
  const emails = parsed.map((r) => r.email).filter((e): e is string => Boolean(e))
  const byEmail = await loadContactsByEmails(emails)
  const members = await loadMemberIds(
    segmentId,
    [...byEmail.values()].map((c) => c.id),
  )
  const plans = parsed.map((row) => {
    const existing = row.email ? byEmail.get(row.email) || null : null
    return planRow(row, {
      existing,
      alreadyMember: existing ? members.has(existing.id) : false,
      confirmMarketingConsent,
    })
  })
  return { plans, summary: summarize(plans) }
}

async function insertConsentGranted(contactId: string) {
  await supabase('contact_consent_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      contact_id: contactId,
      event_type: 'granted',
      consent_text: CONSENT_TEXT,
      form_id: null,
      form_version: null,
      submission_id: null,
      occurred_at: new Date().toISOString(),
      meta: { import_source: 'contact_list_csv' },
    }),
  })
}

export async function dryRunContactListCsvImport(
  segmentId: string,
  csvText: string,
  confirmMarketingConsent: boolean,
): Promise<{ summary: Summary; sample: Plan[] }> {
  const { plans, summary } = await buildPlans(segmentId, csvText, confirmMarketingConsent)
  return { summary, sample: plans.slice(0, 25) }
}

export async function commitContactListCsvImport(
  segmentId: string,
  csvText: string,
  confirmMarketingConsent: boolean,
): Promise<{ summary: Summary; written: number }> {
  if (!confirmMarketingConsent) {
    throw new Error('confirmMarketingConsent is required to commit a CSV import.')
  }
  const { plans, summary } = await buildPlans(segmentId, csvText, confirmMarketingConsent)
  let written = 0

  for (const plan of plans) {
    if (plan.action === 'skip' || !plan.email) continue
    let contactId = plan.existingContactId
    const now = new Date().toISOString()

    if (plan.action === 'create' && plan.contactPatch) {
      const created = await supabase('contacts', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          email: plan.email,
          first_name: plan.contactPatch.firstName,
          marketing_ok: true,
          suppressed_at: null,
          first_consented_at: now,
          last_consented_at: now,
          source_label: 'contact_list_csv',
          updated_at: now,
        }),
      })
      const row = Array.isArray(created) ? created[0] : created
      if (!row?.id) throw new Error(`Contact insert failed for ${plan.email}`)
      contactId = String(row.id)
      await insertConsentGranted(contactId)
      await ensureContactTag(contactId, 'csv-import', 'CSV import')
    } else if (plan.action === 'update' && plan.contactPatch && contactId) {
      await supabase(`contacts?id=eq.${encodeURIComponent(contactId)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          first_name: plan.contactPatch.firstName,
          updated_at: now,
        }),
      })
    }

    if (plan.addToList && contactId) {
      await supabase('audience_segment_members', {
        method: 'POST',
        prefer: 'resolution=ignore-duplicates,return=minimal',
        body: JSON.stringify({ segment_id: segmentId, contact_id: contactId }),
      })
    }
    written += 1
  }

  return { summary, written }
}
