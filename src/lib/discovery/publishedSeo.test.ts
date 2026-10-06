import { describe, expect, it } from 'vitest';
import { buildPublishedSeoHead } from './publishedSeo';

describe('buildPublishedSeoHead', () => {
  it('builds canonical, title suffix, description, and WebPage JSON-LD for pages', () => {
    const head = buildPublishedSeoHead({
      siteUrl: 'https://example.com/',
      path: '/about',
      title: 'About',
      seoTitle: 'About us',
      seoDescription: 'Who we are.',
      kind: 'page',
      publishedAt: '2026-10-01T12:00:00.000Z',
    });

    expect(head.canonical).toBe('https://example.com/about');
    expect(head.title).toBe('About us · I Call BS');
    expect(head.description).toBe('Who we are.');
    expect(head.og).toEqual(
      expect.arrayContaining([
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://example.com/about' },
        { property: 'og:title', content: 'About us' },
        { property: 'og:description', content: 'Who we are.' },
      ]),
    );
    expect(head.jsonLd['@type']).toBe('WebPage');
    expect(head.jsonLd.url).toBe('https://example.com/about');
  });

  it('uses Article JSON-LD and og:type article for posts', () => {
    const head = buildPublishedSeoHead({
      siteUrl: 'https://example.com',
      path: '/blog/hello',
      title: 'Hello',
      seoTitle: null,
      seoDescription: 'A post.',
      featuredImageUrl: 'https://cdn.example.com/hi.jpg',
      kind: 'post',
      publishedAt: '2026-10-02T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
    });

    expect(head.title).toBe('Hello · I Call BS');
    expect(head.og).toEqual(
      expect.arrayContaining([
        { property: 'og:type', content: 'article' },
        { property: 'og:image', content: 'https://cdn.example.com/hi.jpg' },
      ]),
    );
    expect(head.jsonLd['@type']).toBe('Article');
    expect(head.jsonLd.datePublished).toBe('2026-10-02T00:00:00.000Z');
    expect(head.jsonLd.dateModified).toBe('2026-10-03T00:00:00.000Z');
    expect(head.jsonLd.image).toBe('https://cdn.example.com/hi.jpg');
  });

  it('omits empty description and image tags', () => {
    const head = buildPublishedSeoHead({
      siteUrl: 'https://example.com',
      path: '/',
      title: 'Home',
      kind: 'page',
    });

    expect(head.description).toBeNull();
    expect(head.og.some((t) => t.property === 'og:description')).toBe(false);
    expect(head.og.some((t) => t.property === 'og:image')).toBe(false);
    expect(head.title).toBe('Home · I Call BS');
  });

  it('rejects unsafe paths by returning null canonical helpers via empty path', () => {
    const head = buildPublishedSeoHead({
      siteUrl: 'https://example.com',
      path: '../evil',
      title: 'Nope',
      kind: 'page',
    });
    expect(head.canonical).toBeNull();
    expect(head.jsonLd.url).toBeUndefined();
  });
});
