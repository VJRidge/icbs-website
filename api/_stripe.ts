/**
 * Stripe Checkout for the $17 book PDF.
 * Plan helpers mirror src/lib/stripe/bookCheckout.ts.
 * Keys are runtime-only; missing keys return clear errors (no crash at import).
 */
import Stripe from 'stripe'
import { env, sendEmail, supabase } from './_lib.js'
import { bookPurchaseEmail } from './_emails.js'
import { recordConversionEvent } from './_analytics.js'
import { ensureContactTag } from './_segments.js'
import { signPrivateMediaPath } from './_leadMagnets.js'
import { clipStripeEnv } from '../src/lib/stripe/bookCheckout.js'
import { BOOK_SIGNED_URL_EXPIRES, resolveBookDownloadSource } from '../src/lib/stripe/bookDownload.js'

export const BOOK_PRODUCT_KEY = 'i_call_bs_book' as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200)
  if (!email || !EMAIL_RE.test(email)) return null
  return email
}

export function stripeSecretConfigured(): boolean {
  return Boolean(clipStripeEnv(process.env.STRIPE_SECRET_KEY) && clipStripeEnv(process.env.STRIPE_BOOK_PRICE_ID))
}

export function stripeWebhookConfigured(): boolean {
  return Boolean(clipStripeEnv(process.env.STRIPE_WEBHOOK_SECRET))
}

export function bookDownloadUrl(): string {
  return (process.env.BOOK_DOWNLOAD_URL || '').trim()
}

export async function resolveFulfillmentDownloadUrl(): Promise<string> {
  const source = resolveBookDownloadSource({
    privatePath: process.env.BOOK_PRIVATE_PATH,
    publicUrl: process.env.BOOK_DOWNLOAD_URL,
  })
  if (source.kind === 'private') {
    return signPrivateMediaPath(source.path, BOOK_SIGNED_URL_EXPIRES)
  }
  if (source.kind === 'public') return source.url
  throw new Error('BOOK_PRIVATE_PATH or BOOK_DOWNLOAD_URL is not set.')
}

function getStripe(): Stripe {
  const key = clipStripeEnv(process.env.STRIPE_SECRET_KEY)
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set.')
  return new Stripe(key, { apiVersion: '2026-09-30.endive' })
}

export function canFulfillCheckoutSession(opts: {
  paymentStatus: string
  mode?: string | null
}): boolean {
  if (opts.mode && opts.mode !== 'payment') return false
  return opts.paymentStatus === 'paid' || opts.paymentStatus === 'no_payment_required'
}

/** Mirror of src/lib/stripe/bookCheckout.sessionMatchesBookProduct */
export function sessionMatchesBookProduct(opts: {
  productKey?: string | null
  clientReferenceId?: string | null
  lineItemPriceIds?: string[] | null
  expectedPriceId?: string | null
}): boolean {
  const meta = (opts.productKey || '').trim()
  const ref = (opts.clientReferenceId || '').trim()
  if (meta && meta !== BOOK_PRODUCT_KEY) return false
  if (ref && ref !== BOOK_PRODUCT_KEY) return false

  const expectedPrice = (opts.expectedPriceId || '').trim()
  const prices = (opts.lineItemPriceIds || []).map((p) => String(p || '').trim()).filter(Boolean)
  if (expectedPrice && prices.length > 0 && !prices.includes(expectedPrice)) {
    return false
  }

  return meta === BOOK_PRODUCT_KEY || ref === BOOK_PRODUCT_KEY
}

function lineItemPriceIdsFromSession(session: Stripe.Checkout.Session): string[] {
  const data = session.line_items?.data
  if (!Array.isArray(data)) return []
  const out: string[] = []
  for (const item of data) {
    const price = item.price
    if (typeof price === 'string' && price) out.push(price)
    else if (price && typeof price === 'object' && typeof price.id === 'string') out.push(price.id)
  }
  return out
}

function checkoutMarketingOptIn(customFields: unknown): boolean {
  if (!Array.isArray(customFields)) return false
  for (const row of customFields) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (String(o.key ?? '') !== 'kit_mail') continue
    const box = o.checkbox && typeof o.checkbox === 'object' ? (o.checkbox as { value?: unknown }).value : undefined
    if (box === true || box === 'true' || box === 'yes') return true
    const drop = o.dropdown && typeof o.dropdown === 'object' ? (o.dropdown as { value?: unknown }).value : undefined
    return String(drop ?? '').trim().toLowerCase() === 'yes'
  }
  return false
}

