/**
 * POST /api/newsletter-test-send
 * Staff-only: send one preview of a newsletter issue to an address (does not freeze recipients).
 * Body: { issueId: string, toEmail?: string }
 */
import { env, sendEmail, supabase } from './_lib.js'
import { newsletterIssueEmail } from './_emails.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function staffUser(authHeader: string | undefined): Promise<{
  id: string
  email: string | null
} | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const jwt = authHeader.slice('Bearer '.length).trim()
  if (!jwt) return null
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${jwt}`,
    },
  })
  if (!res.ok) return null
  const user = (await res.json()) as { id?: string; email?: string }
  if (!user.id) return null
  return { id: user.id, email: typeof user.email === 'string' ? user.email : null }
}

async function canManageNewsletter(userId: string): Promise<boolean> {
  const rows = await supabase(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
  )
  const row = rows?.[0]
  if (!row?.staff_approved || row?.disabled_at) return false
  return row.role === 'owner' || row.role === 'admin' || row.role === 'editor'
}

type Body = {
  issueId?: string
  toEmail?: string
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const staff = await staffUser(req.headers?.authorization)
  if (!staff || !(await canManageNewsletter(staff.id))) {
    return res.status(401).json({ error: 'Staff authentication required.' })
  }

  const body: Body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const issueId = typeof body.issueId === 'string' ? body.issueId.trim() : ''
  if (!issueId) {
    return res.status(400).json({ error: 'issueId is required.' })
  }

  const toRaw =
    typeof body.toEmail === 'string' && body.toEmail.trim()
      ? body.toEmail.trim().toLowerCase()
      : (staff.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(toRaw)) {
    return res.status(400).json({ error: 'A valid toEmail is required (or sign in with an email).' })
  }

  try {
    env('RESEND_API_KEY')
    env('POSTAL_ADDRESS')
    const site = env('SITE_URL').replace(/\/+$/, '')

    const issues = await supabase(
      `newsletter_issues?id=eq.${encodeURIComponent(issueId)}&select=id,subject,preview_text,body_html,body_text&limit=1`,
    )
    const issue = issues?.[0]
    if (!issue) {
      return res.status(404).json({ error: 'Newsletter not found.' })
    }
    const bodyHtml = typeof issue.body_html === 'string' ? issue.body_html.trim() : ''
    if (!bodyHtml) {
      return res.status(400).json({ error: 'Nothing to send yet. Save the Design step first.' })
    }

    const mail = newsletterIssueEmail({
      firstName: 'there',
      subject: `[TEST] ${issue.subject || 'Newsletter'}`,
      previewText: issue.preview_text || '',
      bodyHtml,
      bodyText: issue.body_text || '',
      unsubscribeUrl: `${site}/api/contact-unsubscribe`,
      postalAddress: env('POSTAL_ADDRESS'),
    })

    const provider = await sendEmail({
      to: toRaw,
      ...mail,
      unsubscribeUrl: `${site}/api/contact-unsubscribe`,
    })

    return res.status(200).json({ ok: true, to: toRaw, providerMessageId: provider.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Test send failed.'
    console.error('newsletter-test-send failed', err)
    return res.status(500).json({ error: message })
  }
}
