import { kindConfig } from '../contentKinds';

export const HOMEPAGE_CHANGED = 'icbs-homepage-changed';

export function emitHomepageChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HOMEPAGE_CHANGED));
}

export type ViewSitePage = {
  id: string;
  slug: string;
  kind?: string;
  status?: string;
};

/** Public path for the View site eye — the assigned homepage page, not `/`. */
export function resolveViewSitePath(args: {
  liveHomepageId: string | null;
  draftHomepageId?: string | null;
  pages: ViewSitePage[];
}): string {
  const id = args.liveHomepageId || args.draftHomepageId;
  if (!id) return '/';
  const page = args.pages.find((row) => row.id === id);
  if (!page?.slug) return '/';
  return kindConfig(page.kind ?? 'page').publicPath(page.slug);
}

/** View live / list View always open this page's URL (e.g. `/home-v2`). */
export function viewLivePath(page: { slug: string; kind?: string }): string {
  const slug = String(page.slug ?? '').trim();
  if (!slug) return '/';
  return kindConfig(page.kind ?? 'page').publicPath(slug);
}

export function withHomepageSlot(
  draft: Record<string, unknown> | null | undefined,
  field: 'homepage_content_id' | 'kit_content_id',
  value: string | null,
): Record<string, unknown> {
  const base = draft && typeof draft === 'object' && !Array.isArray(draft) ? { ...draft } : {};
  return { ...base, [field]: value };
}
