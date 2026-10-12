/**
 * Audience segment evaluation for newsletter freeze (service role).
 * Mirrors src/lib/contacts/segmentRules.ts.
 */
import { supabase } from './_lib.js'

export type SegmentMatch = 'all' | 'any'

export type SegmentRule =
  | { field: 'marketing_ok'; op: 'eq'; value: boolean }
  | { field: 'suppressed'; op: 'eq'; value: boolean }
  | { field: 'tag'; op: 'has' | 'not_has'; value: string }
  | { field: 'source_form_id'; op: 'eq'; value: string }
  | { field: 'lead_magnet_id'; op: 'requested'; value: string }

export type SegmentDefinition = {
  match: SegmentMatch
  rules: SegmentRule[]
}

type ContactRow = {
  id: string
  email: string
  marketing_ok: boolean
  suppressed_at: string | null
  source_form_id: string | null
  tagSlugs: string[]
  requestedLeadMagnetIds: string[]
}

function slugifyTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function isRule(value: unknown): value is SegmentRule {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  if (o.field === 'marketing_ok' && o.op === 'eq' && typeof o.value === 'boolean') return true
  if (o.field === 'suppressed' && o.op === 'eq' && typeof o.value === 'boolean') return true
  if (o.field === 'tag' && (o.op === 'has' || o.op === 'not_has') && typeof o.value === 'string') {
    return true
  }
  if (o.field === 'source_form_id' && o.op === 'eq' && typeof o.value === 'string') return true
  if (o.field === 'lead_magnet_id' && o.op === 'requested' && typeof o.value === 'string') {
    return true
  }
  return false
}

export function normalizeSegmentDefinition(raw: unknown): SegmentDefinition {
  if (!raw || typeof raw !== 'object') return { match: 'all', rules: [] }
  const o = raw as Record<string, unknown>
  const match: SegmentMatch = o.match === 'any' ? 'any' : 'all'
  const rulesIn = Array.isArray(o.rules) ? o.rules : []
  const rules: SegmentRule[] = []
  for (const item of rulesIn) {
    if (!isRule(item)) continue
    if (item.field === 'tag') {
      const value = slugifyTag(item.value)
      if (!value) continue
      rules.push({ field: 'tag', op: item.op, value })
      continue
    }
    if (item.field === 'source_form_id' || item.field === 'lead_magnet_id') {
      const value = item.value.trim()
      if (!value) continue
      rules.push({ ...item, value } as SegmentRule)
      continue
    }
    rules.push(item)
  }
  return { match, rules }
}

function ruleMatches(contact: ContactRow, rule: SegmentRule): boolean {
  switch (rule.field) {
    case 'marketing_ok':
      return contact.marketing_ok === rule.value
    case 'suppressed':
      return Boolean(contact.suppressed_at) === rule.value
    case 'tag': {
      const has = contact.tagSlugs.includes(rule.value)
      return rule.op === 'has' ? has : !has
    }
    case 'source_form_id':
      return contact.source_form_id === rule.value
    case 'lead_magnet_id':
      return contact.requestedLeadMagnetIds.includes(rule.value)
    default:
      return false
  }
}

export function evaluateSegment(contact: ContactRow, definition: SegmentDefinition): boolean {
  if (!contact.marketing_ok || contact.suppressed_at) return false
  const def = normalizeSegmentDefinition(definition)
  if (def.rules.length === 0) return true
  if (def.match === 'any') return def.rules.some((r) => ruleMatches(contact, r))
  return def.rules.every((r) => ruleMatches(contact, r))
}

async function loadTagMap(contactIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  const chunk = 80
  for (let i = 0; i < contactIds.length; i += chunk) {
    const slice = contactIds.slice(i, i + chunk)
    if (!slice.length) continue
    const or = slice.map((id) => `contact_id.eq.${encodeURIComponent(id)}`).join(',')
    const links = await supabase(
      `contact_tag_links?or=(${or})&select=contact_id,contact_tags(slug)`,
    )
    for (const row of links || []) {
      const contactId = String(row.contact_id || '')
      const tag = row.contact_tags
      const slug =
        tag && typeof tag === 'object' && !Array.isArray(tag)
          ? String((tag as { slug?: string }).slug || '')
          : Array.isArray(tag) && tag[0]
            ? String((tag[0] as { slug?: string }).slug || '')
            : ''
      if (!contactId || !slug) continue
      const prev = map.get(contactId) || []
      prev.push(slug)
      map.set(contactId, prev)
    }
  }
  return map
}

