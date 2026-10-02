import { arrayMove } from '@dnd-kit/sortable';
import type { BlogBlock } from './blogBlockTypes';
import { normalizeColumnZones } from './columnLayouts';

/** Update a block anywhere in the tree (including inside Columns). */
export function updateBlockInTree(blocks: BlogBlock[], id: string, data: Record<string, unknown>): BlogBlock[] {
  return blocks.map((b) => {
    if (b.id === id) {
      return { ...b, data: { ...b.data, ...data } };
    }
    if (b.type === 'columns') {
      const layout = String(b.data.layout ?? '50-50');
      const zones = normalizeColumnZones(b.data.columns, layout);
      let changed = false;
      const nextZones = zones.map((z) => {
        const nextBlocks = z.blocks.map((nested) => {
          if (nested.id !== id) return nested;
          changed = true;
          return { ...nested, data: { ...nested.data, ...data } };
        });
        return { blocks: nextBlocks };
      });
      if (changed) {
        return { ...b, data: { ...b.data, columns: nextZones } };
      }
    }
    return b;
  });
}

export function deleteBlockFromTree(blocks: BlogBlock[], id: string): BlogBlock[] {
  const filtered = blocks.filter((b) => b.id !== id);
  if (filtered.length !== blocks.length) return filtered;

  return blocks.map((b) => {
    if (b.type !== 'columns') return b;
    const layout = String(b.data.layout ?? '50-50');
    const zones = normalizeColumnZones(b.data.columns, layout);
    let changed = false;
    const nextZones = zones.map((z) => {
      const nextBlocks = z.blocks.filter((nested) => {
        if (nested.id === id) {
          changed = true;
          return false;
        }
        return true;
      });
      return { blocks: nextBlocks };
    });
    return changed ? { ...b, data: { ...b.data, columns: nextZones } } : b;
  });
}

export function findBlockInTree(blocks: BlogBlock[], id: string): BlogBlock | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.type === 'columns') {
      const layout = String(b.data.layout ?? '50-50');
      const zones = normalizeColumnZones(b.data.columns, layout);
      for (const z of zones) {
        const hit = z.blocks.find((n) => n.id === id);
        if (hit) return hit;
      }
    }
  }
  return null;
}

export function moveNestedWithinColumn(
  blocks: BlogBlock[],
  parentId: string,
  columnIndex: number,
  fromIndex: number,
  toIndex: number,
): BlogBlock[] {
  if (fromIndex === toIndex) return blocks;
  return blocks.map((b) => {
    if (b.id !== parentId || b.type !== 'columns') return b;
    const layout = String(b.data.layout ?? '50-50');
    const zones = normalizeColumnZones(b.data.columns, layout);
    const z = zones[columnIndex];
    if (!z) return b;
    const nextBlocks = arrayMove(z.blocks, fromIndex, toIndex);
    const nextZones = zones.map((zone, i) => (i === columnIndex ? { blocks: nextBlocks } : zone));
    return { ...b, data: { ...b.data, columns: nextZones } };
  });
}

/** True if `columnsBlock` is a columns block that contains the nested block id (any column). */
export function columnsBlockContainsNestedId(columnsBlock: BlogBlock, nestedId: string | null): boolean {
  if (!nestedId || columnsBlock.type !== 'columns') return false;
  const layout = String(columnsBlock.data.layout ?? '50-50');
  const zones = normalizeColumnZones(columnsBlock.data.columns, layout);
  return zones.some((z) => z.blocks.some((n) => n.id === nestedId));
}
