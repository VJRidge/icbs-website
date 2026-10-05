import { env, supabase, sendEmail } from './_lib.js'
import { kitEmail } from './_emails.js'
import { rateLimited, requestAddress } from './_rateLimit.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

// POST /api/subscribe  { firstName, email, company (honeypot), utm }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}

  // Honeypot: bots fill the hidden "company" field. Pretend it worked.
  if (clip(body.company, 200)) return res.status(200).json({ ok: true })
  if (rateLimited(`subscribe:${requestAddress(req)}`)) {
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
  }

  const email = clip(body.email, 200).toLowerCase()
  const firstName = clip(body.firstName, 80)
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (!firstName) return res.status(400).json({ error: 'Please enter your first name.' })

  const utm = body.utm && typeof body.utm === 'object' ? body.utm : {}

  try {
    // Insert, or update if this email signed up before. Signing up again also
    // re-subscribes someone who had unsubscribed. Tags are left alone so a
    // 'buyer' tag is never lost.
    const rows = await supabase('subscribers?on_conflict=email', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: JSON.stringify({
        email,
        first_name: firstName,
        utm_source: clip(utm.utm_source, 120) || null,
        utm_medium: clip(utm.utm_medium, 120) || null,
        utm_campaign: clip(utm.utm_campaign, 120) || null,
        utm_content: clip(utm.utm_content, 120) || null,
        consent_at: new Date().toISOString(),
        unsubscribed_at: null,
        last_email_at: new Date().toISOString(),
      }),
    })
    const sub = rows?.[0]
    if (!sub) throw new Error('Subscriber row was not returned')

    const site = env('SITE_URL')
    const mail = kitEmail({
      firstName,
      kitUrl: `${site}/downloads/I-Call-BS-Free-Starter-Kit.pdf`,
      unsubscribeUrl: `${site}/api/unsubscribe?token=${sub.unsubscribe_token}`,
      postalAddress: env('POSTAL_ADDRESS'),
    })

    // If the email fails, the signup still counts: the thank-you page has the download.
    try {
      await sendEmail({ to: email, ...mail, unsubscribeUrl: `${site}/api/unsubscribe?token=${sub.unsubscribe_token}` })
    } catch (err) {
      console.error('kit email failed', err)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('subscribe failed', err)
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again in a minute.' })
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
