import {
  applyPublishedSeoHead,
  buildPublishedSeoHead,
  publicSiteUrl,
} from '../lib/discovery/publishedSeo';

type DocFields = {
  featured_image_url?: unknown;
  published_at?: unknown;
  excerpt?: unknown;
};

function readDoc(document: unknown): DocFields {
  if (!document || typeof document !== 'object') return {};
  return document as DocFields;
}

/** Apply published-only SEO head tags; returns cleanup for the effect. */
export function applyPublicContentSeo(args: {
  path: string;
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedDocument?: unknown;
  kind: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
}): () => void {
  const doc = readDoc(args.publishedDocument);
  const featured =
    typeof doc.featured_image_url === 'string' ? doc.featured_image_url : null;
  const publishedAt =
    args.publishedAt ||
    (typeof doc.published_at === 'string' ? doc.published_at : null);
  const description =
    args.seoDescription ||
    (typeof doc.excerpt === 'string' ? doc.excerpt : null);

  const head = buildPublishedSeoHead({
    siteUrl: publicSiteUrl(),
    path: args.path,
    title: args.title,
    seoTitle: args.seoTitle,
    seoDescription: description,
    featuredImageUrl: featured,
    publishedAt,
    updatedAt: args.updatedAt,
    kind: args.kind,
  });

  return applyPublishedSeoHead(head);
}
