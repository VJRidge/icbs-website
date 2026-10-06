/**
 * Draft isolation rules for the `published_contents` public projection.
 * Anonymous clients must never select working columns from `contents`.
 */

export const PUBLISHED_CONTENTS_PUBLIC_COLUMNS = [
  'id',
  'kind',
  'title',
  'slug',
  'status',
  'seo_title',
  'seo_description',
  'layout',
  'published_at',
  'published_document',
  'updated_at',
  'taxonomies',
] as const;

export const CONTENTS_WORKING_COLUMNS = [
  'body',
  'content_blocks',
  'draft_document',
  'author_id',
  'scheduled_for',
  'doc_version',
  'featured_image_url',
  'featured_image_alt',
  'excerpt',
  'structured_fields',
] as const;

export function publishedProjectionExposesWorkingColumn(column: string): boolean {
  return (PUBLISHED_CONTENTS_PUBLIC_COLUMNS as readonly string[]).includes(column) === false
    ? false
    : (CONTENTS_WORKING_COLUMNS as readonly string[]).includes(column);
}

export function assertAnonymousContentsSelectAllowed(columns: string[]): void {
  for (const column of columns) {
    if ((CONTENTS_WORKING_COLUMNS as readonly string[]).includes(column)) {
      throw new Error(`Anonymous clients must not select working column: ${column}`);
    }
  }
}

export type PublicSnapshotMeta = {
  kind?: string;
  title?: string;
  slug?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  layout?: string | null;
  published_at?: string | null;
  published_updated_at?: string;
  taxonomies?: unknown[];
};

export function isEligiblePublishedSnapshot(args: {
  status: string;
  publishedDocument: { _meta?: PublicSnapshotMeta } | null | undefined;
  now?: Date;
}): boolean {
  if (args.status !== 'published') return false;
  if (!args.publishedDocument) return false;
  const publishedAt = args.publishedDocument._meta?.published_at;
  if (!publishedAt) return true;
  const when = args.now ?? new Date();
  return new Date(publishedAt).getTime() <= when.getTime();
}
