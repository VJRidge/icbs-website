import { describe, expect, it } from 'vitest';
import {
  contactModuleTouchesSubscribers,
  normalizeContactEmail,
  planContactUnsubscribe,
  planContactUpsertFromLead,
  type ContactRow,
} from './contactIdentity';

const baseExisting: ContactRow = {
  id: 'c1',
  email: 'ada@example.com',
  first_name: 'Ada',
  marketing_ok: true,
  suppressed_at: null,
  first_consented_at: '2026-01-01T00:00:00.000Z',
  last_consented_at: '2026-01-01T00:00:00.000Z',
  unsubscribe_token: '11111111-1111-1111-1111-111111111111',
};

describe('normalizeContactEmail', () => {
  it('lowercases and validates', () => {
    expect(normalizeContactEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(normalizeContactEmail('not-an-email')).toBeNull();
  });
});

describe('planContactUpsertFromLead', () => {
  it('plans a new contact with first consent', () => {
    const plan = planContactUpsertFromLead(null, {
      email: 'Ada@Example.com',
      firstName: 'Ada',
      consentText: 'I agree to receive updates.',
      consentedAt: '2026-10-05T12:00:00.000Z',
      formId: 'form-1',
      formVersion: 1,
      submissionId: 'sub-1',
    });
    expect('ok' in plan && plan.ok === false).toBe(false);
    if ('ok' in plan) return;
    expect(plan.isNew).toBe(true);
    expect(plan.email).toBe('ada@example.com');
    expect(plan.firstConsentedAt).toBe('2026-10-05T12:00:00.000Z');
    expect(plan.lastConsentedAt).toBe('2026-10-05T12:00:00.000Z');
    expect(plan.marketingOk).toBe(true);
    expect(plan.suppressedAt).toBeNull();
    expect(plan.consentEvent.eventType).toBe('granted');
  });

  it('locks first_consented_at and clears suppression on re-consent', () => {
    const suppressed: ContactRow = {
      ...baseExisting,
      marketing_ok: false,
      suppressed_at: '2026-02-01T00:00:00.000Z',
    };
    const plan = planContactUpsertFromLead(suppressed, {
      email: 'ada@example.com',
      firstName: 'Ada Lovelace',
      consentText: 'I agree again.',
      consentedAt: '2026-10-05T15:00:00.000Z',
      formId: 'form-1',
      formVersion: 2,
    });
    if ('ok' in plan) throw new Error('expected plan');
    expect(plan.isNew).toBe(false);
    expect(plan.firstConsentedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(plan.lastConsentedAt).toBe('2026-10-05T15:00:00.000Z');
    expect(plan.suppressedAt).toBeNull();
    expect(plan.marketingOk).toBe(true);
    expect(plan.keepUnsubscribeToken).toBe(baseExisting.unsubscribe_token);
    expect(plan.firstName).toBe('Ada Lovelace');
  });
});

describe('planContactUnsubscribe', () => {
  it('suppresses marketing without touching subscribers', () => {
    const plan = planContactUnsubscribe(baseExisting, '2026-10-05T16:00:00.000Z');
    expect(plan.marketingOk).toBe(false);
    expect(plan.suppressedAt).toBe('2026-10-05T16:00:00.000Z');
    expect(plan.consentEvent.eventType).toBe('suppressed');
    expect(contactModuleTouchesSubscribers()).toBe(false);
  });
});
