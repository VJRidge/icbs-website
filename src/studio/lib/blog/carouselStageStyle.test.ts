import { describe, expect, it } from 'vitest';
import { hexToRgba, readCarouselStageStyle } from './carouselStageStyle';

describe('readCarouselStageStyle', () => {
  it('keeps a zero gap and contain fit instead of treating them as missing', () => {
    const style = readCarouselStageStyle({ gap: 0, imageFit: 'contain', widthPercent: 80, height: 300 }, false);
    expect(style.gap).toBe(0);
    expect(style.fit).toBe('contain');
    expect(style.widthPercent).toBe(80);
    expect(style.height).toBe(300);
  });

  it('defaults media carousel spacing so slides have a visible gutter', () => {
    const style = readCarouselStageStyle({}, false);
    expect(style.gap).toBe(10);
    expect(style.fit).toBe('cover');
    expect(style.widthPercent).toBe(100);
    expect(style.dotPosition).toBe('outside');
  });

  it('reads lightbox overlay colors used by the fullscreen viewer', () => {
    const style = readCarouselStageStyle({ lightbox: true, lightboxColor: '#0f172a', lightboxWidth: 70 }, false);
    expect(style.lightbox).toBe(true);
    expect(style.lightboxColor).toBe('#0f172a');
    expect(style.lightboxWidth).toBe(70);
    expect(hexToRgba('#0f172a', 0.8)).toBe('rgba(15, 23, 42, 0.8)');
  });
});