async function loadLeadMagnetMap(contactIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  const chunk = 80
  for (let i = 0; i < contactIds.length; i += chunk) {
    const slice = contactIds.slice(i, i + chunk)
    if (!slice.length) continue
    const or = slice.map((id) => `contact_id.eq.${encodeURIComponent(id)}`).join(',')
    const jobs = await supabase(
      `delivery_jobs?or=(${or})&select=contact_id,lead_magnet_id&limit=5000`,
    )
    for (const row of jobs || []) {
      const contactId = String(row.contact_id || '')
      const magnetId = String(row.lead_magnet_id || '')
      if (!contactId || !magnetId) continue
      const prev = map.get(contactId) || []
      if (!prev.includes(magnetId)) prev.push(magnetId)
      map.set(contactId, prev)
    }
  }
  return map
}

async function resolveStaticListContactIds(
  segmentId: string,
): Promise<Array<{ id: string; email: string }>> {
  const ids: string[] = []
  const pageSize = 1000
  for (let offset = 0; offset < 50_000; offset += pageSize) {
    const members = await supabase(
      `audience_segment_members?segment_id=eq.${encodeURIComponent(segmentId)}&select=contact_id&order=contact_id.asc&limit=${pageSize}&offset=${offset}`,
    )
    const batch = (members || [])
      .map((m: { contact_id?: string }) => String(m.contact_id || ''))
      .filter(Boolean)
    ids.push(...batch)
    if (batch.length < pageSize) break
  }
  if (!ids.length) return []

  const out: Array<{ id: string; email: string }> = []
  const seen = new Set<string>()
  const chunk = 80
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk)
    const or = slice.map((id) => `id.eq.${encodeURIComponent(id)}`).join(',')
    const contacts = await supabase(
      `contacts?or=(${or})&marketing_ok=eq.true&suppressed_at=is.null&select=id,email`,
    )
    for (const row of contacts || []) {
      const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''
      const id = String(row.id || '')
      if (!email || !id || seen.has(email)) continue
      seen.add(email)
      out.push({ id, email })
    }
  }
  return out
}

export async function resolveSegmentContactIds(segmentId: string | null): Promise<
  Array<{ id: string; email: string }>
> {
  let definition: SegmentDefinition = { match: 'all', rules: [] }
  if (segmentId) {
    const rows = await supabase(
      `audience_segments?id=eq.${encodeURIComponent(segmentId)}&select=definition,list_kind&limit=1`,
    )
    if (!rows?.[0]) {
      throw new Error(`Audience segment not found: ${segmentId}`)
    }
    if (rows[0].list_kind === 'static') {
      return resolveStaticListContactIds(segmentId)
    }
    definition = normalizeSegmentDefinition(rows[0].definition)
  }

  const contacts = await supabase(
    `contacts?marketing_ok=eq.true&suppressed_at=is.null&select=id,email,marketing_ok,suppressed_at,source_form_id&order=created_at.asc&limit=5000`,
  )
  const list = (contacts || []) as Array<{
    id: string
    email: string
    marketing_ok: boolean
    suppressed_at: string | null
    source_form_id: string | null
  }>
  const ids = list.map((c) => c.id)
  const needsTags = definition.rules.some((r) => r.field === 'tag')
  const needsMagnets = definition.rules.some((r) => r.field === 'lead_magnet_id')
  const tagMap = needsTags ? await loadTagMap(ids) : new Map<string, string[]>()
  const magnetMap = needsMagnets ? await loadLeadMagnetMap(ids) : new Map<string, string[]>()

  const out: Array<{ id: string; email: string }> = []
  const seen = new Set<string>()
  for (const row of list) {
    const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''
    if (!email || seen.has(email)) continue
    const contact: ContactRow = {
      id: row.id,
      email,
      marketing_ok: row.marketing_ok,
      suppressed_at: row.suppressed_at,
      source_form_id: row.source_form_id,
      tagSlugs: tagMap.get(row.id) || [],
      requestedLeadMagnetIds: magnetMap.get(row.id) || [],
    }
    if (!evaluateSegment(contact, definition)) continue
    seen.add(email)
    out.push({ id: row.id, email })
  }
  return out
}

/** Attach a tag by slug to a contact (creates tag if needed). */
export async function ensureContactTag(contactId: string, slugRaw: string, label?: string) {
  const slug = slugifyTag(slugRaw)
  if (!slug || !contactId) return
  let tags = await supabase(
    `contact_tags?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
  )
  let tagId = tags?.[0]?.id as string | undefined
  if (!tagId) {
    try {
      const created = await supabase('contact_tags', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          slug,
          label: (label || slug).trim().slice(0, 80) || slug,
        }),
      })
      tagId = Array.isArray(created) ? created[0]?.id : created?.id
    } catch {
      // Concurrent create of the same slug — re-select and continue.
      tags = await supabase(
        `contact_tags?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
      )
      tagId = tags?.[0]?.id as string | undefined
    }
  }
  if (!tagId) {
    tags = await supabase(
      `contact_tags?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`,
    )
    tagId = tags?.[0]?.id as string | undefined
  }
  if (!tagId) return
  await supabase('contact_tag_links', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify({ contact_id: contactId, tag_id: tagId }),
  })
}
