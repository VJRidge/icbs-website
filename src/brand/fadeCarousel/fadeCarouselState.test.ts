import { describe, expect, it } from 'vitest';
import {
  alignItems,
  clampStartIndex,
  fadeEasing,
  fadeHeightStyle,
  fadeVisibilityClass,
  nextFadeIndex,
  prevFadeIndex,
  shouldLazyLoadSlide,
} from './fadeCarouselState';

describe('fade index', () => {
  it('loops or stops at the ends', () => {
    expect(nextFadeIndex(3, 4, true)).toBe(0);
    expect(nextFadeIndex(3, 4, false)).toBe(3);
    expect(prevFadeIndex(0, 4, true)).toBe(3);
    expect(prevFadeIndex(0, 4, false)).toBe(0);
    expect(clampStartIndex(9, 4)).toBe(3);
    expect(clampStartIndex(-2, 4)).toBe(0);
  });
});

describe('fade layout helpers', () => {
  it('maps height, alignment, easing, lazy load, and hide toggles', () => {
    expect(fadeHeightStyle(480)).toEqual({ height: '480px' });
    expect(fadeHeightStyle('80vh')).toEqual({ height: '80vh' });
    expect(fadeHeightStyle('auto')).toEqual({ height: 'auto' });
    expect(alignItems('bottom-left')).toEqual({ alignItems: 'flex-start', justifyContent: 'flex-end' });
    expect(alignItems('center')).toEqual({ alignItems: 'center', justifyContent: 'center' });
    expect(fadeEasing('cubic-premium')).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(shouldLazyLoadSlide(0, 0, true)).toBe(false);
    expect(shouldLazyLoadSlide(3, 0, true)).toBe(true);
    expect(fadeVisibilityClass({ tablet: true })).toBe('icbs-fade-hide-tablet');
  });
});
