import type { CSSProperties } from 'react';

/** Standard blog featured photo: 16:9, cropped to fill. */
export const FEATURED_IMAGE_RATIO = 16 / 9;
export const FEATURED_IMAGE_RATIO_LABEL = '16:9';
const LEGACY_TEASER_RATIO = 0.66;

export function readFeaturedImageRatio(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === LEGACY_TEASER_RATIO) return FEATURED_IMAGE_RATIO;
  return Math.min(2, Math.max(0.3, n));
}

export function featuredImageFrameStyle(): CSSProperties {
  return {
    aspectRatio: '16 / 9',
    objectFit: 'cover',
    width: '100%',
    display: 'block',
  };
}
