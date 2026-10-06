import { suppressContactByToken } from './_contacts.js'

/**
 * GET/POST /api/contact-unsubscribe?token=...
 * Suppresses marketing on the Contacts identity store.
 * Does not touch kit `subscribers` (use /api/unsubscribe for that).
 */
export default async function handler(req: any, res: any) {
  const token = String(req.query?.token || '')
  try {
    const result = await suppressContactByToken(token)
    if (result === 'invalid') {
      return res.status(400).send('That unsubscribe link is not valid.')
    }
    if (result === 'missing') {
      return res.status(404).send('That unsubscribe link is not valid.')
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#F4EFE3;color:#0E0D0B;padding:48px 20px;text-align:center"><h1>You’re unsubscribed.</h1><p>You won’t get marketing updates from this list.</p><p style="font-size:14px;color:#666">Kit downloads use a separate list if you signed up for the free kit.</p></body>',
    )
  } catch (err) {
    console.error('contact unsubscribe failed', err)
    return res.status(500).send('Something went wrong. Please try the link again in a minute.')
  }
}
