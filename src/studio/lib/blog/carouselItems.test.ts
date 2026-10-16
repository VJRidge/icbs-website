import { describe, expect, it } from 'vitest';
import { followMovedIndex, moveCarouselItem } from './carouselItems';

describe('moveCarouselItem', () => {
  it('moves a slide later in the list without mutating the original', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(moveCarouselItem(items, 0, 2)).toEqual([{ id: 'b' }, { id: 'c' }, { id: 'a' }]);
    expect(items).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('moves a slide earlier and ignores out-of-range indexes', () => {
    const items = ['one', 'two', 'three'];
    expect(moveCarouselItem(items, 2, 0)).toEqual(['three', 'one', 'two']);
    expect(moveCarouselItem(items, -1, 1)).toBe(items);
    expect(moveCarouselItem(items, 1, 9)).toBe(items);
  });
});

describe('followMovedIndex', () => {
  it('keeps the open accordion on the same slide after a reorder', () => {
    expect(followMovedIndex(0, 0, 2)).toBe(2);
    expect(followMovedIndex(2, 0, 2)).toBe(1);
    expect(followMovedIndex(0, 2, 0)).toBe(1);
    expect(followMovedIndex(-1, 0, 2)).toBe(-1);
  });
});
