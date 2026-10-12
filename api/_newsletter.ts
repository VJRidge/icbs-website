/**
 * Newsletter issue freeze + send helpers (service role).
 * Recipients from contacts only — never kit subscribers.
 */
import { env, sendEmail, supabase } from './_lib.js'
import { newsletterIssueEmail } from './_emails.js'
import { resolveSegmentContactIds } from './_segments.js'
import { resolveListContactIds } from './_newsletterLists.js'

function buildKey(issueId: string, contactId: string): string {
  return `${issueId}:${contactId}`.slice(0, 200)
}

function retryDelaySeconds(attemptsAfterFailure: number): number {
  const n = Math.max(1, Math.floor(attemptsAfterFailure))
  return Math.min(3600, 60 * 2 ** (n - 1))
}

function nextAttemptAtIso(attemptsAfterFailure: number, now = new Date()): string {
  return new Date(now.getTime() + retryDelaySeconds(attemptsAfterFailure) * 1000).toISOString()
}

function shouldMarkFailed(attempts: number, maxAttempts: number): boolean {
  return attempts >= Math.max(1, maxAttempts)
}

export async function freezeRecipientsForIssue(issueId: string): Promise<number> {
  const issues = await supabase(
    `newsletter_issues?id=eq.${encodeURIComponent(issueId)}&select=id,segment_id,list_id&limit=1`,
  )
  const listId =
    typeof issues?.[0]?.list_id === 'string' ? (issues[0].list_id as string) : null
  const segmentId =
    typeof issues?.[0]?.segment_id === 'string' ? (issues[0].segment_id as string) : null
  // Publication list wins over contact-list segment when both are set.
  const contacts = listId
    ? await resolveListContactIds(listId)
    : await resolveSegmentContactIds(segmentId)
  let created = 0
  for (const row of contacts) {
    const key = buildKey(issueId, row.id)
    try {
      const inserted = await supabase('newsletter_send_jobs', {
        method: 'POST',
        prefer: 'return=representation,resolution=ignore-duplicates',
        body: JSON.stringify({
          issue_id: issueId,
          contact_id: row.id,
          idempotency_key: key,
          status: 'pending',
          next_attempt_at: new Date().toISOString(),
        }),
      })
      const job = Array.isArray(inserted) ? inserted[0] : inserted
      if (job?.id) created += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('23505') && !msg.toLowerCase().includes('duplicate')) throw err
    }
  }
  await supabase(`newsletter_issues?id=eq.${encodeURIComponent(issueId)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      recipient_count: contacts.length,
      updated_at: new Date().toISOString(),
    }),
  })
  return created
}

export async function processNewsletterSendJobs(limit = 25): Promise<{
  sent: string[]
  skipped: string[]
  failed: string[]
  retried: string[]
}> {
  const now = new Date()
  const due = await supabase(
    `newsletter_send_jobs?status=eq.pending&next_attempt_at=lte.${encodeURIComponent(now.toISOString())}&select=id,issue_id,contact_id,attempts,max_attempts&order=next_attempt_at.asc&limit=${limit}`,
  )
  const sent: string[] = []
  const skipped: string[] = []
  const failed: string[] = []
  const retried: string[] = []

  for (const job of due || []) {
    const claimed = await supabase(
      `newsletter_send_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.pending`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({
          status: 'processing',
          attempts: job.attempts + 1,
          updated_at: now.toISOString(),
        }),
      },
    )
    if (!Array.isArray(claimed) || claimed.length === 0) {
      skipped.push(job.id)
      continue
    }
    const attempts = job.attempts + 1

    try {
      const contacts = await supabase(
        `contacts?id=eq.${encodeURIComponent(job.contact_id)}&select=id,email,first_name,marketing_ok,suppressed_at,unsubscribe_token&limit=1`,
      )
      const contact = contacts?.[0]
      if (!contact?.email) throw new Error('Contact missing')
      if (!contact.marketing_ok || contact.suppressed_at) {
        await supabase(`newsletter_send_jobs?id=eq.${encodeURIComponent(job.id)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: 'skipped',
            last_error: 'Contact suppressed or marketing off',
            updated_at: now.toISOString(),
          }),
        })
        skipped.push(job.id)
        continue
      }

      const issues = await supabase(
        `newsletter_issues?id=eq.${encodeURIComponent(job.issue_id)}&select=id,subject,preview_text,body_html,body_text,status&limit=1`,
      )
      const issue = issues?.[0]
      if (!issue || (issue.status !== 'sending' && issue.status !== 'sent')) {
        throw new Error('Issue not in sending state')
      }

      const site = env('SITE_URL').replace(/\/+$/, '')
      const unsubscribeUrl = `${site}/api/contact-unsubscribe?token=${contact.unsubscribe_token}`
      const mail = newsletterIssueEmail({
        firstName: contact.first_name || '',
        subject: issue.subject || '',
        previewText: issue.preview_text || '',
        bodyHtml: issue.body_html || '',
        bodyText: issue.body_text || '',
        unsubscribeUrl,
        postalAddress: env('POSTAL_ADDRESS'),
      })
      const provider = await sendEmail({ to: contact.email, ...mail, unsubscribeUrl })

      await supabase(`newsletter_send_jobs?id=eq.${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: 'sent',
          sent_at: now.toISOString(),
          provider_message_id: provider.id,
          last_error: null,
          updated_at: now.toISOString(),
        }),
      })
      sent.push(job.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed'
      const terminal = shouldMarkFailed(attempts, job.max_attempts || 5)
      await supabase(`newsletter_send_jobs?id=eq.${encodeURIComponent(job.id)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          status: terminal ? 'failed' : 'pending',
          last_error: message.slice(0, 500),
          next_attempt_at: terminal ? now.toISOString() : nextAttemptAtIso(attempts, now),
          updated_at: now.toISOString(),
        }),
      })
      if (terminal) failed.push(job.id)
      else retried.push(job.id)
    }
  }

  return { sent, skipped, failed, retried }
}

