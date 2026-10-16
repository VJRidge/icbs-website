import { describe, expect, it } from 'vitest';
import { FEATURED_IMAGE_RATIO, featuredImageFrameStyle, readFeaturedImageRatio } from './featuredImage';

describe('featuredImage', () => {
  it('uses a 16:9 frame so list cards and the post hero match', () => {
    expect(FEATURED_IMAGE_RATIO).toBeCloseTo(16 / 9);
    expect(featuredImageFrameStyle().aspectRatio).toBe('16 / 9');
    expect(featuredImageFrameStyle().objectFit).toBe('cover');
  });

  it('treats the old 0.66 teaser default as the standard frame', () => {
    expect(readFeaturedImageRatio(undefined)).toBeCloseTo(16 / 9);
    expect(readFeaturedImageRatio(0.66)).toBeCloseTo(16 / 9);
    expect(readFeaturedImageRatio(1)).toBe(1);
  });
});
