import { describe, expect, it } from 'vitest';
import {
  columnWidthsForZones,
  defaultWidthsForLayout,
  gutteredGridTemplate,
  gridTemplateWithGutters,
  widthsWithColumnPercent,
} from './columnLayouts';

describe('columnWidthsForZones', () => {
  it('repairs a stale two-column layout for a three-column section', () => {
    expect(columnWidthsForZones('50-50', [{}, {}, {}], [50, 50])).toEqual([34, 33, 33]);
  });

  it('keeps valid saved widths for the actual number of columns', () => {
    expect(columnWidthsForZones('50-50', [{}, {}, {}], [40, 30, 30])).toEqual([40, 30, 30]);
  });
});

describe('gutteredGridTemplate', () => {
  it('inserts a pixel track between columns', () => {
    expect(gutteredGridTemplate('1fr 1fr 1fr', 12)).toBe('1fr 12px 1fr 12px 1fr')
    expect(gutteredGridTemplate('repeat(2, 1fr)', 12)).toBe('1fr 12px 1fr')
    expect(gridTemplateWithGutters([50, 50], 12)).toBe('50fr 12px 50fr')
  })
})

describe('widthsWithColumnPercent', () => {
  it('redistributes the remainder and keeps the row at 100 percent', () => {
    const next = widthsWithColumnPercent(defaultWidthsForLayout('33-33-33'), 0, 40);
    expect(next).toEqual([40, 30, 30]);
    expect(next?.reduce((sum, width) => sum + width, 0)).toBe(100);
  });
});
