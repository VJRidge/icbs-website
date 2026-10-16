import { resendPurchaseDownload } from './_stripe.js'
import { isApprovedEditor, staffUserIdFromAuth } from './_staffAuth.js'

/**
 * POST /api/purchase-resend  { purchaseId }
 * Staff resend of the book PDF email after a failed fulfillment send.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await staffUserIdFromAuth(req.headers?.authorization)
  if (!userId || !(await isApprovedEditor(userId))) {
    return res.status(401).json({ error: 'Staff authentication required.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const purchaseId = typeof body.purchaseId === 'string' ? body.purchaseId : ''
  try {
    const result = await resendPurchaseDownload(purchaseId)
    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('purchase resend failed', err)
    return res.status(500).json({ error: 'Could not resend the download email.' })
  }
}
