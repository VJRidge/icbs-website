import { describe, expect, it } from 'vitest';
import {
  AUTHORITATIVE_DRAFT_FIELDS,
  isDueForPublish,
  LEGACY_UNUSED_DRAFT_FIELD,
  promoteScheduledPatch,
  schedulePublishPatch,
} from './schedulePublish';

describe('draft model', () => {
  it('treats content_blocks/body as working copy and ignores draft_document', () => {
    expect(AUTHORITATIVE_DRAFT_FIELDS).toEqual(['content_blocks', 'body']);
    expect(LEGACY_UNUSED_DRAFT_FIELD).toBe('draft_document');
  });
});

describe('schedulePublishPatch', () => {
  it('schedules never-published drafts without going live', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const patch = schedulePublishPatch({
      scheduledFor: future,
      pendingDocument: { format: 'blocks', blocks: [], html: '<p>Hi</p>' },
      currentStatus: 'draft',
      docVersion: 4,
    });
    expect(patch.status).toBe('scheduled');
    expect(patch.scheduled_for).toBe(future);
    expect(patch.published_document.html).toBe('<p>Hi</p>');
    expect(patch.doc_version).toBe(4);
  });

  it('keeps live pages published while attaching a pending snapshot', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const patch = schedulePublishPatch({
      scheduledFor: future,
      pendingDocument: { format: 'blocks', blocks: [], html: '<p>Next</p>' },
      currentStatus: 'published',
      currentPublishedDocument: { format: 'blocks', blocks: [], html: '<p>Live</p>' },
      docVersion: 3,
    });
    expect(patch.status).toBe('published');
    expect(patch.published_document.html).toBe('<p>Live</p>');
    expect((patch.published_document as { _schedule?: { pending_document?: { html?: string } } })._schedule?.pending_document?.html).toBe(
      '<p>Next</p>',
    );
  });

  it('rejects past schedule times', () => {
    expect(() =>
      schedulePublishPatch({
        scheduledFor: new Date(Date.now() - 1000).toISOString(),
        pendingDocument: { format: 'blocks', blocks: [], html: '' },
        currentStatus: 'draft',
        docVersion: 1,
      }),
    ).toThrow(/future/);
  });
});

describe('promoteScheduledPatch', () => {
  it('swaps a pending snapshot live and clears scheduled_for', () => {
    const patch = promoteScheduledPatch(
      {
        published_document: {
          format: 'blocks',
          blocks: [],
          html: '<p>Live</p>',
          _schedule: { pending_document: { format: 'blocks', blocks: [], html: '<p>Next</p>' } },
        },
      },
      new Date('2026-10-05T15:00:00Z'),
    );
    expect(patch.status).toBe('published');
    expect(patch.scheduled_for).toBeNull();
    expect(patch.published_at).toBe('2026-10-05T15:00:00.000Z');
    expect(patch.published_document.html).toBe('<p>Next</p>');
    expect(patch.published_document).not.toHaveProperty('_schedule');
  });
});

describe('isDueForPublish', () => {
  it('promotes scheduled or published rows whose scheduled_for has arrived', () => {
    const now = new Date('2026-10-05T12:00:00Z');
    expect(
      isDueForPublish({ status: 'scheduled', scheduledFor: '2026-10-05T11:00:00Z', now }),
    ).toBe(true);
    expect(
      isDueForPublish({ status: 'published', scheduledFor: '2026-10-05T11:00:00Z', now }),
    ).toBe(true);
    expect(
      isDueForPublish({ status: 'scheduled', scheduledFor: '2026-10-05T13:00:00Z', now }),
    ).toBe(false);
    expect(isDueForPublish({ status: 'draft', scheduledFor: '2026-10-05T11:00:00Z', now })).toBe(false);
  });
});
