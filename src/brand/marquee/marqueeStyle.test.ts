import { describe, expect, it } from 'vitest';
import {
  boxToCssVars,
  duplicateMarqueeTrack,
  marqueeVisibilityClass,
  planMarqueeRows,
  tintFilter,
} from './marqueeStyle';

describe('planMarqueeRows', () => {
  it('builds one to three rows with default opposing speeds', () => {
    expect(planMarqueeRows(1)).toEqual([{ direction: 'left', speed: 40 }]);
    expect(planMarqueeRows(2)).toEqual([
      { direction: 'left', speed: 40 },
      { direction: 'right', speed: 28 },
    ]);
    expect(planMarqueeRows(9)).toHaveLength(3);
  });

  it('keeps explicit direction and speed per row', () => {
    expect(planMarqueeRows(2, ['right', 'left'], [12, 18])).toEqual([
      { direction: 'right', speed: 12 },
      { direction: 'left', speed: 18 },
    ]);
  });
});

describe('duplicateMarqueeTrack', () => {
  it('copies the list twice so a -50% loop is seamless', () => {
    const items = [{ image: '/a.svg', alt: 'A' }];
    expect(duplicateMarqueeTrack(items)).toHaveLength(2);
    expect(duplicateMarqueeTrack([])).toEqual([]);
  });
});

describe('marquee helpers', () => {
  it('maps hide toggles and tint filters for the Elementor-style bay', () => {
    expect(marqueeVisibilityClass({ mobile: true, desktop: true })).toBe(
      'icbs-marquee-hide-mobile icbs-marquee-hide-desktop',
    );
    expect(tintFilter('grayscale')).toBe('grayscale(1)');
    expect(tintFilter('mono')).toBe('grayscale(1) contrast(0.2) brightness(1.15)');
    expect(tintFilter('none')).toBe('none');
  });

  it('writes padding and margin as CSS variables with tablet/desktop overrides', () => {
    const vars = boxToCssVars({
      padding: { top: 24, md: { top: 40 } },
      margin: { bottom: 16 },
    });
    expect(vars['--marquee-pt']).toBe('24px');
    expect(vars['--marquee-pt-md']).toBe('40px');
    expect(vars['--marquee-mb']).toBe('16px');
  });
});
