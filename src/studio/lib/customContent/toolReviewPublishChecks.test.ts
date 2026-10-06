import { describe, expect, it } from 'vitest';
import { collectToolReviewPublishChecks } from './toolReviewPublishChecks';

describe('collectToolReviewPublishChecks', () => {
  const now = new Date('2026-10-05T12:00:00Z');

  it('passes a complete fresh review with disclosure affirmed', () => {
    const checks = collectToolReviewPublishChecks({
      title: 'Cursor',
      slug: 'cursor',
      fields: {
        pricing_checked_date: '2026-09-01',
        platform_tested: 'Web',
        what_was_tried: 'Built a sample app.',
        limitations: 'No offline mode.',
        affiliate_disclosure: true,
        verdict: 'Useful.',
      },
      now,
    });
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('flags missing required fields, unconfirmed disclosure, and stale verification', () => {
    const checks = collectToolReviewPublishChecks({
      title: '',
      slug: '',
      fields: {
        pricing_checked_date: '2026-01-01',
        platform_tested: '',
        affiliate_disclosure: false,
        verdict: 'Ok',
      },
      now,
      staleAfterDays: 90,
    });
    expect(checks.filter((c) => !c.ok).map((c) => c.code)).toEqual(
      expect.arrayContaining([
        'title',
        'platform_tested',
        'what_was_tried',
        'limitations',
        'affiliate_disclosure',
        'stale_verification',
      ]),
    );
  });

  it('blocks publish when any check fails', () => {
    const checks = collectToolReviewPublishChecks({
      title: 'X',
      slug: 'x',
      fields: { affiliate_disclosure: false },
      now,
    });
    expect(checks.some((c) => !c.ok)).toBe(true);
  });
});
