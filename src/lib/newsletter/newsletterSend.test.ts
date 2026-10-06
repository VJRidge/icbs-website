import { describe, expect, it } from 'vitest';
import {
  buildNewsletterIdempotencyKey,
  isEligibleNewsletterRecipient,
  newsletterModuleTouchesSubscribers,
  selectNewsletterRecipients,
  shouldSuppressFromProviderEvent,
} from './newsletterSend';

const ok = {
  id: 'c1',
  email: 'Ada@Example.com',
  marketing_ok: true,
  suppressed_at: null,
};

describe('isEligibleNewsletterRecipient', () => {
  it('requires marketing_ok and no suppression', () => {
    expect(isEligibleNewsletterRecipient(ok)).toBe(true);
    expect(isEligibleNewsletterRecipient({ ...ok, marketing_ok: false })).toBe(false);
    expect(
      isEligibleNewsletterRecipient({ ...ok, suppressed_at: '2026-10-05T00:00:00.000Z' }),
    ).toBe(false);
  });
});

describe('selectNewsletterRecipients', () => {
  it('dedupes by email and skips ineligible', () => {
    const rows = selectNewsletterRecipients([
      ok,
      { id: 'c2', email: 'ada@example.com', marketing_ok: true, suppressed_at: null },
      { id: 'c3', email: 'bob@example.com', marketing_ok: false, suppressed_at: null },
      { id: 'c4', email: 'cara@example.com', marketing_ok: true, suppressed_at: null },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['c1', 'c4']);
    expect(rows[0]?.email).toBe('ada@example.com');
    expect(buildNewsletterIdempotencyKey('issue-1', 'c1')).toBe('issue-1:c1');
    expect(newsletterModuleTouchesSubscribers()).toBe(false);
  });
});

describe('shouldSuppressFromProviderEvent', () => {
  it('suppresses bounce and complaint', () => {
    expect(shouldSuppressFromProviderEvent('email.bounced')).toBe(true);
    expect(shouldSuppressFromProviderEvent('email.complained')).toBe(true);
    expect(shouldSuppressFromProviderEvent('email.delivered')).toBe(false);
  });
});
