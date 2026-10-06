import { describe, expect, it } from 'vitest';
import { countInvalidBlocks, normalizeBlock, normalizeBlocks } from './blockSchemas';

describe('blockSchemas', () => {
  it('accepts core paragraph/heading/image shapes', () => {
    const paragraph = normalizeBlock({ id: 'p1', type: 'paragraph', data: { text: 'Hi', align: 'left' } });
    expect(paragraph.invalid).toBeUndefined();
    expect(paragraph.schemaVersion).toBe(1);

    const heading = normalizeBlock({ id: 'h1', type: 'heading', data: { text: 'Title', level: 2 } });
    expect(heading.invalid).toBeUndefined();
  });

  it('marks unknown payloads invalid without dropping the block id', () => {
    const bad = normalizeBlock({ id: 'img1', type: 'image', data: 'not-an-object' });
    expect(bad.invalid).toBe(true);
    expect(bad.id).toBe('img1');
  });

  it('falls back gracefully for non-arrays and counts invalids', () => {
    expect(normalizeBlocks(null)).toEqual([]);
    const list = normalizeBlocks([
      { id: 'ok', type: 'paragraph', data: { text: '' } },
      { id: 'bad', type: 'heading', data: { level: 99 } },
    ]);
    expect(countInvalidBlocks(list)).toBe(1);
  });
});
