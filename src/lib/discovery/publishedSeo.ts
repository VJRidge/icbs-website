import { absoluteUrl } from './publicUrls';

export type PublishedSeoInput = {
  siteUrl: string;
  path: string;
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  kind: string;
  siteName?: string;
};

export type PublishedSeoTag = { property?: string; name?: string; content: string };

export type PublishedSeoHead = {
  title: string;
  canonical: string | null;
  description: string | null;
  og: PublishedSeoTag[];
  twitter: PublishedSeoTag[];
  jsonLd: Record<string, unknown>;
};

const UNSAFE_PATH = /(?:^|\/)\.\.(?:\/|$)/;

function normalizePublicPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.includes('://') || trimmed.includes('\\')) return null;
  if (UNSAFE_PATH.test(trimmed)) return null;
  if (trimmed.length > 512) return null;
  return trimmed.replace(/\/{2,}/g, '/') || '/';
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Build canonical, Open Graph, Twitter, and JSON-LD from published snapshot fields only. */
export function buildPublishedSeoHead(input: PublishedSeoInput): PublishedSeoHead {
  const siteName = textOrNull(input.siteName) || 'I Call BS';
  const pageTitle = textOrNull(input.seoTitle) || textOrNull(input.title) || siteName;
  const description = textOrNull(input.seoDescription);
  const image = textOrNull(input.featuredImageUrl);
  const path = normalizePublicPath(input.path);
  const canonical = path ? absoluteUrl(input.siteUrl, path) : null;
  const isArticle = input.kind === 'post';

  const og: PublishedSeoTag[] = [
    { property: 'og:type', content: isArticle ? 'article' : 'website' },
    { property: 'og:title', content: pageTitle },
    { property: 'og:site_name', content: siteName },
  ];
  if (canonical) og.push({ property: 'og:url', content: canonical });
  if (description) og.push({ property: 'og:description', content: description });
  if (image) og.push({ property: 'og:image', content: image });

  const twitter: PublishedSeoTag[] = [
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: pageTitle },
  ];
  if (description) twitter.push({ name: 'twitter:description', content: description });
  if (image) twitter.push({ name: 'twitter:image', content: image });

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'WebPage',
    headline: pageTitle,
    name: pageTitle,
    isPartOf: { '@type': 'WebSite', name: siteName, url: absoluteUrl(input.siteUrl, '/') },
  };
  if (canonical) jsonLd.url = canonical;
  if (description) jsonLd.description = description;
  if (image) jsonLd.image = image;
  if (textOrNull(input.publishedAt)) jsonLd.datePublished = input.publishedAt!.trim();
  if (textOrNull(input.updatedAt)) jsonLd.dateModified = input.updatedAt!.trim();

  return {
    title: pageTitle === siteName ? pageTitle : `${pageTitle} · ${siteName}`,
    canonical,
    description,
    og,
    twitter,
    jsonLd,
  };
}

const SEO_ATTR = 'data-cms-seo';

/** Apply SEO tags to document head; returns a cleanup that removes only our markers. */
export function applyPublishedSeoHead(head: PublishedSeoHead, doc: Document = document): () => void {
  doc.title = head.title;

  const created: Element[] = [];

  const upsertMeta = (attrs: { property?: string; name?: string }, content: string) => {
    const selector = attrs.property
      ? `meta[${SEO_ATTR}][property="${attrs.property}"]`
      : `meta[${SEO_ATTR}][name="${attrs.name}"]`;
    let el = doc.head.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = doc.createElement('meta');
      el.setAttribute(SEO_ATTR, '1');
      if (attrs.property) el.setAttribute('property', attrs.property);
      if (attrs.name) el.setAttribute('name', attrs.name);
      doc.head.appendChild(el);
      created.push(el);
    }
    el.setAttribute('content', content);
  };

  let canonical = doc.head.querySelector(`link[${SEO_ATTR}][rel="canonical"]`) as HTMLLinkElement | null;
  if (head.canonical) {
    if (!canonical) {
      canonical = doc.createElement('link');
      canonical.setAttribute(SEO_ATTR, '1');
      canonical.rel = 'canonical';
      doc.head.appendChild(canonical);
      created.push(canonical);
    }
    canonical.href = head.canonical;
  } else if (canonical) {
    canonical.remove();
  }

  let description = doc.head.querySelector(`meta[${SEO_ATTR}][name="description"]`) as HTMLMetaElement | null;
  if (head.description) {
    if (!description) {
      description = doc.createElement('meta');
      description.setAttribute(SEO_ATTR, '1');
      description.name = 'description';
      doc.head.appendChild(description);
      created.push(description);
    }
    description.content = head.description;
  } else if (description) {
    description.remove();
  }

  for (const tag of head.og) {
    if (tag.property) upsertMeta({ property: tag.property }, tag.content);
  }
  for (const tag of head.twitter) {
    if (tag.name) upsertMeta({ name: tag.name }, tag.content);
  }

  let jsonLdEl = doc.head.querySelector(`script[${SEO_ATTR}][type="application/ld+json"]`) as HTMLScriptElement | null;
  if (!jsonLdEl) {
    jsonLdEl = doc.createElement('script');
    jsonLdEl.setAttribute(SEO_ATTR, '1');
    jsonLdEl.type = 'application/ld+json';
    doc.head.appendChild(jsonLdEl);
    created.push(jsonLdEl);
  }
  jsonLdEl.textContent = JSON.stringify(head.jsonLd);

  return () => {
    for (const el of created) el.remove();
  };
}

/** Browser site origin for public SEO; prefers VITE_SITE_URL when set. */
export function publicSiteUrl(): string {
  const fromEnv = typeof import.meta !== 'undefined' ? String(import.meta.env?.VITE_SITE_URL || '').trim() : '';
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://vettajimale.tech';
}
