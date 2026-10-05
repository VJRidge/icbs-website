import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { BLOG_BLOCK_DEFAULTS, BLOG_BLOCK_LABELS, type BlogBlock, type BlogBlockType } from './blogBlockTypes';
import { normalizeColumnZones } from './columnLayouts';
import { deleteBlockFromTree, updateBlockInTree, moveNestedWithinColumn, relocateNestedBlock } from './blogBlockTree';
import { sanitizeBlogBlockHtml, sanitizeBlogBlocksDeep } from './sanitizeBlogBlockHtml';
import { cloneBlocks, pushHistory, type WidgetHistoryEntry } from './editorHistory';
import { pasteStylePatch, regenerateBlockIds, stylePatchFor, type EditorDevice } from './blockStyle';

export function createBlogBlock(type: BlogBlockType, data: Record<string, unknown> = {}): BlogBlock {
  const defaults = (BLOG_BLOCK_DEFAULTS as Record<string, Record<string, unknown>>)[type] ?? {
    ...BLOG_BLOCK_DEFAULTS.paragraph,
  };
  return {
    id: nanoid(),
    type,
    data: { ...defaults, ...data },
  };
}

const CMS_BLOCK_MARK = /<div\s+data-cms-block="([^"]+)"\s*>\s*<\/div>/gi;

function blockFromCmsMark(encoded: string): BlogBlock | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as { id?: unknown; type?: unknown; data?: unknown };
    if (!parsed || typeof parsed.type !== 'string' || !parsed.type) return null;
    const data = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data) ? (parsed.data as Record<string, unknown>) : {};
    return { id: typeof parsed.id === 'string' && parsed.id ? parsed.id : nanoid(), type: parsed.type as BlogBlock['type'], data };
  } catch {
    return null;
  }
}

/** One paragraph block holding legacy / RSS HTML so the block editor can run immediately. */
export function htmlBodyToEditorBlocks(html: string): BlogBlock[] {
  const recovered: BlogBlock[] = [];
  const withoutMarks = html.replace(CMS_BLOCK_MARK, (_match, encoded: string) => {
    const block = blockFromCmsMark(encoded);
    if (block) recovered.push(block);
    return '';
  });
  const leftover = withoutMarks.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (recovered.length > 0 && !leftover) return recovered;
  const text = sanitizeBlogBlockHtml(withoutMarks.trim() || '<p></p>') || '<p></p>';
  const paragraph: BlogBlock = { id: nanoid(), type: 'paragraph', data: { text } };
  return recovered.length > 0 ? [...recovered, paragraph] : [paragraph];
}

/** Normalize JSON from `publisher_blog_posts.content_blocks` for rendering or editing. */
export function parseBlogBlocks(raw: unknown): BlogBlock[] {
  if (!Array.isArray(raw)) return [];
  const parsed = raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id ? o.id : nanoid();
      const type = typeof o.type === 'string' ? o.type : 'paragraph';
      const data = o.data && typeof o.data === 'object' && !Array.isArray(o.data) ? (o.data as Record<string, unknown>) : {};
      const defaults =
        (BLOG_BLOCK_DEFAULTS as Record<string, Record<string, unknown>>)[type] ??
        ({ ...BLOG_BLOCK_DEFAULTS.paragraph } as Record<string, unknown>);
      const block = { id, type, data: { ...defaults, ...data } } as BlogBlock;
      if (type === 'columns') {
        const layout = String(block.data.layout ?? '50-50');
        const zones = normalizeColumnZones(block.data.columns, layout);
        block.data = {
          ...block.data,
          columns: zones.map((z) => ({ blocks: parseBlogBlocks(z.blocks) })),
        };
      }
      return block;
    })
    .filter(Boolean) as BlogBlock[];
  // Strip scripts / event handlers from HTML-bearing fields (public render + editor load).
  return sanitizeBlogBlocksDeep(parsed);
}

/** Block types that open the full-screen edit modal when inserted from the picker. */
const MODAL_ON_INSERT_TYPES = new Set<BlogBlockType>([]);

