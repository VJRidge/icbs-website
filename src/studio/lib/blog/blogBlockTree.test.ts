import { describe, expect, it } from 'vitest';
import type { BlogBlock } from './blogBlockTypes';
import { duplicateBlockInTree } from './blogBlockTree';

function heading(id: string, extra: Record<string, unknown> = {}): BlogBlock {
  return {
    id,
    type: 'heading',
    data: { text: 'AI & Technology', color: '#151412', fontSize: '28', ...extra },
  };
}

describe('duplicateBlockInTree', () => {
  it('inserts a copy after a nested widget and keeps style data', () => {
    const copy = heading('copy-1');
    const columns: BlogBlock = {
      id: 'cols',
      type: 'columns',
      data: {
        layout: '50-50',
        columns: [{ blocks: [heading('h1')] }, { blocks: [] }],
      },
    };
    const next = duplicateBlockInTree([columns], 'h1', copy);
    const zones = (next[0]?.data.columns as Array<{ blocks: BlogBlock[] }>) ?? [];
    expect(zones[0]?.blocks.map((block) => block.id)).toEqual(['h1', 'copy-1']);
    expect(zones[0]?.blocks[1]?.data).toEqual(copy.data);
    expect(zones[1]?.blocks).toEqual([]);
  });

  it('inserts a copy after a top-level widget', () => {
    const original = heading('h1');
    const copy = heading('copy-1');
    const next = duplicateBlockInTree([original], 'h1', copy);
    expect(next.map((block) => block.id)).toEqual(['h1', 'copy-1']);
  });
});
