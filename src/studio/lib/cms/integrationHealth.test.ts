import { describe, expect, it } from 'vitest';
import { clientStorageCheck, mergeHealthReports, summarizeEnvPresence } from './integrationHealth';

describe('summarizeEnvPresence', () => {
  it('marks adapters ok only when required env flags are present', () => {
    const report = summarizeEnvPresence({
      supabaseUrl: true,
      serviceRole: true,
      resendKey: false,
      emailFrom: true,
      siteUrl: true,
      cronSecret: true,
      now: '2026-10-05T12:00:00.000Z',
    });
    expect(report.checks.find((c) => c.id === 'supabase')?.status).toBe('ok');
    expect(report.checks.find((c) => c.id === 'email')?.status).toBe('missing');
    expect(JSON.stringify(report)).not.toMatch(/sk_|re_/);
  });
});

describe('mergeHealthReports', () => {
  it('appends the client storage probe without inventing metrics', () => {
    const server = summarizeEnvPresence({
      supabaseUrl: true,
      serviceRole: true,
      resendKey: true,
      emailFrom: true,
      siteUrl: true,
      cronSecret: true,
      now: '2026-10-05T12:00:00.000Z',
    });
    const merged = mergeHealthReports(
      server,
      clientStorageCheck({ ok: false, errorMessage: 'Bucket missing', now: '2026-10-05T12:00:00.000Z' }),
    );
    expect(merged.checks).toHaveLength(4);
    expect(merged.checks.find((c) => c.id === 'storage')?.status).toBe('error');
  });
});
