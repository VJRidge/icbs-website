import { describe, expect, it } from 'vitest';
import {
  cssColorToHex,
  emptySurfaceBackground,
  readColumnSurface,
  readSurfaceBackground,
  surfaceBackgroundPatch,
  surfaceShellStyle,
  withColumnSurface,
} from './surfaceBackground';

describe('surfaceBackground', () => {
  it('turns rgb colors into hex', () => {
    expect(cssColorToHex('rgb(247, 247, 242)')).toBe('#f7f7f2');
    expect(cssColorToHex('#214232')).toBe('#214232');
    expect(cssColorToHex('rgba(0, 0, 0, 0)')).toBe('');
    expect(cssColorToHex('rgba(247, 247, 242, 1)')).toBe('#f7f7f2');
  });

  it('reads empty data as a blank classic surface', () => {
    expect(readSurfaceBackground({})).toEqual(emptySurfaceBackground());
  });

  it('stores a classic color on the block', () => {
    const patch = surfaceBackgroundPatch({
      ...emptySurfaceBackground(),
      type: 'classic',
      color: '#214232',
    });
    expect(patch.backgroundType).toBe('classic');
    expect(patch.backgroundColor).toBe('#214232');
    const style = surfaceShellStyle(readSurfaceBackground(patch));
    expect(style.backgroundColor).toBe('#214232');
  });

  it('uses cover images and ignores unsafe video urls', () => {
    const patch = surfaceBackgroundPatch({
      ...emptySurfaceBackground(),
      type: 'image',
      imageUrl: '/img/preview-gap.jpg',
      imageSize: 'cover',
      videoUrl: 'javascript:alert(1)',
    });
    const bg = readSurfaceBackground(patch);
    expect(surfaceShellStyle(bg).backgroundImage).toBe('url("/img/preview-gap.jpg")');
    expect(bg.videoUrl).toBe('');
  });

  it('keeps a column surface next to its column', () => {
    const first = withColumnSurface({}, 3, 1, {
      ...emptySurfaceBackground(),
      type: 'classic',
      color: '#F3EDE3',
    });
    expect(readColumnSurface(first, 0).color).toBe('');
    expect(readColumnSurface(first, 1).color).toBe('#F3EDE3');
    expect(readColumnSurface(first, 1).type).toBe('classic');
  });
});