export async function createBookCheckoutSession(opts?: {
  customerEmail?: string | null
  successUrl?: string
  cancelUrl?: string
}): Promise<{ url: string; sessionId: string }> {
  if (!stripeSecretConfigured()) {
    throw new Error('Stripe checkout is not configured (STRIPE_SECRET_KEY / STRIPE_BOOK_PRICE_ID).')
  }
  const site = env('SITE_URL').replace(/\/$/, '')
  const stripe = getStripe()
  const priceId = clipStripeEnv(process.env.STRIPE_BOOK_PRICE_ID)
  const email = opts?.customerEmail ? normalizeEmail(opts.customerEmail) : null

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts?.successUrl || `${site}/buy/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: opts?.cancelUrl || `${site}/#buy`,
    ...(email ? { customer_email: email } : {}),
    client_reference_id: BOOK_PRODUCT_KEY,
    metadata: { product_key: BOOK_PRODUCT_KEY },
    custom_fields: [
      {
        key: 'kit_mail',
        label: { type: 'custom', custom: 'Email me the free-kit notes (optional)' },
        type: 'dropdown',
        optional: true,
        dropdown: {
          options: [
            { label: 'No thanks', value: 'no' },
            { label: 'Yes, email me', value: 'yes' },
          ],
        },
      },
    ],
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return { url: session.url, sessionId: session.id }
}

export function constructStripeEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
  if (!stripeWebhookConfigured()) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set.')
  }
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    clipStripeEnv(process.env.STRIPE_WEBHOOK_SECRET),
  )
}

async function fetchPurchaseBySession(sessionId: string): Promise<{
  id: string
  status: string
  fulfilled_at: string | null
} | null> {
  const rows = await supabase(
    `purchases?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=id,status,fulfilled_at&limit=1`,
  )
  return rows?.[0] ?? null
}

async function upsertPaidPurchase(opts: {
  sessionId: string
  paymentIntent: string | null
  email: string
  amountTotal: number | null
  currency: string | null
  meta: Record<string, unknown>
}): Promise<{ id: string; status: string; fulfilled_at: string | null }> {
  const existing = await fetchPurchaseBySession(opts.sessionId)
  const now = new Date().toISOString()
  if (existing) {
    if (existing.status === 'fulfilled') return existing
    await supabase(`purchases?id=eq.${existing.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        status: 'paid',
        stripe_payment_intent: opts.paymentIntent,
        email: opts.email,
        amount_total: opts.amountTotal,
        currency: opts.currency,
        meta: opts.meta,
        updated_at: now,
      }),
    })
    return { ...existing, status: 'paid' }
  }

  const created = await supabase('purchases', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({
      stripe_session_id: opts.sessionId,
      stripe_payment_intent: opts.paymentIntent,
      email: opts.email,
      product_key: BOOK_PRODUCT_KEY,
      amount_total: opts.amountTotal,
      currency: opts.currency,
      status: 'paid',
      meta: opts.meta,
      updated_at: now,
    }),
  })
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) throw new Error('Purchase insert returned no id')
  return row
}

async function addBuyerTag(email: string, firstName: string | null) {
  const rows = await supabase(
    `subscribers?email=eq.${encodeURIComponent(email)}&select=id,tags,first_name&limit=1`,
  )
  const existing = rows?.[0]
  if (existing) {
    const tags: string[] = Array.isArray(existing.tags) ? existing.tags.map(String) : []
    const next = tags.includes('buyer') ? tags : [...tags, 'buyer']
    await supabase(`subscribers?id=eq.${existing.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({
        tags: next,
        ...(firstName && !existing.first_name ? { first_name: firstName } : {}),
      }),
    })
    return
  }

  // Opt-in at Checkout only (never from the card payment alone).
  await supabase('subscribers', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      email,
      first_name: firstName,
      tags: ['buyer'],
      consent_at: new Date().toISOString(),
    }),
  })
}

