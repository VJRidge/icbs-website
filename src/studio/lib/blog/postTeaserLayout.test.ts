import { describe, expect, it } from 'vitest';
import {
  clipExcerpt,
  excerptFromPost,
  imageRatioPreset,
  readPostTeaserLayout,
  skinLayoutPatch,
} from './postTeaserLayout';

describe('postTeaserLayout', () => {
  it('defaults to a cards grid', () => {
    const layout = readPostTeaserLayout({});
    expect(layout.skin).toBe('cards');
    expect(layout.showImage).toBe(true);
    expect(layout.showTitle).toBe(true);
    expect(layout.columns).toBe(3);
    expect(layout.imageRatio).toBeCloseTo(16 / 9);
  });

  it('keeps classic as a one-column list with a left image', () => {
    const layout = readPostTeaserLayout({ skin: 'classic', columns: 1, imagePosition: 'left', excerptLength: 101 });
    expect(layout.skin).toBe('classic');
    expect(layout.imagePosition).toBe('left');
    expect(layout.excerptLength).toBe(101);
  });

  it('keeps a 16:9 photo crop inside the allowed ratio range', () => {
    expect(readPostTeaserLayout({ imageRatio: 16 / 9 }).imageRatio).toBeCloseTo(16 / 9);
    expect(imageRatioPreset(1)).toBe('square');
    expect(imageRatioPreset(16 / 9)).toBe('wide');
  });

  it('clips excerpts to a word budget', () => {
    expect(clipExcerpt('One two three four five', 3)).toBe('One two three…');
    expect(clipExcerpt('Short line', 8)).toBe('Short line');
  });

  it('falls back to body copy when the excerpt field is empty', () => {
    expect(excerptFromPost({ excerpt: '  Saved blurb  ', html: '<p>Longer</p>' })).toBe('Saved blurb');
    expect(excerptFromPost({ excerpt: '', html: '<p>First <strong>sentence</strong> here.</p>' })).toBe(
      'First sentence here.',
    );
  });

  it('applies a real layout when the skin changes', () => {
    expect(skinLayoutPatch('classic')).toMatchObject({ skin: 'classic', imagePosition: 'left', columns: 1 });
    expect(skinLayoutPatch('cards')).toMatchObject({ skin: 'cards', imagePosition: 'top' });
    expect(skinLayoutPatch('full')).toMatchObject({ skin: 'full', columns: 1, showExcerpt: true });
  });
});
