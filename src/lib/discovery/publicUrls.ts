/** Pure discovery helpers. Public URLs must come from published snapshots only. */

export type DiscoveryPublishedRow = {
  id: string;
  kind: string;
  slug: string;
  public_path?: string | null;
  content_type_key?: string | null;
  title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
};

export type DiscoverySiteContext = {
  homepageContentId: string | null;
};

const UNSAFE_PATH = /(?:^|\/)\.\.(?:\/|$)/;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.includes('://') || trimmed.includes('\\')) return null;
  if (UNSAFE_PATH.test(trimmed)) return null;
  if (trimmed.length > 512) return null;
  return trimmed.replace(/\/{2,}/g, '/') || '/';
}

/** Resolve the public path for a published_contents row. Returns null when unsafe. */
export function resolvePublishedPublicPath(
  row: DiscoveryPublishedRow,
  ctx: DiscoverySiteContext,
): string | null {
  if (ctx.homepageContentId && row.id === ctx.homepageContentId) return '/';

  if (row.public_path) {
    return normalizePath(row.public_path);
  }

  const slug = String(row.slug || '').trim();
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('..')) return null;

  if (row.kind === 'post') return `/blog/${encodeURIComponent(slug)}`;
  if (row.kind === 'page') return `/${encodeURIComponent(slug)}`;
  if (row.kind === 'custom' && row.content_type_key === 'tool_review') {
    return `/reviews/${encodeURIComponent(slug)}`;
  }
  return null;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rel}`;
}

export type SitemapEntry = { loc: string; lastmod?: string | null };

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod
        ? `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>`
        : '';
      return `  <url>\n    <loc>${escapeXml(e.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /preview',
    'Disallow: /preview/',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
}

export type RssItem = {
  title: string;
  path: string;
  description: string;
  publishedAt: string | null;
};

export function buildRssXml(args: {
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  items: RssItem[];
}): string {
  const channelLink = absoluteUrl(args.siteUrl, '/blog');
  const items = args.items
    .map((item) => {
      const link = absoluteUrl(args.siteUrl, item.path);
      const pub = item.publishedAt
        ? `\n      <pubDate>${escapeXml(new Date(item.publishedAt).toUTCString())}</pubDate>`
        : '';
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <description>${escapeXml(item.description)}</description>${pub}`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(args.siteName)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(args.siteDescription)}</description>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/** Filter published rows for public search (title match already applied by query). */
export function rankSearchHits(
  rows: DiscoveryPublishedRow[],
  query: string,
  ctx: DiscoverySiteContext,
): Array<DiscoveryPublishedRow & { path: string }> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: Array<DiscoveryPublishedRow & { path: string }> = [];
  for (const row of rows) {
    const path = resolvePublishedPublicPath(row, ctx);
    if (!path) continue;
    const title = String(row.title || '').toLowerCase();
    if (!title.includes(q)) continue;
    out.push({ ...row, path });
  }
  return out;
}
