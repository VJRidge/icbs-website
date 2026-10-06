import { collectBuilderA11yIssues } from '../../lib/blog/builderA11yIssues';

export const STALE_TOOL_REVIEW_DAYS = 90;

export type ContentHealthRecord = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  status: string;
  content_blocks?: unknown[] | null;
  structured_fields?: Record<string, unknown> | null;
  content_type_key?: string | null;
  updated_at?: string | null;
};

export type MediaUsageProbe = {
  mediaId: string;
  title?: string | null;
  path?: string | null;
  usageCount: number;
};

export type ContentHealthAlert = {
  id: string;
  severity: 'error' | 'warning';
  code: 'missing_alt' | 'stale_verification' | 'unused_media' | 'empty_draft' | 'broken_internal_link';
  title: string;
  detail: string;
  href: string;
  recordId?: string;
};

export function editorHrefForRecord(row: Pick<ContentHealthRecord, 'id' | 'kind' | 'content_type_key'>): string {
  if (row.kind === 'post') return `/admin/posts/${row.id}`;
  if (row.kind === 'custom' && row.content_type_key) return `/admin/content/${row.content_type_key}/${row.id}`;
  return `/admin/pages/${row.id}`;
}

function daysBetween(isoDate: string, now: Date): number {
  const then = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function evaluateContentHealth(args: {
  records: ContentHealthRecord[];
  media?: MediaUsageProbe[];
  now?: Date;
  staleAfterDays?: number;
}): ContentHealthAlert[] {
  const now = args.now ?? new Date();
  const staleAfter = args.staleAfterDays ?? STALE_TOOL_REVIEW_DAYS;
  const alerts: ContentHealthAlert[] = [];

  for (const row of args.records) {
    if (row.status === 'trash') continue;
    const href = editorHrefForRecord(row);

    if (Array.isArray(row.content_blocks) && row.content_blocks.length > 0) {
      const a11y = collectBuilderA11yIssues(row.content_blocks).filter((i) => i.code === 'missing_alt');
      if (a11y.length > 0) {
        alerts.push({
          id: `alt-${row.id}`,
          severity: 'error',
          code: 'missing_alt',
          title: row.title || 'Untitled',
          detail: `${a11y.length} image(s) missing alt text. Open the record and add descriptive alt text.`,
          href,
          recordId: row.id,
        });
      }
    }

    if (
      (row.content_type_key === 'tool_review' || row.kind === 'custom') &&
      row.structured_fields &&
      typeof row.structured_fields.pricing_checked_date === 'string'
    ) {
      const checked = row.structured_fields.pricing_checked_date;
      const age = daysBetween(checked, now);
      if (age >= staleAfter) {
        alerts.push({
          id: `stale-${row.id}`,
          severity: 'warning',
          code: 'stale_verification',
          title: row.title || 'Untitled review',
          detail: `Pricing last checked ${checked} (${age} days ago). Re-verify pricing and update the date.`,
          href,
          recordId: row.id,
        });
      }
    }

    const emptyDraft =
      row.status === 'draft' &&
      !(row.title || '').trim() &&
      (!Array.isArray(row.content_blocks) || row.content_blocks.length === 0);
    if (emptyDraft) {
      alerts.push({
        id: `empty-${row.id}`,
        severity: 'warning',
        code: 'empty_draft',
        title: 'Untitled draft',
        detail: 'This draft has no title and no blocks. Finish it or move it to trash.',
        href,
        recordId: row.id,
      });
    }
  }

  for (const media of args.media ?? []) {
    if (media.usageCount > 0) continue;
    alerts.push({
      id: `media-${media.mediaId}`,
      severity: 'warning',
      code: 'unused_media',
      title: media.title || media.path || media.mediaId,
      detail: 'This media file has no recorded content usage. Confirm it is needed or remove it safely.',
      href: '/admin/media',
      recordId: media.mediaId,
    });
  }

  return alerts;
}