type State = {
  blocks: BlogBlock[];
  selectedBlockId: string | null;
  blockPickerOpen: boolean;
  /** @deprecated Use blockPickerInsertIndex — kept for callers still passing afterId. */
  blockPickerAfter: string | null;
  /** Index at which the next picked block is inserted (0 = before first). */
  blockPickerInsertIndex: number | null;
  /** When set, the block editor modal is open for this block id. */
  blockEditModalId: string | null;
  isDirty: boolean;
  past: WidgetHistoryEntry[];
  future: WidgetHistoryEntry[];
  previewDevice: EditorDevice;
  previewActive: boolean;
  styleClipboard: BlogBlock | null;
  loadBlocks: (raw: unknown) => void;
  resetBlocks: () => void;
  addBlock: (type: BlogBlockType, at?: number | string | null, data?: Record<string, unknown>) => string;
  updateBlock: (id: string, data: Record<string, unknown>) => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (oldIndex: number, newIndex: number) => void;
  /** Replace a single block with one or more blocks at the same index (e.g. split composite block). */
  replaceBlockWithMany: (id: string, newBlocks: BlogBlock[]) => void;
  reorderNestedBlock: (parentColumnsId: string, columnIndex: number, oldIndex: number, newIndex: number) => void;
  relocateNestedBlock: (blockId: string, targetParentId: string, targetColumn: number, targetIndex: number) => void;
  setBlocks: (blocks: BlogBlock[]) => void;
  selectBlock: (id: string | null) => void;
  openBlockEditModal: (id: string) => void;
  closeBlockEditModal: () => void;
  openBlockPicker: (afterId?: string | null) => void;
  /** Open the picker to insert at a list index (0 = before the first block). */
  openBlockPickerAt: (index: number) => void;
  closeBlockPicker: () => void;
  markClean: () => void;
  markDirty: () => void;
  undoWidgets: () => void;
  redoWidgets: () => void;
  /** Restore the snapshot stored at pastIndex and keep later states available to redo. */
  jumpWidgets: (pastIndex: number) => void;
  /** Replace the tree and record a labeled structural change. Text edits stay on updateBlock. */
  commitBlocks: (blocks: BlogBlock[], label: string, selectedBlockId?: string | null) => void;
  setPreviewDevice: (device: EditorDevice) => void;
  setPreviewActive: (active: boolean) => void;
  copyWidgetStyle: () => void;
  pasteWidgetStyle: () => void;
  insertBlocks: (incoming: BlogBlock[], at: number, label?: string) => void;
  replaceTopLevel: (id: string, next: BlogBlock) => void;
};

function remembered(s: { past: WidgetHistoryEntry[]; blocks: BlogBlock[] }, label: string) {
  return { past: pushHistory(s.past, s.blocks, label), future: [] as WidgetHistoryEntry[] };
}

