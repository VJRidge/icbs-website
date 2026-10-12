/**
 * Resolve newsletter_list subscribers for freeze (service role).
 * Interests are ignored — only contact_subscriptions with status=subscribed.
 */
import { supabase } from './_lib.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SubscriptionStatus = 'subscribed' | 'unsubscribed' | 'pending'

export function normalizeNewsletterListIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = item.trim()
    if (!UUID_RE.test(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= 20) break
  }
  return out
}

type ContactSubscriptionRow = {
  contactId: string
  email: string
  status: SubscriptionStatus
  marketingOk: boolean
  suppressedAt: string | null
}

function normalizeSubscriptionStatus(raw: unknown): SubscriptionStatus {
  if (raw === 'unsubscribed' || raw === 'pending' || raw === 'subscribed') return raw
  return 'unsubscribed'
}

function selectEligibleListRecipients(
  rows: ContactSubscriptionRow[],
): Array<{ id: string; email: string }> {
  const seen = new Set<string>()
  const out: Array<{ id: string; email: string }> = []
  for (const row of rows) {
    if (!row.marketingOk || row.suppressedAt) continue
    if (row.status !== 'subscribed') continue
    const email = row.email.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    out.push({ id: row.contactId, email })
  }
  return out
}

export async function resolveListContactIds(listId: string): Promise<
  Array<{ id: string; email: string }>
> {
  const lists = await supabase(
    `newsletter_lists?id=eq.${encodeURIComponent(listId)}&select=id,is_active&limit=1`,
  )
  if (!lists?.[0]) throw new Error(`Newsletter list not found: ${listId}`)
  if (lists[0].is_active === false) {
    throw new Error(`Newsletter list is inactive: ${listId}`)
  }

  const rows: ContactSubscriptionRow[] = []
  const pageSize = 1000
  for (let offset = 0; offset < 50_000; offset += pageSize) {
    const subs = await supabase(
      `contact_subscriptions?list_id=eq.${encodeURIComponent(listId)}&status=eq.subscribed&select=contact_id,status&order=contact_id.asc&limit=${pageSize}&offset=${offset}`,
    )
    const batch = (subs || []) as Array<{ contact_id?: string; status?: string }>
    if (!batch.length) break

    const ids = batch.map((b) => String(b.contact_id || '')).filter(Boolean)
    const statusById = new Map(
      batch.map((b) => [String(b.contact_id || ''), normalizeSubscriptionStatus(b.status)]),
    )
    const chunk = 80
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk)
      const or = slice.map((id) => `id.eq.${encodeURIComponent(id)}`).join(',')
      const contacts = await supabase(
        `contacts?or=(${or})&select=id,email,marketing_ok,suppressed_at`,
      )
      for (const c of contacts || []) {
        rows.push({
          contactId: String(c.id || ''),
          email: typeof c.email === 'string' ? c.email : '',
          status: statusById.get(String(c.id || '')) || 'unsubscribed',
          marketingOk: Boolean(c.marketing_ok),
          suppressedAt: typeof c.suppressed_at === 'string' ? c.suppressed_at : null,
        })
      }
    }
    if (batch.length < pageSize) break
  }

  return selectEligibleListRecipients(rows)
}

/**
 * Upsert contact_subscriptions for active newsletter lists after form consent.
 * Does not invent subscriptions from interests. Skips inactive / missing lists.
 */
export async function subscribeContactToLists(
  contactId: string,
  listIds: string[],
): Promise<{ subscribed: string[] }> {
  const ids = normalizeNewsletterListIds(listIds)
  if (!contactId || !ids.length) return { subscribed: [] }

  const subscribed: string[] = []
  const now = new Date().toISOString()
  for (const listId of ids) {
    const lists = await supabase(
      `newsletter_lists?id=eq.${encodeURIComponent(listId)}&is_active=eq.true&select=id&limit=1`,
    )
    if (!lists?.[0]?.id) continue

    const existing = await supabase(
      `contact_subscriptions?contact_id=eq.${encodeURIComponent(contactId)}&list_id=eq.${encodeURIComponent(listId)}&select=contact_id,status&limit=1`,
    )
    const row = existing?.[0]
    if (row?.status === 'subscribed') {
      subscribed.push(listId)
      continue
    }

    if (row) {
      await supabase(
        `contact_subscriptions?contact_id=eq.${encodeURIComponent(contactId)}&list_id=eq.${encodeURIComponent(listId)}`,
        {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: 'subscribed',
            subscribed_at: now,
            unsubscribed_at: null,
            updated_at: now,
          }),
        },
      )
    } else {
      await supabase('contact_subscriptions', {
        method: 'POST',
        prefer: 'return=minimal,resolution=merge-duplicates',
        body: JSON.stringify({
          contact_id: contactId,
          list_id: listId,
          status: 'subscribed',
          subscribed_at: now,
          updated_at: now,
        }),
      })
    }
    subscribed.push(listId)
  }
  return { subscribed }
}
