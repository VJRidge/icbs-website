import { describe, expect, it } from 'vitest';
import {
  IMPORT_SOURCE_KIT_SUBSCRIBERS,
  importModuleMutatesSubscribers,
  summarizeImportPlans,
  planKitSubscriberImportRow,
  type ContactForImport,
  type KitSubscriberSource,
} from './kitSubscriberImport';

function sub(partial: Partial<KitSubscriberSource> & Pick<KitSubscriberSource, 'id' | 'email'>): KitSubscriberSource {
  return {
    first_name: null,
    consent_at: '2026-01-01T00:00:00.000Z',
    unsubscribed_at: null,
    ...partial,
  };
}

function contact(
  partial: Partial<ContactForImport> & Pick<ContactForImport, 'id' | 'email'>,
): ContactForImport {
  return {
    first_name: null,
    marketing_ok: true,
    suppressed_at: null,
    first_consented_at: '2026-01-01T00:00:00.000Z',
    last_consented_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('planKitSubscriberImportRow', () => {
  it('plans create for a new active subscriber', () => {
    const plan = planKitSubscriberImportRow(sub({ id: 's1', email: 'New@Example.com', first_name: 'Ada' }), {
      existing: null,
      alreadyApplied: false,
    });
    expect(plan.action).toBe('create');
    expect(plan.email).toBe('new@example.com');
    expect(plan.contactPatch?.marketingOk).toBe(true);
    expect(plan.contactPatch?.suppressedAt).toBeNull();
    expect(plan.consentEvent?.eventType).toBe('granted');
    expect(plan.idempotencyKey).toBe(`${IMPORT_SOURCE_KIT_SUBSCRIBERS}:s1`);
  });

  it('plans suppress create when kit row is unsubscribed and no contact exists', () => {
    const plan = planKitSubscriberImportRow(
      sub({ id: 's2', email: 'gone@example.com', unsubscribed_at: '2026-02-01T00:00:00.000Z' }),
      { existing: null, alreadyApplied: false },
    );
    expect(plan.action).toBe('suppress');
    expect(plan.contactPatch?.marketingOk).toBe(false);
    expect(plan.contactPatch?.suppressedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(plan.consentEvent?.eventType).toBe('suppressed');
  });

  it('never re-opts-in a suppressed contact from an active kit row', () => {
    const plan = planKitSubscriberImportRow(sub({ id: 's3', email: 'keep@example.com' }), {
      existing: contact({
        id: 'c1',
        email: 'keep@example.com',
        marketing_ok: false,
        suppressed_at: '2026-03-01T00:00:00.000Z',
      }),
      alreadyApplied: false,
    });
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/suppression/i);
    expect(plan.contactPatch).toBeNull();
  });

  it('suppresses an existing marketing-ok contact when kit row is unsubscribed', () => {
    const plan = planKitSubscriberImportRow(
      sub({ id: 's4', email: 'was@example.com', unsubscribed_at: '2026-04-01T00:00:00.000Z' }),
      {
        existing: contact({ id: 'c2', email: 'was@example.com', marketing_ok: true }),
        alreadyApplied: false,
      },
    );
    expect(plan.action).toBe('suppress');
    expect(plan.contactPatch?.marketingOk).toBe(false);
    expect(plan.consentEvent?.eventType).toBe('suppressed');
  });

  it('skips when source key was already applied (idempotent)', () => {
    const plan = planKitSubscriberImportRow(sub({ id: 's5', email: 'again@example.com' }), {
      existing: contact({ id: 'c3', email: 'again@example.com' }),
      alreadyApplied: true,
    });
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/already applied/i);
    expect(plan.contactPatch).toBeNull();
  });

  it('skips invalid emails', () => {
    const plan = planKitSubscriberImportRow(sub({ id: 's6', email: 'not-an-email' }), {
      existing: null,
      alreadyApplied: false,
    });
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/invalid/i);
  });

  it('updates first name when contact exists and marketing stays ok', () => {
    const plan = planKitSubscriberImportRow(
      sub({ id: 's7', email: 'ada@example.com', first_name: 'Ada' }),
      {
        existing: contact({ id: 'c4', email: 'ada@example.com', first_name: null, marketing_ok: true }),
        alreadyApplied: false,
      },
    );
    expect(plan.action).toBe('update');
    expect(plan.contactPatch?.firstName).toBe('Ada');
    expect(plan.contactPatch?.marketingOk).toBe(true);
  });

  it('skips no-op updates', () => {
    const plan = planKitSubscriberImportRow(
      sub({ id: 's8', email: 'same@example.com', first_name: 'Sam' }),
      {
        existing: contact({
          id: 'c5',
          email: 'same@example.com',
          first_name: 'Sam',
          marketing_ok: true,
        }),
        alreadyApplied: false,
      },
    );
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/no change/i);
  });
});

describe('importModuleMutatesSubscribers', () => {
  it('never mutates kit subscribers', () => {
    expect(importModuleMutatesSubscribers()).toBe(false);
  });
});

describe('summarizeImportPlans', () => {
  it('counts actions and never invents totals', () => {
    const summary = summarizeImportPlans([
      planKitSubscriberImportRow(sub({ id: 'a', email: 'a@example.com' }), {
        existing: null,
        alreadyApplied: false,
      }),
      planKitSubscriberImportRow(sub({ id: 'b', email: 'bad' }), {
        existing: null,
        alreadyApplied: false,
      }),
      planKitSubscriberImportRow(
        sub({ id: 'c', email: 'c@example.com', unsubscribed_at: '2026-01-02T00:00:00.000Z' }),
        { existing: null, alreadyApplied: false },
      ),
    ]);
    expect(summary).toEqual({
      total: 3,
      create: 1,
      update: 0,
      suppress: 1,
      skip: 1,
      wouldWrite: 2,
    });
  });
});
