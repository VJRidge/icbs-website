import { describe, expect, it } from 'vitest';
import {
  buildRobotsTxt,
  buildRssXml,
  buildSitemapXml,
  escapeXml,
  rankSearchHits,
  resolvePublishedPublicPath,
  type DiscoveryPublishedRow,
} from './publicUrls';

describe('resolvePublishedPublicPath', () => {
  it('uses public_path when present', () => {
    const row: DiscoveryPublishedRow = {
      id: '1',
      kind: 'custom',
      slug: 'widget',
      public_path: '/reviews/widget',
      content_type_key: 'tool_review',
    };
    expect(resolvePublishedPublicPath(row, { homepageContentId: null })).toBe('/reviews/widget');
  });

  it('maps homepage content id to /', () => {
    expect(
      resolvePublishedPublicPath(
        { id: 'home', kind: 'page', slug: 'sales', public_path: null, content_type_key: null },
        { homepageContentId: 'home' },
      ),
    ).toBe('/');
  });

  it('maps posts to /blog/:slug and pages to /:slug', () => {
    expect(
      resolvePublishedPublicPath(
        { id: 'p1', kind: 'post', slug: 'hello world', public_path: null, content_type_key: null },
        { homepageContentId: null },
      ),
    ).toBe('/blog/hello%20world');
    expect(
      resolvePublishedPublicPath(
        { id: 'p2', kind: 'page', slug: 'about', public_path: null, content_type_key: null },
        { homepageContentId: null },
      ),
    ).toBe('/about');
  });

  it('rejects empty or unsafe slugs', () => {
    expect(
      resolvePublishedPublicPath(
        { id: 'x', kind: 'page', slug: '', public_path: null, content_type_key: null },
        { homepageContentId: null },
      ),
    ).toBeNull();
    expect(
      resolvePublishedPublicPath(
        { id: 'x', kind: 'page', slug: '../evil', public_path: '/../evil', content_type_key: null },
        { homepageContentId: null },
      ),
    ).toBeNull();
  });
});

describe('discovery xml builders', () => {
  it('escapes xml entities', () => {
    expect(escapeXml(`A & B <C> "d"`)).toBe('A &amp; B &lt;C&gt; &quot;d&quot;');
  });

  it('builds a sitemap from absolute urls only', () => {
    const xml = buildSitemapXml([
      { loc: 'https://example.com/', lastmod: '2026-10-05T12:00:00.000Z' },
      { loc: 'https://example.com/blog/a', lastmod: null },
    ]);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<lastmod>2026-10-05T12:00:00.000Z</lastmod>');
    expect(xml).toContain('<loc>https://example.com/blog/a</loc>');
  });

  it('builds robots.txt with admin/preview disallows and sitemap', () => {
    const txt = buildRobotsTxt('https://example.com');
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Disallow: /preview');
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('builds an rss channel from posts', () => {
    const xml = buildRssXml({
      siteUrl: 'https://example.com',
      siteName: 'I Call BS',
      siteDescription: 'Notes',
      items: [
        {
          title: 'Hello & Welcome',
          path: '/blog/hello',
          description: 'First <post>',
          publishedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    });
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<title>Hello &amp; Welcome</title>');
    expect(xml).toContain('<link>https://example.com/blog/hello</link>');
    expect(xml).toContain('<description>First &lt;post&gt;</description>');
  });
});

describe('rankSearchHits', () => {
  it('requires a two-character query and a resolvable path', () => {
    const rows: DiscoveryPublishedRow[] = [
      { id: '1', kind: 'page', slug: 'about', title: 'About us', public_path: null, content_type_key: null },
      { id: '2', kind: 'page', slug: '', title: 'Broken', public_path: null, content_type_key: null },
    ];
    expect(rankSearchHits(rows, 'a', { homepageContentId: null })).toEqual([]);
    expect(rankSearchHits(rows, 'about', { homepageContentId: null })).toEqual([
      expect.objectContaining({ id: '1', path: '/about' }),
    ]);
  });
});
