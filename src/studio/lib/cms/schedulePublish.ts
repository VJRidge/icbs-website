import type { PublishedPageDocument } from '../../types';

export const AUTHORITATIVE_DRAFT_FIELDS = ['content_blocks', 'body'] as const;
export const AUTHORITATIVE_LIVE_FIELD = 'published_document' as const;
export const LEGACY_UNUSED_DRAFT_FIELD = 'draft_document' as const;

/**
 * Schedule a future go-live without taking a published page offline.
 * - Never-published: status becomes `scheduled` with a frozen snapshot.
 * - Already published: stay `published` (live snapshot unchanged); store the
 *   pending snapshot under `published_document._schedule.pending_document` and
 *   set `scheduled_for`. Cron promotes by swapping the pending snapshot live.
 */
export function schedulePublishPatch(args: {
  scheduledFor: string;
  pendingDocument: PublishedPageDocument;
  currentStatus: string;
  currentPublishedDocument?: PublishedPageDocument | null;
  publishedAt?: string | null;
  docVersion: number;
}): {
  status: 'scheduled' | 'published';
  scheduled_for: string;
  published_document: PublishedPageDocument;
  published_at: string | null;
  doc_version: number;
} {
  const when = new Date(args.scheduledFor);
  if (Number.isNaN(when.getTime())) {
    throw new Error('Choose a valid schedule date and time.');
  }
  if (when.getTime() <= Date.now()) {
    throw new Error('Schedule time must be in the future.');
  }

  if (args.currentStatus === 'published' && args.currentPublishedDocument) {
    const live = {
      ...args.currentPublishedDocument,
      _schedule: {
        pending_document: args.pendingDocument,
        scheduled_for: when.toISOString(),
      },
    } as PublishedPageDocument & { _schedule?: unknown };
    return {
      status: 'published',
      scheduled_for: when.toISOString(),
      published_document: live,
      published_at: args.publishedAt ?? args.currentPublishedDocument.published_at ?? null,
      doc_version: args.docVersion,
    };
  }

  return {
    status: 'scheduled',
    scheduled_for: when.toISOString(),
    published_document: args.pendingDocument,
    published_at: args.publishedAt ?? when.toISOString(),
    doc_version: args.docVersion,
  };
}

export function promoteScheduledPatch(
  row: {
    published_document?: (PublishedPageDocument & { _schedule?: { pending_document?: PublishedPageDocument } }) | null;
    published_at?: string | null;
  },
  now = new Date(),
): {
  status: 'published';
  scheduled_for: null;
  published_at: string;
  published_document: PublishedPageDocument;
} {
  const pending = row.published_document?._schedule?.pending_document;
  const nextDoc = pending
    ? { ...pending }
    : row.published_document
      ? (() => {
          const { _schedule: _drop, ...rest } = row.published_document as PublishedPageDocument & {
            _schedule?: unknown;
          };
          void _drop;
          return rest;
        })()
      : { format: 'blocks' as const, blocks: [], html: '' };

  return {
    status: 'published',
    scheduled_for: null,
    published_at: now.toISOString(),
    published_document: nextDoc,
  };
}

export function isDueForPublish(args: {
  status: string;
  scheduledFor: string | null | undefined;
  now?: Date;
}): boolean {
  if (!args.scheduledFor) return false;
  if (args.status !== 'scheduled' && args.status !== 'published') return false;
  const due = new Date(args.scheduledFor);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() <= (args.now ?? new Date()).getTime();
}
