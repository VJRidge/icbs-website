import { describe, expect, it } from 'vitest';
import { managedPublicPageBySlug } from './managedPublicPages';

describe('managedPublicPages', () => {
  it('lists FAQ as a Pages inventory row at /faq', () => {
    const faq = managedPublicPageBySlug('faq');
    expect(faq?.title).toBe('FAQ');
    expect(faq?.publicPath).toBe('/faq');
    expect(faq?.id).toBe('b1000001-0001-4000-8000-000000000006');
  });

  it('lists Copyright as a Pages inventory row at /copyright', () => {
    const page = managedPublicPageBySlug('copyright');
    expect(page?.title).toBe('Copyright');
    expect(page?.publicPath).toBe('/copyright');
    expect(page?.id).toBe('b1000001-0001-4000-8000-000000000007');
  });
});

