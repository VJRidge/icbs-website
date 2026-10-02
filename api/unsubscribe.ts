import { supabase } from './_lib.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET (link in the email) or POST (one-click from the mail app): /api/unsubscribe?token=...
export default async function handler(req: any, res: any) {
  const token = String(req.query?.token || '')
  if (!UUID_RE.test(token)) return res.status(400).send('That unsubscribe link is not valid.')
  try {
    await supabase(`subscribers?unsubscribe_token=eq.${token}`, {
      method: 'PATCH',
      body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;background:#F4EFE3;color:#0E0D0B;padding:48px 20px;text-align:center"><h1>You’re unsubscribed.</h1><p>You won’t get any more emails from I Call BS.</p></body>',
    )
  } catch (err) {
    console.error('unsubscribe failed', err)
    return res.status(500).send('Something went wrong. Please try the link again in a minute.')
  }
}