export const useBlogEditorStore = create<State>((set) => ({
  blocks: [],
  selectedBlockId: null,
  blockPickerOpen: false,
  blockPickerAfter: null,
  blockPickerInsertIndex: null,
  blockEditModalId: null,
  isDirty: false,
  past: [],
  future: [],
  previewDevice: 'desktop',
  previewActive: false,
  styleClipboard: null,

  loadBlocks: (raw) =>
    set({
      blocks: parseBlogBlocks(raw),
      selectedBlockId: null,
      blockPickerOpen: false,
      blockPickerAfter: null,
      blockPickerInsertIndex: null,
      blockEditModalId: null,
      isDirty: false,
      past: [],
      future: [],
    }),

  resetBlocks: () =>
    set({
      blocks: [],
      selectedBlockId: null,
      blockPickerOpen: false,
      blockPickerAfter: null,
      blockPickerInsertIndex: null,
      blockEditModalId: null,
      isDirty: false,
      past: [],
      future: [],
    }),

  addBlock: (type, at = null, data = {}) => {
    const block = createBlogBlock(type, data);
    const openModal = MODAL_ON_INSERT_TYPES.has(type);
    const addedLabel = `Added ${BLOG_BLOCK_LABELS[type] ?? type}`;
    set((s) => {
      const blocks = [...s.blocks];
      let insertAt = blocks.length;

      if (typeof at === 'number' && !Number.isNaN(at)) {
        insertAt = Math.min(Math.max(0, at), blocks.length);
      } else if (typeof at === 'string' && at) {
        const idx = blocks.findIndex((b) => b.id === at);
        insertAt = idx === -1 ? blocks.length : idx + 1;
      } else if (s.blockPickerInsertIndex != null) {
        insertAt = Math.min(Math.max(0, s.blockPickerInsertIndex), blocks.length);
      }

      blocks.splice(insertAt, 0, block);
      return {
        ...remembered(s, addedLabel),
        blocks,
        isDirty: true,
        selectedBlockId: block.id,
        blockPickerOpen: false,
        blockPickerAfter: null,
        blockPickerInsertIndex: null,
        blockEditModalId: openModal ? block.id : s.blockEditModalId,
      };
    });
    return block.id;
  },

  updateBlock: (id, data) =>
    set((s) => ({
      blocks: updateBlockInTree(s.blocks, id, data),
      isDirty: true,
      future: [],
    })),

  deleteBlock: (id) =>
    set((s) => ({
      ...remembered(s, 'Deleted'),
      blocks: deleteBlockFromTree(s.blocks, id),
      selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
      blockEditModalId: s.blockEditModalId === id ? null : s.blockEditModalId,
      isDirty: true,
    })),

  duplicateBlock: (id) =>
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return s;
      const copy = regenerateBlockIds(s.blocks[idx]!);
      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { ...remembered(s, 'Duplicated'), blocks, isDirty: true, selectedBlockId: copy.id };
    }),

  moveBlock: (oldIndex, newIndex) =>
    set((s) => {
      const blocks = [...s.blocks];
      const [moved] = blocks.splice(oldIndex, 1);
      if (!moved) return s;
      blocks.splice(newIndex, 0, moved);
      return { ...remembered(s, 'Moved'), blocks, isDirty: true };
    }),

  replaceBlockWithMany: (id, newBlocks) =>
    set((s) => {
      if (newBlocks.length === 0) return s;
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return s;
      const blocks = [...s.blocks];
      blocks.splice(idx, 1, ...newBlocks);
      return { ...remembered(s, 'Replaced'), blocks, isDirty: true, selectedBlockId: newBlocks[0]!.id };
    }),

  reorderNestedBlock: (parentColumnsId, columnIndex, oldIndex, newIndex) =>
    set((s) => ({
      ...remembered(s, 'Moved'),
      blocks: moveNestedWithinColumn(s.blocks, parentColumnsId, columnIndex, oldIndex, newIndex),
      isDirty: true,
    })),

  relocateNestedBlock: (blockId, targetParentId, targetColumn, targetIndex) =>
    set((s) => ({
      ...remembered(s, 'Moved'),
      blocks: relocateNestedBlock(s.blocks, blockId, targetParentId, targetColumn, targetIndex),
      isDirty: true,
      selectedBlockId: blockId,
    })),

  setBlocks: (blocks) => set({ blocks, isDirty: true }),

  selectBlock: (id) => set({ selectedBlockId: id }),

  openBlockEditModal: (id) => set({ blockEditModalId: id, selectedBlockId: id }),

  closeBlockEditModal: () => set({ blockEditModalId: null }),

  openBlockPicker: (afterId = null) =>
    set((s) => {
      let index = s.blocks.length;
      if (afterId) {
        const idx = s.blocks.findIndex((b) => b.id === afterId);
        if (idx !== -1) index = idx + 1;
      }
      return { blockPickerOpen: true, blockPickerAfter: afterId, blockPickerInsertIndex: index };
    }),

  openBlockPickerAt: (index) =>
    set((s) => ({
      blockPickerOpen: true,
      blockPickerAfter: null,
      blockPickerInsertIndex: Math.min(Math.max(0, index), s.blocks.length),
    })),

  closeBlockPicker: () => set({ blockPickerOpen: false, blockPickerAfter: null, blockPickerInsertIndex: null }),

  markClean: () => set({ isDirty: false }),

  markDirty: () => set({ isDirty: true }),

  undoWidgets: () =>
    set((s) => {
      const previous = s.past[s.past.length - 1];
      if (!previous) return s;
      return {
        blocks: cloneBlocks(previous.blocks),
        past: s.past.slice(0, -1),
        future: [...s.future, { label: previous.label, blocks: cloneBlocks(s.blocks) }],
        isDirty: true,
      };
    }),

  redoWidgets: () =>
    set((s) => {
      const next = s.future[s.future.length - 1];
      if (!next) return s;
      return {
        blocks: cloneBlocks(next.blocks),
        future: s.future.slice(0, -1),
        past: [...s.past, { label: next.label, blocks: cloneBlocks(s.blocks) }],
        isDirty: true,
      };
    }),

  jumpWidgets: (pastIndex) =>
    set((s) => {
      const entry = s.past[pastIndex];
      if (!entry) return s;
      const forward = [...s.past.slice(pastIndex + 1), { label: entry.label, blocks: cloneBlocks(s.blocks) }];
      return {
        blocks: cloneBlocks(entry.blocks),
        past: s.past.slice(0, pastIndex),
        future: [...s.future, ...forward.reverse()],
        isDirty: true,
      };
    }),

  commitBlocks: (blocks, label, selectedBlockId) =>
    set((s) => ({
      ...remembered(s, label),
      blocks,
      isDirty: true,
      selectedBlockId: selectedBlockId === undefined ? s.selectedBlockId : selectedBlockId,
    })),

  setPreviewDevice: (device) => set({ previewDevice: device }),

  setPreviewActive: (active) => set({ previewActive: active }),

  copyWidgetStyle: () =>
    set((s) => {
      const block = s.selectedBlockId ? findSelected(s.blocks, s.selectedBlockId) : null;
      if (!block) return s;
      const copy = cloneBlocks([block])[0];
      if (!copy) return s;
      copy.data = { ...copy.data, ...stylePatchFor(block) };
      return { styleClipboard: copy };
    }),

  pasteWidgetStyle: () =>
    set((s) => {
      if (!s.styleClipboard || !s.selectedBlockId) return s;
      const target = findSelected(s.blocks, s.selectedBlockId);
      if (!target) return s;
      const patch = pasteStylePatch(s.styleClipboard, target);
      if (!patch) return s;
      return {
        ...remembered(s, 'Pasted style'),
        blocks: updateBlockInTree(s.blocks, target.id, patch),
        isDirty: true,
      };
    }),

  insertBlocks: (incoming, at, label = 'Added section') =>
    set((s) => {
      if (!incoming.length) return s;
      const blocks = [...s.blocks];
      const index = Math.min(Math.max(0, at), blocks.length);
      blocks.splice(index, 0, ...incoming);
      return { ...remembered(s, label), blocks, isDirty: true, selectedBlockId: incoming[0]!.id };
    }),

  replaceTopLevel: (id, next) =>
    set((s) => {
      const idx = s.blocks.findIndex((block) => block.id === id);
      if (idx === -1) return s;
      const blocks = [...s.blocks];
      blocks[idx] = next;
      return { ...remembered(s, 'Replaced section'), blocks, isDirty: true, selectedBlockId: next.id };
    }),
}));

function findSelected(blocks: BlogBlock[], id: string): BlogBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type !== 'columns' || !Array.isArray(block.data.columns)) continue;
    for (const zone of block.data.columns) {
      const nested = zone && typeof zone === 'object' ? (zone as { blocks?: BlogBlock[] }).blocks : undefined;
      const hit = nested?.find((item) => item.id === id);
      if (hit) return hit;
    }
  }
  return null;
}
