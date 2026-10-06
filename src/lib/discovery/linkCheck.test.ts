import { describe, expect, it } from 'vitest';
import {
  collectInternalHrefs,
  evaluateBrokenInternalLinks,
  normalizeInternalHref,
} from './linkCheck';

describe('normalizeInternalHref', () => {
  it('keeps site-relative paths and strips query/hash', () => {
    expect(normalizeInternalHref('/blog/hello?x=1#top', 'https://example.com')).toBe('/blog/hello');
    expect(normalizeInternalHref('https://example.com/about/', 'https://example.com')).toBe('/about');
  });

  it('ignores external, mailto, and empty values', () => {
    expect(normalizeInternalHref('https://other.test/a', 'https://example.com')).toBeNull();
    expect(normalizeInternalHref('mailto:hi@x.test', 'https://example.com')).toBeNull();
    expect(normalizeInternalHref('#section', 'https://example.com')).toBeNull();
    expect(normalizeInternalHref('', 'https://example.com')).toBeNull();
  });
});

describe('collectInternalHrefs', () => {
  it('walks nested blocks and html strings for internal links', () => {
    const hrefs = collectInternalHrefs(
      {
        blocks: [
          { type: 'button', data: { href: '/missing-page' } },
          { type: 'paragraph', data: { html: '<a href="/blog/ok">ok</a> and <a href="https://example.com/gone">g</a>' } },
        ],
      },
      'https://example.com',
    );
    expect(hrefs).toEqual(expect.arrayContaining(['/missing-page', '/blog/ok', '/gone']));
  });
});

describe('evaluateBrokenInternalLinks', () => {
  it('flags hrefs not present in the published path set', () => {
    const alerts = evaluateBrokenInternalLinks({
      siteUrl: 'https://example.com',
      publishedPaths: new Set(['/', '/blog', '/blog/ok', '/about']),
      records: [
        {
          id: 'p1',
          kind: 'page',
          title: 'Sales',
          slug: 'sales',
          status: 'published',
          published_document: {
            blocks: [{ type: 'cta', data: { href: '/missing' } }],
          },
        },
        {
          id: 'p2',
          kind: 'post',
          title: 'Good',
          slug: 'ok',
          status: 'published',
          published_document: {
            blocks: [{ type: 'cta', data: { href: '/blog/ok' } }],
          },
        },
      ],
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.code).toBe('broken_internal_link');
    expect(alerts[0]?.detail).toContain('/missing');
    expect(alerts[0]?.href).toBe('/admin/pages/p1');
  });

  it('skips drafts and known static public routes', () => {
    const alerts = evaluateBrokenInternalLinks({
      siteUrl: 'https://example.com',
      publishedPaths: new Set(['/']),
      records: [
        {
          id: 'd1',
          kind: 'page',
          title: 'Draft',
          slug: 'draft',
          status: 'draft',
          content_blocks: [{ type: 'cta', data: { href: '/missing' } }],
        },
        {
          id: 'p1',
          kind: 'page',
          title: 'Live',
          slug: 'live',
          status: 'published',
          published_document: {
            blocks: [{ type: 'cta', data: { href: '/contact' } }, { type: 'cta', data: { href: '/search' } }],
          },
        },
      ],
    });
    expect(alerts).toEqual([]);
  });
});
