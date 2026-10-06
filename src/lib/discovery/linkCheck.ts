function editorHrefForRecord(row: Pick<LinkCheckRecord, 'id' | 'kind' | 'content_type_key'>): string {
  if (row.kind === 'post') return `/admin/posts/${row.id}`;
  if (row.kind === 'custom' && row.content_type_key) return `/admin/content/${row.content_type_key}/${row.id}`;
  return `/admin/pages/${row.id}`;
}

export type LinkCheckRecord = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  status: string;
  content_type_key?: string | null;
  content_blocks?: unknown;
  published_document?: unknown;
};

export type BrokenLinkAlert = {
  id: string;
  severity: 'error' | 'warning';
  code: 'broken_internal_link';
  title: string;
  detail: string;
  href: string;
  recordId?: string;
};

/** Always-valid public paths that may not appear in published_contents. */
export const STATIC_PUBLIC_PATHS = new Set([
  '/',
  '/blog',
  '/search',
  '/contact',
  '/free',
  '/free/thanks',
  '/privacy',
  '/terms',
  '/refunds',
]);

const HREF_ATTR = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

export function normalizeInternalHref(raw: string, siteUrl: string): string | null {
  const value = raw.trim();
  if (!value || value.startsWith('#') || value.startsWith('mailto:') || value.startsWith('tel:')) {
    return null;
  }
  if (value.startsWith('javascript:') || value.startsWith('data:')) return null;

  let path: string | null = null;
  if (value.startsWith('/')) {
    path = value;
  } else if (/^https?:\/\//i.test(value)) {
    try {
      const site = new URL(siteUrl);
      const target = new URL(value);
      if (target.host !== site.host) return null;
      path = target.pathname || '/';
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const noQuery = path.split('?')[0]?.split('#')[0] ?? '';
  if (!noQuery.startsWith('/')) return null;
  if (/(?:^|\/)\.\.(?:\/|$)/.test(noQuery)) return null;
  // Drop trailing slash except root.
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1);
  return noQuery || '/';
}

function pushHref(out: Set<string>, raw: string, siteUrl: string) {
  const path = normalizeInternalHref(raw, siteUrl);
  if (path) out.add(path);
}

function walkValue(value: unknown, siteUrl: string, out: Set<string>, depth = 0) {
  if (depth > 12 || value == null) return;
  if (typeof value === 'string') {
    if (value.includes('href=') || value.includes("href='")) {
      HREF_ATTR.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = HREF_ATTR.exec(value))) {
        pushHref(out, match[1] || match[2] || match[3] || '', siteUrl);
      }
    } else if (value.startsWith('/') || /^https?:\/\//i.test(value)) {
      pushHref(out, value, siteUrl);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkValue(item, siteUrl, out, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'href' || key === 'url' || key === 'link' || key === 'to') {
        if (typeof child === 'string') pushHref(out, child, siteUrl);
      }
      walkValue(child, siteUrl, out, depth + 1);
    }
  }
}

/** Collect unique internal paths referenced by a published document or block tree. */
export function collectInternalHrefs(document: unknown, siteUrl: string): string[] {
  const out = new Set<string>();
  walkValue(document, siteUrl, out);
  return [...out];
}

export function evaluateBrokenInternalLinks(args: {
  records: LinkCheckRecord[];
  publishedPaths: Set<string>;
  siteUrl: string;
}): BrokenLinkAlert[] {
  const known = new Set([...STATIC_PUBLIC_PATHS, ...args.publishedPaths]);
  const alerts: BrokenLinkAlert[] = [];

  for (const row of args.records) {
    if (row.status !== 'published') continue;
    const source = row.published_document ?? row.content_blocks;
    if (!source) continue;
    const hrefs = collectInternalHrefs(source, args.siteUrl);
    const broken = hrefs.filter((path) => !known.has(path));
    if (broken.length === 0) continue;
    const sample = broken.slice(0, 5).join(', ');
    const more = broken.length > 5 ? ` (+${broken.length - 5} more)` : '';
    alerts.push({
      id: `link-${row.id}`,
      severity: 'warning',
      code: 'broken_internal_link',
      title: row.title || 'Untitled',
      detail: `Published snapshot links to missing paths: ${sample}${more}. Fix or unpublish the source.`,
      href: editorHrefForRecord(row),
      recordId: row.id,
    });
  }

  return alerts;
}
