import { describe, expect, it } from 'vitest';
import {
  BOOK_PRODUCT_KEY,
  bookCheckoutConfigured,
  canFulfillCheckoutSession,
  checkoutMarketingOptIn,
  planBookPurchaseFulfillment,
  sessionMatchesBookProduct,
  stripeModuleRequiresLiveKeyAtBuild,
} from './bookCheckout';

describe('bookCheckoutConfigured', () => {
  it('requires secret, price id, and webhook secret for full stack', () => {
    expect(
      bookCheckoutConfigured({
        secretKey: 'sk_test_x',
        priceId: 'price_x',
        webhookSecret: 'whsec_x',
        downloadUrl: 'https://example.com/book.pdf',
      }),
    ).toBe(true);
    expect(
      bookCheckoutConfigured({
        secretKey: '',
        priceId: 'price_x',
        webhookSecret: 'whsec_x',
        downloadUrl: 'https://example.com/book.pdf',
      }),
    ).toBe(false);
  });
});

describe('canFulfillCheckoutSession', () => {
  it('fulfills only paid completed sessions', () => {
    expect(
      canFulfillCheckoutSession({
        paymentStatus: 'paid',
        mode: 'payment',
      }),
    ).toBe(true);
    expect(
      canFulfillCheckoutSession({
        paymentStatus: 'unpaid',
        mode: 'payment',
      }),
    ).toBe(false);
    expect(
      canFulfillCheckoutSession({
        paymentStatus: 'paid',
        mode: 'subscription',
      }),
    ).toBe(false);
  });
});

describe('sessionMatchesBookProduct', () => {
  it('requires book product_key or client_reference_id', () => {
    expect(sessionMatchesBookProduct({})).toBe(false);
    expect(sessionMatchesBookProduct({ productKey: BOOK_PRODUCT_KEY })).toBe(true);
    expect(sessionMatchesBookProduct({ clientReferenceId: BOOK_PRODUCT_KEY })).toBe(true);
    expect(sessionMatchesBookProduct({ productKey: 'other' })).toBe(false);
  });

  it('rejects mismatched line item price when expected price is set', () => {
    expect(
      sessionMatchesBookProduct({
        productKey: BOOK_PRODUCT_KEY,
        lineItemPriceIds: ['price_other'],
        expectedPriceId: 'price_book',
      }),
    ).toBe(false);
    expect(
      sessionMatchesBookProduct({
        productKey: BOOK_PRODUCT_KEY,
        lineItemPriceIds: ['price_book'],
        expectedPriceId: 'price_book',
      }),
    ).toBe(true);
  });
});

describe('planBookPurchaseFulfillment', () => {
  it('plans buyer tag + email when session is paid and not yet fulfilled', () => {
    const plan = planBookPurchaseFulfillment({
      sessionId: 'cs_test_1',
      email: 'Buyer@Example.com',
      paymentStatus: 'paid',
      amountTotal: 1700,
      currency: 'usd',
      alreadyFulfilled: false,
      downloadUrl: 'https://example.com/book.pdf',
      productKey: BOOK_PRODUCT_KEY,
      marketingOptIn: true,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.email).toBe('buyer@example.com');
    expect(plan.productKey).toBe(BOOK_PRODUCT_KEY);
    expect(plan.addBuyerTag).toBe(true);
    expect(plan.sendDownloadEmail).toBe(true);
    expect(plan.downloadUrl).toBe('https://example.com/book.pdf');
  });

  it('is idempotent when already fulfilled', () => {
    const plan = planBookPurchaseFulfillment({
      sessionId: 'cs_test_1',
      email: 'buyer@example.com',
      paymentStatus: 'paid',
      amountTotal: 1700,
      currency: 'usd',
      alreadyFulfilled: true,
      downloadUrl: 'https://example.com/book.pdf',
      clientReferenceId: BOOK_PRODUCT_KEY,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.alreadyFulfilled).toBe(true);
    expect(plan.sendDownloadEmail).toBe(false);
    expect(plan.addBuyerTag).toBe(false);
  });

  it('rejects unpaid, unbound product, or invalid email', () => {
    expect(
      planBookPurchaseFulfillment({
        sessionId: 'cs_test_1',
        email: 'buyer@example.com',
        paymentStatus: 'unpaid',
        amountTotal: 1700,
        currency: 'usd',
        alreadyFulfilled: false,
        downloadUrl: 'https://example.com/book.pdf',
        productKey: BOOK_PRODUCT_KEY,
      }).ok,
    ).toBe(false);
    expect(
      planBookPurchaseFulfillment({
        sessionId: 'cs_test_1',
        email: 'buyer@example.com',
        paymentStatus: 'paid',
        amountTotal: 1700,
        currency: 'usd',
        alreadyFulfilled: false,
        downloadUrl: 'https://example.com/book.pdf',
      }).ok,
    ).toBe(false);
    expect(
      planBookPurchaseFulfillment({
        sessionId: 'cs_test_1',
        email: 'bad',
        paymentStatus: 'paid',
        amountTotal: 1700,
        currency: 'usd',
        alreadyFulfilled: false,
        downloadUrl: 'https://example.com/book.pdf',
        productKey: BOOK_PRODUCT_KEY,
      }).ok,
    ).toBe(false);
  });

  it('does not add a kit mailing tag unless the buyer opted in', () => {
    const plan = planBookPurchaseFulfillment({
      sessionId: 'cs_test_1',
      email: 'buyer@example.com',
      paymentStatus: 'paid',
      amountTotal: 1700,
      currency: 'usd',
      alreadyFulfilled: false,
      downloadUrl: 'https://example.com/book.pdf',
      productKey: BOOK_PRODUCT_KEY,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.addBuyerTag).toBe(false);
    expect(plan.sendDownloadEmail).toBe(true);
    expect(checkoutMarketingOptIn(undefined)).toBe(false);
    expect(checkoutMarketingOptIn([{ key: 'kit_mail', dropdown: { value: 'yes' } }])).toBe(true);
    expect(checkoutMarketingOptIn([{ key: 'kit_mail', dropdown: { value: 'no' } }])).toBe(false);
  });
});

describe('stripeModuleRequiresLiveKeyAtBuild', () => {
  it('does not require a live key at build time', () => {
    expect(stripeModuleRequiresLiveKeyAtBuild()).toBe(false);
  });
});
