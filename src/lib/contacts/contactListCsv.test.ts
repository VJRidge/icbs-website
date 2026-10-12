import { describe, expect, it } from 'vitest';
import {
  dedupeContactListCsvRows,
  parseContactListCsv,
  planContactListCsvRow,
  summarizeContactListCsvPlans,
  type ContactForListImport,
} from './contactListCsv';

function existing(
  partial: Partial<ContactForListImport> & Pick<ContactForListImport, 'id' | 'email'>,
): ContactForListImport {
  return {
    first_name: null,
    marketing_ok: true,
    suppressed_at: null,
    ...partial,
  };
}

describe('parseContactListCsv', () => {
  it('parses headered email and first_name rows', () => {
    const rows = parseContactListCsv('email,first_name\nada@example.com,Ada\nbob@example.com,Bob\n');
    expect(rows).toEqual([
      { email: 'ada@example.com', firstName: 'Ada', line: 2 },
      { email: 'bob@example.com', firstName: 'Bob', line: 3 },
    ]);
  });

  it('accepts email-only CSV without header when first cell looks like email', () => {
    const rows = parseContactListCsv('ada@example.com\nbob@example.com\n');
    expect(rows.map((r) => r.email)).toEqual(['ada@example.com', 'bob@example.com']);
  });

  it('skips blank lines and normalizes emails', () => {
    const rows = parseContactListCsv('Email,First Name\n  Ada@Example.COM , Ada \n\n');
    expect(rows).toEqual([{ email: 'ada@example.com', firstName: 'Ada', line: 2 }]);
  });

  it('throws when more than 2000 data rows', () => {
    const lines = ['email', ...Array.from({ length: 2001 }, (_, i) => `u${i}@example.com`)];
    expect(() => parseContactListCsv(lines.join('\n'))).toThrow(/2000/);
  });
});

describe('dedupeContactListCsvRows', () => {
  it('keeps the last row per email', () => {
    const rows = dedupeContactListCsvRows([
      { email: 'ada@example.com', firstName: 'A1', line: 2 },
      { email: 'bob@example.com', firstName: 'B', line: 3 },
      { email: 'ada@example.com', firstName: 'A2', line: 4 },
    ]);
    expect(rows).toEqual([
      { email: 'bob@example.com', firstName: 'B', line: 3 },
      { email: 'ada@example.com', firstName: 'A2', line: 4 },
    ]);
  });
});

describe('planContactListCsvRow', () => {
  it('plans create when contact is new and consent confirmed', () => {
    const plan = planContactListCsvRow(
      { email: 'new@example.com', firstName: 'New', line: 2 },
      { existing: null, alreadyMember: false, confirmMarketingConsent: true },
    );
    expect(plan.action).toBe('create');
    expect(plan.marketingOk).toBe(true);
    expect(plan.addToList).toBe(true);
  });

  it('skips create without consent confirmation', () => {
    const plan = planContactListCsvRow(
      { email: 'new@example.com', firstName: null, line: 2 },
      { existing: null, alreadyMember: false, confirmMarketingConsent: false },
    );
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/consent/i);
  });

  it('never re-opts-in a suppressed contact', () => {
    const plan = planContactListCsvRow(
      { email: 'gone@example.com', firstName: null, line: 2 },
      {
        existing: existing({
          id: 'c1',
          email: 'gone@example.com',
          marketing_ok: false,
          suppressed_at: '2026-01-01T00:00:00.000Z',
        }),
        alreadyMember: false,
        confirmMarketingConsent: true,
      },
    );
    expect(plan.action).toBe('add_member');
    expect(plan.marketingOk).toBe(false);
    expect(plan.contactPatch).toBeNull();
  });

  it('plans add_member when already a contact and not yet on list', () => {
    const plan = planContactListCsvRow(
      { email: 'old@example.com', firstName: 'Ada', line: 2 },
      {
        existing: existing({ id: 'c2', email: 'old@example.com', first_name: null }),
        alreadyMember: false,
        confirmMarketingConsent: true,
      },
    );
    expect(plan.action).toBe('update');
    expect(plan.addToList).toBe(true);
    expect(plan.contactPatch?.firstName).toBe('Ada');
  });

  it('skips when already a member and nothing to update', () => {
    const plan = planContactListCsvRow(
      { email: 'old@example.com', firstName: 'Ada', line: 2 },
      {
        existing: existing({ id: 'c2', email: 'old@example.com', first_name: 'Ada' }),
        alreadyMember: true,
        confirmMarketingConsent: true,
      },
    );
    expect(plan.action).toBe('skip');
    expect(plan.addToList).toBe(false);
  });
});

describe('summarizeContactListCsvPlans', () => {
  it('counts actions', () => {
    const summary = summarizeContactListCsvPlans([
      {
        email: 'a@example.com',
        action: 'create',
        reason: '',
        firstName: null,
        marketingOk: true,
        addToList: true,
        existingContactId: null,
        contactPatch: { firstName: null, marketingOk: true },
        line: 2,
      },
      {
        email: 'b@example.com',
        action: 'skip',
        reason: 'already',
        firstName: null,
        marketingOk: true,
        addToList: false,
        existingContactId: 'c',
        contactPatch: null,
        line: 3,
      },
    ]);
    expect(summary).toEqual({
      total: 2,
      create: 1,
      update: 0,
      add_member: 0,
      skip: 1,
      wouldWrite: 1,
    });
  });
});
