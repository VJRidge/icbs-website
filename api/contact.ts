import { env, sendEmail, escapeHtml, supabase } from './_lib.js'
import { rateLimited, requestAddress } from './_rateLimit.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

function inbox(): string {
  const from = env('EMAIL_FROM')
  const named = from.match(/<([^>]+)>/)
  return (named ? named[1] : from).trim()
}

// POST /api/contact  { name, email, message, company (honeypot) }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  if (clip(body.company, 200)) return res.status(200).json({ ok: true })
  if (rateLimited(`contact:${requestAddress(req)}`)) {
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
  }

  const name = clip(body.name, 120)
  const email = clip(body.email, 200).toLowerCase()
  const message = clip(body.message, 4000)
  if (!name) return res.status(400).json({ error: 'Please enter your name.' })
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (message.length < 2) return res.status(400).json({ error: 'Please write a message.' })

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')
  const site = env('SITE_URL')

  try {
    try {
      await storeContact({ name, email, message })
    } catch {
      console.error('contact submission was not stored')
    }
    await sendEmail({
      to: inbox(),
      replyTo: email,
      subject: `Contact from ${name}`,
      html: `<p><strong>${safeName}</strong> &lt;${safeEmail}&gt;</p><p>${safeMessage}</p>`,
      text: `${name} <${email}>\n\n${message}`,
      unsubscribeUrl: `${site}/contact`,
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('contact email failed', err)
    return res.status(500).json({ error: 'Something went wrong on our side. Please try again in a minute.' })
  }
}

async function storeContact(payload: { name: string; email: string; message: string }) {
  const existing = await supabase('forms?title=eq.Contact&select=id&limit=1')
  let formId = existing?.[0]?.id as string | undefined
  if (!formId) {
    const created = await supabase('forms', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({ title: 'Contact', fields: [], settings: { source: 'contact' } }),
    })
    formId = created?.[0]?.id as string | undefined
  }
  if (!formId) throw new Error('Contact form row was not available')
  await supabase('form_submissions', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({ form_id: formId, payload }),
  })
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
