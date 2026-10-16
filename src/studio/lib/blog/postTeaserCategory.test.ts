import { describe, expect, it } from 'vitest';
import { categoryFacesFromLinks, teaserCategoryLabel, teaserCategoryByContentId, teaserCategoryNames } from './postTeaserCategory';

describe('teaserCategoryNames', () => {
  it('lists every category with the primary first', () => {
    expect(
      teaserCategoryNames([
        { kind: 'category', name: 'Video', is_primary: false },
        { kind: 'tag', name: 'ai' },
        { kind: 'category', name: 'Article', is_primary: true },
        { kind: 'category', name: 'Tutorial', is_primary: false },
      ]),
    ).toEqual(['Article', 'Video', 'Tutorial']);
  });

  it('keeps snapshot order when none is marked primary', () => {
    expect(
      teaserCategoryNames([
        { kind: 'category', name: 'Tutorial' },
        { kind: 'category', name: 'Video' },
      ]),
    ).toEqual(['Tutorial', 'Video']);
  });
});

describe('teaserCategoryLabel', () => {
  it('joins all selected categories for the orange kicker', () => {
    expect(
      teaserCategoryLabel([
        { kind: 'category', name: 'Video', is_primary: false },
        { kind: 'category', name: 'Article', is_primary: true },
      ]),
    ).toBe('Article · Video');
  });

  it('falls back to the first category and ignores other taxonomy kinds', () => {
    expect(
      teaserCategoryLabel([
        { kind: 'tag', name: 'ai' },
        { kind: 'category', name: 'Tutorial' },
      ]),
    ).toBe('Tutorial');
  });

  it('returns empty when there is no category', () => {
    expect(teaserCategoryLabel(null)).toBe('');
    expect(teaserCategoryLabel([])).toBe('');
  });
});

describe('categoryFacesFromLinks', () => {
  it('returns every selected category with the primary first', () => {
    expect(
      categoryFacesFromLinks([
        { is_primary: false, taxonomies: { kind: 'category', name: 'Video', slug: 'video' } },
        { is_primary: true, taxonomies: { kind: 'category', name: 'Article', slug: 'article' } },
        { is_primary: false, taxonomies: { kind: 'category', name: 'Tutorial', slug: 'tutorial' } },
      ]),
    ).toEqual([
      { slug: 'article', name: 'Article' },
      { slug: 'video', name: 'Video' },
      { slug: 'tutorial', name: 'Tutorial' },
    ]);
  });
});

describe('teaserCategoryByContentId', () => {
  it('joins every linked category for each post, primary first', () => {
    expect(
      teaserCategoryByContentId([
        { content_id: 'a', is_primary: false, taxonomies: { kind: 'category', name: 'Video' } },
        { content_id: 'a', is_primary: true, taxonomies: { kind: 'category', name: 'Article' } },
        { content_id: 'b', is_primary: true, taxonomies: { kind: 'category', name: 'Tutorial' } },
      ]),
    ).toEqual({ a: 'Article · Video', b: 'Tutorial' });
  });
});
