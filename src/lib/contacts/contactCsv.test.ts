import { describe, expect, it } from 'vitest';
import { contactsToCsv, parseContactsCsv } from './contactCsv';

describe('contactCsv', () => {
  it('parses headered CSV and skips bad emails', () => {
    const { rows, error } = parseContactsCsv(
      'email,first_name\nada@example.com,Ada\nbad\nbob@example.com,Bob\nada@example.com,Dup\n',
    );
    expect(error).toBeNull();
    expect(rows).toEqual([
      { email: 'ada@example.com', firstName: 'Ada', line: 2 },
      { email: 'bob@example.com', firstName: 'Bob', line: 4 },
    ]);
  });

  it('exports CSV with a header row', () => {
    const csv = contactsToCsv([
      {
        email: 'ada@example.com',
        first_name: 'Ada',
        marketing_ok: true,
        suppressed_at: null,
        first_consented_at: '2026-10-01T00:00:00.000Z',
        last_consented_at: null,
      },
    ]);
    expect(csv.split('\n')[0]).toContain('email,first_name');
    expect(csv).toContain('ada@example.com');
  });
});
