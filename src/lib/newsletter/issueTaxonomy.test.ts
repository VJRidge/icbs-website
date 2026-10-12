import { describe, expect, it } from 'vitest';
import { DEFAULT_NEWSLETTER_NAME, formatIssueCreatedAt, resolveIssueNumber } from './issueTaxonomy';

describe('issueTaxonomy', () => {
  it('keeps issue number when topic is unchanged', () => {
    expect(
      resolveIssueNumber({
        taxonomyId: 'ai',
        previousTaxonomyId: 'ai',
        previousIssueNumber: 7,
        nextIssueNumber: 8,
      }),
    ).toBe(7);
  });

  it('assigns next number when topic changes or is first set', () => {
    expect(
      resolveIssueNumber({
        taxonomyId: 'ai',
        previousTaxonomyId: 'crypto',
        previousIssueNumber: 3,
        nextIssueNumber: 1,
      }),
    ).toBe(1);
    expect(
      resolveIssueNumber({
        taxonomyId: 'ai',
        previousTaxonomyId: null,
        previousIssueNumber: null,
        nextIssueNumber: 4,
      }),
    ).toBe(4);
  });

  it('clears number when topic cleared', () => {
    expect(
      resolveIssueNumber({
        taxonomyId: null,
        previousTaxonomyId: 'ai',
        previousIssueNumber: 2,
        nextIssueNumber: 3,
      }),
    ).toBeNull();
  });

  it('formats created-at and keeps default name constant', () => {
    expect(DEFAULT_NEWSLETTER_NAME).toBe('New Name');
    expect(formatIssueCreatedAt('2026-10-06T14:30:00.000Z')).not.toBe('—');
    expect(formatIssueCreatedAt(null)).toBe('—');
  });
});
