import { suppressContactByToken } from './_contacts.js'
import { unsubscribeGetLocation } from '../src/lib/unsubscribe/unsubscribeOutcome.js'

function redirect(res: any, location: string) {
  res.setHeader('Location', location)
  return res.status(302).end()
}

function oneClickHtml() {
  return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#F4EFE3;color:#0E0D0B;padding:48px 20px;text-align:center"><h1>You’re unsubscribed.</h1><p>You won’t get marketing updates from this list.</p><p><a href="/unsubscribed?list=contacts">Continue</a></p></body>'
}

/**
 * GET/POST /api/contact-unsubscribe?token=...
 * Suppresses marketing on the Contacts identity store.
 * Does not touch kit `subscribers` (use /api/unsubscribe for that).
 */
export default async function handler(req: any, res: any) {
  const token = String(req.query?.token || '')
  const isPost = String(req.method || 'GET').toUpperCase() === 'POST'
  try {
    const result = await suppressContactByToken(token)
    if (result === 'invalid' || result === 'missing') {
      if (isPost) return res.status(400).send('That unsubscribe link is not valid.')
      return redirect(res, unsubscribeGetLocation({ ok: false, invalid: true, list: 'contacts' }))
    }
    if (isPost) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(oneClickHtml())
    }
    return redirect(res, unsubscribeGetLocation({ ok: true, list: 'contacts' }))
  } catch (err) {
    console.error('contact unsubscribe failed', err)
    if (isPost) return res.status(500).send('Something went wrong. Please try the link again in a minute.')
    return redirect(res, unsubscribeGetLocation({ ok: false, list: 'contacts' }))
  }
}