async function markFulfilled(purchaseId: string) {
  const at = new Date().toISOString()
  await supabase(`purchases?id=eq.${purchaseId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      status: 'fulfilled',
      fulfilled_at: at,
      updated_at: at,
    }),
  })
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<{
  fulfilled: boolean
  skipped?: string
}> {
  if (!canFulfillCheckoutSession({ paymentStatus: session.payment_status, mode: session.mode })) {
    return { fulfilled: false, skipped: 'unpaid' }
  }

  const expectedPriceId = process.env.STRIPE_BOOK_PRICE_ID?.trim() || null
  if (
    !sessionMatchesBookProduct({
      productKey: session.metadata?.product_key,
      clientReferenceId: session.client_reference_id,
      lineItemPriceIds: lineItemPriceIdsFromSession(session),
      expectedPriceId,
    })
  ) {
    return { fulfilled: false, skipped: 'not_book_product' }
  }

  const email =
    normalizeEmail(session.customer_details?.email || session.customer_email || '') || null
  if (!email) return { fulfilled: false, skipped: 'missing_email' }

  const downloadUrl = await resolveFulfillmentDownloadUrl()

  const existing = await fetchPurchaseBySession(session.id)
  if (existing?.status === 'fulfilled') {
    return { fulfilled: true, skipped: 'already_fulfilled' }
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null

  const purchase = await upsertPaidPurchase({
    sessionId: session.id,
    paymentIntent,
    email,
    amountTotal: typeof session.amount_total === 'number' ? session.amount_total : null,
    currency: session.currency || null,
    meta: {
      product_key: session.metadata?.product_key || BOOK_PRODUCT_KEY,
      client_reference_id: session.client_reference_id || null,
    },
  })

  if (purchase.status === 'fulfilled') {
    return { fulfilled: true, skipped: 'already_fulfilled' }
  }

  const firstName =
    session.customer_details?.name?.trim().split(/\s+/)[0]?.slice(0, 80) || null

  if (checkoutMarketingOptIn(session.custom_fields)) {
    await addBuyerTag(email, firstName)
  }

  const site = env('SITE_URL').replace(/\/$/, '')
  // Prefer contact unsubscribe if we can find one; fall back to site privacy.
  const contacts = await supabase(
    `contacts?email=eq.${encodeURIComponent(email)}&select=id,unsubscribe_token&limit=1`,
  )
  if (contacts?.[0]?.id) {
    try {
      await ensureContactTag(String(contacts[0].id), 'buyer', 'Book buyer')
    } catch {
      /* best-effort */
    }
  }
  const token = contacts?.[0]?.unsubscribe_token
  const unsubscribeUrl = token
    ? `${site}/api/contact-unsubscribe?token=${token}`
    : `${site}/legal`

  const mail = bookPurchaseEmail({
    firstName: firstName || 'there',
    downloadUrl,
    unsubscribeUrl,
    postalAddress: env('POSTAL_ADDRESS'),
  })

  try {
    await sendEmail({
      to: email,
      ...mail,
      unsubscribeUrl,
    })
  } catch (err) {
    console.error('book purchase email failed', err)
    // Still mark fulfilled — receipt is recorded; staff can resend.
  }

  await markFulfilled(purchase.id)

  void recordConversionEvent({
    name: 'book_purchase',
    path: '/buy',
    meta: {
      session_id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
    },
  })

  return { fulfilled: true }
}

export async function fulfillFromStripeEvent(event: Stripe.Event): Promise<{
  handled: boolean
  fulfilled?: boolean
  skipped?: string
}> {
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      const existing = await fetchPurchaseBySession(session.id)
      if (existing && existing.status !== 'fulfilled') {
        await supabase(`purchases?id=eq.${existing.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            status: 'failed',
            updated_at: new Date().toISOString(),
          }),
        })
      }
      return { handled: true, fulfilled: false, skipped: 'async_failed' }
    }
    return { handled: false }
  }

  const session = event.data.object as Stripe.Checkout.Session
  const result = await fulfillCheckoutSession(session)
  return { handled: true, ...result }
}

export async function resendPurchaseDownload(purchaseId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = purchaseId.trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: 'Invalid purchase id.' }
  }
  const rows = await supabase(
    `purchases?id=eq.${encodeURIComponent(id)}&select=id,email,status,product_key&limit=1`,
  )
  const purchase = rows?.[0] as { email?: string; product_key?: string } | undefined
  if (!purchase) return { ok: false, error: 'Purchase not found.' }
  if (purchase.product_key !== BOOK_PRODUCT_KEY) return { ok: false, error: 'Not a book purchase.' }
  const email = normalizeEmail(String(purchase.email || ''))
  if (!email) return { ok: false, error: 'Invalid buyer email.' }

  const downloadUrl = await resolveFulfillmentDownloadUrl()
  const site = env('SITE_URL').replace(/\/$/, '')
  const contacts = await supabase(
    `contacts?email=eq.${encodeURIComponent(email)}&select=unsubscribe_token&limit=1`,
  )
  const token = contacts?.[0]?.unsubscribe_token
  const unsubscribeUrl = token ? `${site}/api/contact-unsubscribe?token=${token}` : `${site}/privacy`
  const mail = bookPurchaseEmail({
    firstName: 'there',
    downloadUrl,
    unsubscribeUrl,
    postalAddress: env('POSTAL_ADDRESS'),
  })
  await sendEmail({ to: email, ...mail, unsubscribeUrl })
  return { ok: true }
}
