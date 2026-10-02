import type { CmsEditorKind } from './cms/cmsEditorDraft';
import type { CmsShortLinkResourceType } from './cmsShortLinks';

export type ContentKind = 'page' | 'post';

export type ContentKindConfig = {
  kind: ContentKind;
  adminBase: string;
  singular: string;
  plural: string;
  draftKind: CmsEditorKind;
  shortLinkType: CmsShortLinkResourceType;
  /** Public path for a slug, e.g. `/about` or `/blog/my-post`. */
  publicPath: (slug: string) => string;
};

export const CONTENT_KINDS: Record<ContentKind, ContentKindConfig> = {
  page: {
    kind: 'page',
    adminBase: '/admin/pages',
    singular: 'Page',
    plural: 'Pages',
    draftKind: 'page',
    shortLinkType: 'site_page',
    publicPath: (slug) => `/${encodeURIComponent(slug)}`,
  },
  post: {
    kind: 'post',
    adminBase: '/admin/posts',
    singular: 'Post',
    plural: 'Blog posts',
    draftKind: 'blog',
    shortLinkType: 'blog_post',
    publicPath: (slug) => `/blog/${encodeURIComponent(slug)}`,
  },
};

export function kindConfig(kind: string): ContentKindConfig {
  return kind === 'post' ? CONTENT_KINDS.post : CONTENT_KINDS.page;
}

/** Taxonomy kind used for blog categories (`taxonomies.kind`). */
export const POST_CATEGORY_KIND = 'category';
