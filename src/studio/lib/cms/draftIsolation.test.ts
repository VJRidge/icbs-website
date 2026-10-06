import { describe, expect, it } from 'vitest';
import {
  assertAnonymousContentsSelectAllowed,
  CONTENTS_WORKING_COLUMNS,
  isEligiblePublishedSnapshot,
  publishedProjectionExposesWorkingColumn,
  PUBLISHED_CONTENTS_PUBLIC_COLUMNS,
} from './draftIsolation';

describe('published_contents projection', () => {
  it('never lists working draft columns as public fields', () => {
    for (const column of CONTENTS_WORKING_COLUMNS) {
      expect(PUBLISHED_CONTENTS_PUBLIC_COLUMNS).not.toContain(column);
      expect(publishedProjectionExposesWorkingColumn(column)).toBe(false);
    }
  });

  it('rejects anonymous selects that ask for working columns', () => {
    expect(() => assertAnonymousContentsSelectAllowed(['title', 'slug'])).not.toThrow();
    expect(() => assertAnonymousContentsSelectAllowed(['body'])).toThrow(/body/);
    expect(() => assertAnonymousContentsSelectAllowed(['draft_document'])).toThrow(/draft_document/);
  });
});

describe('isEligiblePublishedSnapshot', () => {
  it('requires published status and a frozen document', () => {
    expect(
      isEligiblePublishedSnapshot({
        status: 'draft',
        publishedDocument: { _meta: { title: 'x' } },
      }),
    ).toBe(false);
    expect(isEligiblePublishedSnapshot({ status: 'published', publishedDocument: null })).toBe(false);
  });

  it('hides future published_at values', () => {
    const now = new Date('2026-10-05T12:00:00Z');
    expect(
      isEligiblePublishedSnapshot({
        status: 'published',
        publishedDocument: { _meta: { published_at: '2026-10-06T12:00:00Z' } },
        now,
      }),
    ).toBe(false);
    expect(
      isEligiblePublishedSnapshot({
        status: 'published',
        publishedDocument: { _meta: { published_at: '2026-10-04T12:00:00Z' } },
        now,
      }),
    ).toBe(true);
  });
});
