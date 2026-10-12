/**
 * POST /api/contact-send
 * Staff-only one-off email to selected marketing contacts.
 * Body: { contactIds: string[], subject: string, html?: string, text?: string }
 */
import { env, escapeHtml, sendEmail, supabase } from './_lib.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_RECIPIENTS = 50

async function staffUserId(authHeader: string | undefined): Promise<string | null> {
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
  const user = (await res.json()) as { id?: string }
  return user.id || null
}

async function canManageContacts(userId: string): Promise<boolean> {
  const rows = await supabase(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
  )
  const row = rows?.[0]
  if (!row?.staff_approved || row?.disabled_at) return false
  return row.role === 'owner' || row.role === 'admin' || row.role === 'editor'
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const userId = await staffUserId(req.headers?.authorization)
  if (!userId || !(await canManageContacts(userId))) {
    return res.status(401).json({ error: 'Staff authentication required.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const ids = Array.isArray(body.contactIds)
    ? body.contactIds.filter((id: unknown) => typeof id === 'string' && UUID_RE.test(id)).slice(0, MAX_RECIPIENTS)
    : []
  const subject = clip(body.subject, 200)
  const text = clip(body.text, 20000)
  const htmlRaw = clip(body.html, 50000)
  if (!ids.length) return res.status(400).json({ error: 'Select at least one contact.' })
  if (!subject) return res.status(400).json({ error: 'Subject is required.' })
  if (!text && !htmlRaw) return res.status(400).json({ error: 'Message body is required.' })

  try {
    env('RESEND_API_KEY')
    env('POSTAL_ADDRESS')
    const site = env('SITE_URL').replace(/\/+$/, '')

    const or = ids.map((id: string) => `id.eq.${encodeURIComponent(id)}`).join(',')
    const contacts = await supabase(
      `contacts?or=(${or})&select=id,email,first_name,marketing_ok,suppressed_at,unsubscribe_token`,
    )

    const sent: string[] = []
    const skipped: string[] = []
    for (const contact of contacts || []) {
      const email = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : ''
      if (!EMAIL_RE.test(email) || !contact.marketing_ok || contact.suppressed_at) {
        skipped.push(String(contact.id || ''))
        continue
      }
      const name = typeof contact.first_name === 'string' && contact.first_name.trim() ? contact.first_name.trim() : 'there'
      const unsubscribeUrl = `${site}/api/contact-unsubscribe?token=${contact.unsubscribe_token}`
      const textBody = text || htmlRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const htmlBody =
        htmlRaw ||
        `<p>${escapeHtml(textBody)
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .join('</p><p>')}</p>`

      await sendEmail({
        to: email,
        subject,
        text: `Hi ${name},\n\n${textBody}\n\nUnsubscribe: ${unsubscribeUrl}\n${env('POSTAL_ADDRESS')}`,
        html: `<div style="font-family:Georgia,serif;font-size:17px;line-height:26px;color:#0E0D0B;max-width:560px">
<p>Hi ${escapeHtml(name)},</p>
${htmlBody}
<p style="font-size:13px;color:#666;margin-top:28px"><a href="${unsubscribeUrl}" style="color:#666">Unsubscribe</a><br>${escapeHtml(env('POSTAL_ADDRESS'))}</p>
</div>`,
        unsubscribeUrl,
      })
      sent.push(String(contact.id))
    }

    return res.status(200).json({ ok: true, sent: sent.length, skipped: skipped.length, sentIds: sent })
  } catch (err) {
    console.error('contact-send failed', err)
    return res.status(500).json({ error: 'Could not send email.' })
  }
}
