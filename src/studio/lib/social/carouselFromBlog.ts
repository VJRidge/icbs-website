import { serializeBlogBlocksToHtml } from '../blog/blogBlocksSerialize';
import type { BlogBlock } from '../blog/blogBlockTypes';

export const CAROUSEL_FROM_POST_KEY = 'vj.carousel.fromPost';

export type CarouselFromPostPayload = {
  articleText: string;
  sourceLabel: string;
  returnTo: string;
  postId: string | null;
  autoGenerate: boolean;
  featuredImageUrl: string | null;
};

export function stripHtmlForCarousel(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildCarouselArticleText(input: {
  title: string;
  excerpt?: string;
  bodyHtml: string;
  publicUrl?: string;
}): string {
  const parts: string[] = [];
  const title = input.title.trim();
  const excerpt = (input.excerpt ?? '').trim();
  const body = stripHtmlForCarousel(input.bodyHtml);
  if (title) parts.push(title);
  if (excerpt) parts.push(excerpt);
  if (body) parts.push(body);
  if (input.publicUrl?.trim()) parts.push(`Read more: ${input.publicUrl.trim()}`);
  return parts.join('\n\n');
}

export function buildCarouselArticleFromPost(input: {
  title: string;
  excerpt: string;
  body: string;
  contentMode: 'html' | 'blocks';
  blocks: BlogBlock[];
  slug?: string;
}): string {
  const bodyHtml =
    input.contentMode === 'blocks' && input.blocks.length > 0
      ? serializeBlogBlocksToHtml(input.blocks)
      : input.body;
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const slug = input.slug?.trim();
  const publicUrl = slug && origin ? `${origin}/blog/${encodeURIComponent(slug)}` : undefined;
  return buildCarouselArticleText({
    title: input.title,
    excerpt: input.excerpt,
    bodyHtml,
    publicUrl,
  });
}

export function saveCarouselFromPost(payload: CarouselFromPostPayload): void {
  sessionStorage.setItem(CAROUSEL_FROM_POST_KEY, JSON.stringify(payload));
}

export function loadCarouselFromPost(): CarouselFromPostPayload | null {
  try {
    const raw = sessionStorage.getItem(CAROUSEL_FROM_POST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CarouselFromPostPayload;
    if (!parsed?.articleText?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCarouselFromPost(): void {
  sessionStorage.removeItem(CAROUSEL_FROM_POST_KEY);
}
