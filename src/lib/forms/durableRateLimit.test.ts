import { describe, expect, it } from 'vitest';
import { rateLimitWindowStart } from './durableRateLimit';

describe('rateLimitWindowStart', () => {
  it('floors timestamps into fixed windows', () => {
    const at = new Date('2026-10-05T12:07:30.000Z').getTime();
    const start = rateLimitWindowStart(at, 900);
    expect(new Date(start).toISOString()).toBe('2026-10-05T12:00:00.000Z');
  });
});
