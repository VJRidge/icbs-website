import { describe, expect, it } from 'vitest';
import { carouselSlideHref, mediaCarouselIsEmpty } from './mediaWidgetOptions';

describe('mediaCarouselIsEmpty', () => {
  it('treats a dropped media carousel with no files as empty', () => {
    expect(mediaCarouselIsEmpty({ type: 'carousel', data: { kind: 'media', items: [{ url: '', videoUrl: '' }] } })).toBe(true);
    expect(mediaCarouselIsEmpty({ type: 'carousel', data: { items: [] } })).toBe(true);
  });

  it('keeps a carousel that already has an image or video', () => {
    expect(mediaCarouselIsEmpty({ type: 'carousel', data: { items: [{ url: 'https://x.test/a.jpg' }] } })).toBe(false);
    expect(mediaCarouselIsEmpty({ type: 'carousel', data: { items: [{ videoUrl: 'https://youtu.be/a' }] } })).toBe(false);
  });

  it('uses the slide link so a click can open a page or post', () => {
    expect(carouselSlideHref({ link: '/blog/trust-the-process' }, {})).toBe('/blog/trust-the-process');
    expect(carouselSlideHref({ url: '/img/a.jpg' }, { linkMode: 'media' })).toBe('/img/a.jpg');
    expect(carouselSlideHref({ url: '/img/a.jpg' }, { linkMode: 'custom', customUrl: '/about' })).toBe('/about');
    expect(carouselSlideHref({ link: '/about', url: '/img/a.jpg' }, { linkMode: 'media' })).toBe('/about');
    expect(carouselSlideHref({ link: 'javascript:alert(1)' }, {})).toBe('');
  });

  it('ignores other widgets', () => {
    expect(mediaCarouselIsEmpty({ type: 'image', data: {} })).toBe(false);
  });
});
