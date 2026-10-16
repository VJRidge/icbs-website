/** Pure Stripe book-checkout helpers. No network I/O. */

export const BOOK_PRODUCT_KEY = 'i_call_bs_book' as const;

export type BookCheckoutEnv = {
  secretKey: string;
  priceId: string;
  webhookSecret: string;
  downloadUrl: string;
};

export type CheckoutFulfillInput = {
  sessionId: string;
  email: string;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  alreadyFulfilled: boolean;
  downloadUrl: string;
  /** Session metadata.product_key from Checkout create. */
  productKey?: string | null;
  /** client_reference_id from Checkout create. */
  clientReferenceId?: string | null;
  /** line_items[].price.id when expanded; optional extra bind. */
  lineItemPriceIds?: string[] | null;
  /** Expected STRIPE_BOOK_PRICE_ID when enforcing price bind. */
  expectedPriceId?: string | null;
  /** True only if the buyer opted in to kit/marketing mail at Checkout. */
  marketingOptIn?: boolean;
};

export type CheckoutFulfillPlan =
  | {
      ok: true;
      email: string;
      productKey: typeof BOOK_PRODUCT_KEY;
      sessionId: string;
      amountTotal: number | null;
      currency: string | null;
      alreadyFulfilled: boolean;
      addBuyerTag: boolean;
      sendDownloadEmail: boolean;
      downloadUrl: string;
    }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function bookCheckoutConfigured(env: BookCheckoutEnv): boolean {
  return Boolean(
    env.secretKey.trim() &&
      env.priceId.trim() &&
      env.webhookSecret.trim() &&
      env.downloadUrl.trim(),
  );
}

/** Checkout Session create only needs secret + price (+ download for later fulfill). */
export function bookCheckoutCreateConfigured(env: Pick<BookCheckoutEnv, 'secretKey' | 'priceId'>): boolean {
  return Boolean(env.secretKey.trim() && env.priceId.trim());
}

export function canFulfillCheckoutSession(opts: {
  paymentStatus: string;
  mode?: string | null;
}): boolean {
  if (opts.mode && opts.mode !== 'payment') return false;
  return opts.paymentStatus === 'paid' || opts.paymentStatus === 'no_payment_required';
}

/**
 * Require book product binding so other Checkout products on the same Stripe
 * account cannot trigger book fulfillment via the shared webhook.
 */
export function sessionMatchesBookProduct(opts: {
  productKey?: string | null;
  clientReferenceId?: string | null;
  lineItemPriceIds?: string[] | null;
  expectedPriceId?: string | null;
}): boolean {
  const meta = (opts.productKey || '').trim();
  const ref = (opts.clientReferenceId || '').trim();
  if (meta && meta !== BOOK_PRODUCT_KEY) return false;
  if (ref && ref !== BOOK_PRODUCT_KEY) return false;

  const expectedPrice = (opts.expectedPriceId || '').trim();
  const prices = (opts.lineItemPriceIds || []).map((p) => String(p || '').trim()).filter(Boolean);
  if (expectedPrice && prices.length > 0 && !prices.includes(expectedPrice)) {
    return false;
  }

  return meta === BOOK_PRODUCT_KEY || ref === BOOK_PRODUCT_KEY;
}

const KIT_MAIL_FIELD = 'kit_mail'

/** Stripe Checkout custom field `kit_mail`: checkbox or dropdown yes/no. Default no. */
export function checkoutMarketingOptIn(customFields: unknown): boolean {
  if (!Array.isArray(customFields)) return false
  for (const row of customFields) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (String(o.key ?? '') !== KIT_MAIL_FIELD) continue
    const box = o.checkbox && typeof o.checkbox === 'object' ? (o.checkbox as { value?: unknown }).value : undefined
    if (box === true || box === 'true' || box === 'yes') return true
    const drop = o.dropdown && typeof o.dropdown === 'object' ? (o.dropdown as { value?: unknown }).value : undefined
    return String(drop ?? '').trim().toLowerCase() === 'yes'
  }
  return false
}

export function normalizeCheckoutEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200);
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

export function planBookPurchaseFulfillment(input: CheckoutFulfillInput): CheckoutFulfillPlan {
  if (!canFulfillCheckoutSession({ paymentStatus: input.paymentStatus, mode: 'payment' })) {
    return { ok: false, error: 'Session is not paid.' };
  }
  if (
    !sessionMatchesBookProduct({
      productKey: input.productKey,
      clientReferenceId: input.clientReferenceId,
      lineItemPriceIds: input.lineItemPriceIds,
      expectedPriceId: input.expectedPriceId,
    })
  ) {
    return { ok: false, error: 'Session is not a book purchase.' };
  }
  const email = normalizeCheckoutEmail(input.email);
  if (!email) return { ok: false, error: 'Invalid buyer email.' };
  if (!input.sessionId.trim()) return { ok: false, error: 'Missing session id.' };
  if (!input.downloadUrl.trim()) return { ok: false, error: 'Missing book download URL.' };

  if (input.alreadyFulfilled) {
    return {
      ok: true,
      email,
      productKey: BOOK_PRODUCT_KEY,
      sessionId: input.sessionId,
      amountTotal: input.amountTotal,
      currency: input.currency,
      alreadyFulfilled: true,
      addBuyerTag: false,
      sendDownloadEmail: false,
      downloadUrl: input.downloadUrl,
    };
  }

  return {
    ok: true,
    email,
    productKey: BOOK_PRODUCT_KEY,
    sessionId: input.sessionId,
    amountTotal: input.amountTotal,
    currency: input.currency,
    alreadyFulfilled: false,
    addBuyerTag: Boolean(input.marketingOptIn),
    sendDownloadEmail: true,
    downloadUrl: input.downloadUrl,
  };
}

/** Keys are runtime env only — builds must not require them. */
export function stripeModuleRequiresLiveKeyAtBuild(): boolean {
  return false;
}
