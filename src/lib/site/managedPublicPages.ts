/** CMS page rows that represent hardcoded public surfaces (inventory + admin entry points). */

export type ManagedPublicPage = {
  /** Stable contents.id from seed migration 20261036. */
  id: string;
  /** contents.slug (may include slashes for nested paths). */
  slug: string;
  title: string;
  publicPath: string;
  /**
   * Studio destination when staff click Edit.
   * null = no studio editor yet; Pages list only offers View.
   */
  adminEditPath: string | null;
  excerpt: string;
};

export const MANAGED_PUBLIC_PAGES: ManagedPublicPage[] = [
  {
    id: 'b1000001-0001-4000-8000-000000000001',
    slug: 'resources/builder-quick-reference',
    title: 'Builder Quick Reference',
    publicPath: '/resources/builder-quick-reference',
    adminEditPath: '/admin/media',
    excerpt: 'Free guide. Upload or replace the PDF under Media → Docs.',
  },
  {
    id: 'b1000001-0001-4000-8000-000000000002',
    slug: 'resources/templates',
    title: 'Templates',
    publicPath: '/resources/templates',
    // No Pages → Edit. Owner file swaps live only under Content → Templates.
    adminEditPath: null,
    excerpt: 'Public page at /resources/templates. Replace starters under Content → Templates.',
  },
  {
    id: 'b1000001-0001-4000-8000-000000000003',
    slug: 'resources/tools-and-updates',
    title: 'Tools & Updates',
    publicPath: '/resources/tools-and-updates',
    adminEditPath: null,
    excerpt: 'Tool reference page. Catalog still ships in code until a studio editor lands.',
  },
  {
    id: 'b1000001-0001-4000-8000-000000000004',
    slug: 'resources/vibe-coding-literacy-check',
    title: 'Vibe Coding Literacy Check',
    publicPath: '/resources/vibe-coding-literacy-check',
    adminEditPath: null,
    excerpt: 'Interactive quiz. Questions live in quiz-content.json until a studio editor lands.',
  },
  {
    id: 'b1000001-0001-4000-8000-000000000005',
    slug: 'book/updates',
    title: 'Book Updates & Corrections',
    publicPath: '/book/updates',
    adminEditPath: '/admin/public-site/book-updates',
    excerpt: 'Publish real corrections and link updates here.',
  },
  {
    id: 'b1000001-0001-4000-8000-000000000006',
    slug: 'faq',
    title: 'FAQ',
    publicPath: '/faq',
    adminEditPath: '/admin/public-site',
    excerpt: 'Public accordion at /faq. Questions live in src/lib/site/faqItems.ts until a studio editor lands.',
  },
  {
    id: 'b1000001-0001-4000-8000-000000000007',
    slug: 'copyright',
    title: 'Copyright',
    publicPath: '/copyright',
    adminEditPath: '/admin/public-site',
    excerpt: 'Public copyright and notice page at /copyright. Copy lives in src/pages/copyrightPolicy.ts.',
  },
];

export function managedPublicPageBySlug(slug: string | null | undefined): ManagedPublicPage | null {
  if (!slug) return null;
  const normalized = slug.replace(/^\/+/, '').toLowerCase();
  return MANAGED_PUBLIC_PAGES.find((p) => p.slug === normalized) ?? null;
}

export function managedPublicPageById(id: string | null | undefined): ManagedPublicPage | null {
  if (!id) return null;
  return MANAGED_PUBLIC_PAGES.find((p) => p.id === id) ?? null;
}

export function isManagedPublicSlug(slug: string | null | undefined): boolean {
  return managedPublicPageBySlug(slug) != null;
}
