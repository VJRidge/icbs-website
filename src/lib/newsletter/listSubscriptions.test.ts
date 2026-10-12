import { describe, expect, it } from 'vitest';
import {
  isEligibleListRecipient,
  normalizeSubscriptionStatus,
  selectEligibleListRecipients,
} from './listSubscriptions';

describe('listSubscriptions', () => {
  it('requires subscribed + marketing_ok + not suppressed', () => {
    expect(
      isEligibleListRecipient({
        contactId: '1',
        email: 'a@example.com',
        status: 'subscribed',
        marketingOk: true,
        suppressedAt: null,
      }),
    ).toBe(true);
    expect(
      isEligibleListRecipient({
        contactId: '1',
        email: 'a@example.com',
        status: 'unsubscribed',
        marketingOk: true,
        suppressedAt: null,
      }),
    ).toBe(false);
    expect(
      isEligibleListRecipient({
        contactId: '1',
        email: 'a@example.com',
        status: 'subscribed',
        marketingOk: false,
        suppressedAt: null,
      }),
    ).toBe(false);
    expect(
      isEligibleListRecipient({
        contactId: '1',
        email: 'a@example.com',
        status: 'subscribed',
        marketingOk: true,
        suppressedAt: '2026-01-01T00:00:00Z',
      }),
    ).toBe(false);
  });

  it('dedupes by email and keeps one contact per address', () => {
    const out = selectEligibleListRecipients([
      {
        contactId: 'a',
        email: 'Same@Example.com',
        status: 'subscribed',
        marketingOk: true,
        suppressedAt: null,
      },
      {
        contactId: 'b',
        email: 'same@example.com',
        status: 'subscribed',
        marketingOk: true,
        suppressedAt: null,
      },
      {
        contactId: 'c',
        email: 'other@example.com',
        status: 'pending',
        marketingOk: true,
        suppressedAt: null,
      },
    ]);
    expect(out).toEqual([{ id: 'a', email: 'same@example.com' }]);
  });

  it('normalizes unknown status to unsubscribed (fail closed)', () => {
    expect(normalizeSubscriptionStatus('subscribed')).toBe('subscribed');
    expect(normalizeSubscriptionStatus('weird')).toBe('unsubscribed');
  });
});
