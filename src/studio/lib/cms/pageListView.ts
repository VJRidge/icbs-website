import { parseBlogBlocks } from '../blog/useBlogEditorStore';
import type { CmsPreviewPayload } from '../cmsPreview';
import type { PublisherSitePage } from '../../types';

/** Live public URL vs local preview. Drafts have no public document yet. */
export function pageListViewIsLive(status: string, managed: boolean): boolean {
  return managed || status === 'published';
}

export function previewPayloadFromListRow(row: PublisherSitePage, kind: 'page' | 'post'): CmsPreviewPayload {
  const blocks = parseBlogBlocks(row.content_blocks);
  return {
    title: row.title?.trim() || 'Untitled',
    document: {
      format: 'blocks',
      blocks,
      html: row.body || '',
      layout: row.layout === 'landing' ? 'landing' : 'article',
      title: row.title,
      excerpt: row.excerpt ?? null,
      featured_image_url: row.featured_image_url ?? null,
      featured_image_alt: row.featured_image_alt ?? null,
    },
    post:
      kind === 'post'
        ? {
            publishedAt: row.published_at,
          }
        : undefined,
  };
}
