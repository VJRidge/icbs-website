/**
 * Newsletter issue freeze + send helpers (service role).
 * Recipients from contacts only — never kit subscribers.
 */
import { env, sendEmail, supabase } from './_lib.js'
import { newsletterIssueEmail } from './_emails.js'

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
  const contacts = await supabase(
    `contacts?marketing_ok=eq.true&suppressed_at=is.null&select=id,email&order=created_at.asc&limit=5000`,
  )
  const seen = new Set<string>()
  let created = 0
  for (const row of contacts || []) {
    const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''
    if (!email || !row.id || seen.has(email)) continue
    seen.add(email)
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
      recipient_count: seen.size,
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
  await supabase('newsletter_provider_events', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      provider: 'resend',
      event_type: eventType,
      email: normalized,
      contact_id: contact?.id ?? null,
      payload: payload && typeof payload === 'object' ? payload : {},
      occurred_at: at,
    }),
  })
}
