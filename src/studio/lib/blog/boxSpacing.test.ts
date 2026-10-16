import { describe, expect, it } from 'vitest';
import { readMarginBox, readPaddingBox, spacingBoxStyle } from './boxSpacing';

describe('boxSpacing', () => {
  it('treats padding as inside the box and margin as outside', () => {
    const style = spacingBoxStyle({
      paddingBottom: 48,
      marginBottom: 24,
      marginTop: 12,
    });
    expect(style.paddingBottom).toBe(48);
    expect(style.marginBottom).toBe(24);
    expect(style.marginTop).toBe(12);
  });

  it('maps padBottom and paddingY onto padding without wiping a real padBottom', () => {
    expect(readPaddingBox({ padBottom: 40, paddingY: 0 }).bottom).toBe(40);
    expect(readPaddingBox({ paddingY: 16 }).bottom).toBe(16);
    expect(readPaddingBox({ paddingY: 16 }).top).toBe(16);
    expect(readMarginBox({ marginLeft: 8, marginRight: 10 })).toEqual({
      top: 0,
      right: 10,
      bottom: 0,
      left: 8,
    });
  });
});
