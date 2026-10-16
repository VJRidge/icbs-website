import { describe, expect, it } from 'vitest';
import {
  comparePostGridOrder,
  dropTargetPostId,
  moveIdAt,
  newPostListOrder,
  pinListOrder,
  ranksFromIds,
} from './postGridOrder';

describe('postGridOrder', () => {
  it('keeps newest first when every post still has the default rank', () => {
    const rows = [
      { id: 'old', list_order: 0, published_at: '2026-10-01T09:00:00.000Z', title: 'Old' },
      { id: 'new', list_order: 0, published_at: '2026-10-14T09:00:00.000Z', title: 'New' },
    ];
    expect([...rows].sort(comparePostGridOrder).map((r) => r.id)).toEqual(['new', 'old']);
  });

  it('uses list_order before the public date', () => {
    const rows = [
      { id: 'late', list_order: 2, published_at: '2026-10-14T09:00:00.000Z', title: 'Late' },
      { id: 'first', list_order: 0, published_at: '2026-01-01T09:00:00.000Z', title: 'First' },
    ];
    expect([...rows].sort(comparePostGridOrder).map((r) => r.id)).toEqual(['first', 'late']);
  });

  it('pins with a rank below zero so new default posts stay underneath', () => {
    expect(pinListOrder([0, 1, 2])).toBe(-1);
    expect(pinListOrder([-3, 0])).toBe(-4);
  });

  it('appends a newly published post after a handmade order', () => {
    expect(newPostListOrder([0, 0, 0])).toBe(0);
    expect(newPostListOrder([0, 1, 2])).toBe(3);
  });

  it('reads the post id from a nested drop target', () => {
    const link = {
      closest: (selector: string) =>
        selector === '[data-post-id]' ? { getAttribute: () => 'post-9' } : null,
    } as unknown as Element;
    expect(dropTargetPostId(link)).toBe('post-9');
    expect(dropTargetPostId(null)).toBeNull();
  });

  it('rewrites ranks from a drag so the first id is first on the grid', () => {
    expect(moveIdAt(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(ranksFromIds(['c', 'a', 'b'])).toEqual([
      { id: 'c', list_order: 0 },
      { id: 'a', list_order: 1 },
      { id: 'b', list_order: 2 },
    ]);
  });
});