export async function maybeCompleteIssue(issueId: string): Promise<void> {
  const pending = await supabase(
    `newsletter_send_jobs?issue_id=eq.${encodeURIComponent(issueId)}&status=in.(pending,processing)&select=id&limit=1`,
  )
  if (Array.isArray(pending) && pending.length > 0) return
  await supabase(`newsletter_issues?id=eq.${encodeURIComponent(issueId)}&status=eq.sending`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  })
}

export function shouldSuppressFromProviderEvent(eventType: string): boolean {
  const t = eventType.trim().toLowerCase()
  return (
    t === 'email.bounced' ||
    t === 'email.complained' ||
    t === 'email.failed' ||
    t === 'contact.unsubscribed'
  )
}

/** Resend (and similar) events we persist for newsletter analytics. */
export function shouldRecordProviderEvent(eventType: string): boolean {
  const t = eventType.trim().toLowerCase()
  return (
    t === 'email.sent' ||
    t === 'email.delivered' ||
    t === 'email.delivery' ||
    t === 'email.delivery_delayed' ||
    t === 'email.opened' ||
    t === 'email.open' ||
    t === 'email.clicked' ||
    t === 'email.click' ||
    t === 'email.bounced' ||
    t === 'email.bounce' ||
    t === 'email.complained' ||
    t === 'email.complaint' ||
    t === 'email.failed' ||
    t === 'contact.unsubscribed'
  )
}

export function extractProviderMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>
  const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null
  const candidates = [data?.email_id, data?.message_id, root.email_id, root.message_id]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 200)
  }
  return null
}

export async function resolveIssueIdFromProviderMessage(
  providerMessageId: string | null,
): Promise<{ issueId: string | null; contactId: string | null }> {
  if (!providerMessageId) return { issueId: null, contactId: null }
  const jobs = await supabase(
    `newsletter_send_jobs?provider_message_id=eq.${encodeURIComponent(providerMessageId)}&select=issue_id,contact_id&limit=1`,
  )
  const job = jobs?.[0]
  return {
    issueId: typeof job?.issue_id === 'string' ? job.issue_id : null,
    contactId: typeof job?.contact_id === 'string' ? job.contact_id : null,
  }
}

export async function recordProviderEvent(opts: {
  eventType: string
  email: string | null
  contactId?: string | null
  issueId?: string | null
  payload: unknown
  occurredAt?: string
}): Promise<void> {
  const at = opts.occurredAt || new Date().toISOString()
  const email = opts.email ? opts.email.trim().toLowerCase() : null
  await supabase('newsletter_provider_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      provider: 'resend',
      event_type: opts.eventType,
      email,
      contact_id: opts.contactId ?? null,
      issue_id: opts.issueId ?? null,
      payload: opts.payload && typeof opts.payload === 'object' ? opts.payload : {},
      occurred_at: at,
    }),
  })
}

export async function suppressContactByEmail(email: string, eventType: string, payload: unknown): Promise<void> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return
  const contacts = await supabase(
    `contacts?email=eq.${encodeURIComponent(normalized)}&select=id&limit=1`,
  )
  const contact = contacts?.[0]
  const at = new Date().toISOString()
  if (contact?.id) {
    await supabase(`contacts?id=eq.${contact.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        marketing_ok: false,
        suppressed_at: at,
        updated_at: at,
      }),
    })
    await supabase('contact_consent_events', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        contact_id: contact.id,
        event_type: 'suppressed',
        consent_text: `Provider event: ${eventType}`,
        occurred_at: at,
      }),
    })
  }
  const messageId = extractProviderMessageId(payload)
  const linked = await resolveIssueIdFromProviderMessage(messageId)
  await recordProviderEvent({
    eventType,
    email: normalized,
    contactId: contact?.id ?? linked.contactId,
    issueId: linked.issueId,
    payload,
    occurredAt: at,
  })
}
