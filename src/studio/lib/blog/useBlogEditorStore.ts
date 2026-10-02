import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { BLOG_BLOCK_DEFAULTS, type BlogBlock, type BlogBlockType } from './blogBlockTypes';
import { normalizeColumnZones } from './columnLayouts';
import { deleteBlockFromTree, updateBlockInTree, moveNestedWithinColumn } from './blogBlockTree';
import { sanitizeBlogBlockHtml, sanitizeBlogBlocksDeep } from './sanitizeBlogBlockHtml';

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

/** One paragraph block holding legacy / RSS HTML so the block editor can run immediately. */
export function htmlBodyToEditorBlocks(html: string): BlogBlock[] {
  const text = sanitizeBlogBlockHtml(html.trim() || '<p></p>') || '<p></p>';
  return [{ id: nanoid(), type: 'paragraph', data: { text } }];
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
const MODAL_ON_INSERT_TYPES = new Set<BlogBlockType>(['slideshow']);

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
};

export const useBlogEditorStore = create<State>((set) => ({
  blocks: [],
  selectedBlockId: null,
  blockPickerOpen: false,
  blockPickerAfter: null,
  blockPickerInsertIndex: null,
  blockEditModalId: null,
  isDirty: false,

  loadBlocks: (raw) =>
    set({
      blocks: parseBlogBlocks(raw),
      selectedBlockId: null,
      blockPickerOpen: false,
      blockPickerAfter: null,
      blockPickerInsertIndex: null,
      blockEditModalId: null,
      isDirty: false,
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
    }),

  addBlock: (type, at = null, data = {}) => {
    const block = createBlogBlock(type, data);
    const openModal = MODAL_ON_INSERT_TYPES.has(type);
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
    })),

  deleteBlock: (id) =>
    set((s) => ({
      blocks: deleteBlockFromTree(s.blocks, id),
      selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
      blockEditModalId: s.blockEditModalId === id ? null : s.blockEditModalId,
      isDirty: true,
    })),

  duplicateBlock: (id) =>
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return s;
      const original = s.blocks[idx];
      const copy: BlogBlock = {
        ...original,
        id: nanoid(),
        data: JSON.parse(JSON.stringify(original.data)) as Record<string, unknown>,
      };
      const blocks = [...s.blocks];
      blocks.splice(idx + 1, 0, copy);
      return { blocks, isDirty: true, selectedBlockId: copy.id };
    }),

  moveBlock: (oldIndex, newIndex) =>
    set((s) => {
      const blocks = [...s.blocks];
      const [moved] = blocks.splice(oldIndex, 1);
      if (!moved) return s;
      blocks.splice(newIndex, 0, moved);
      return { blocks, isDirty: true };
    }),

  replaceBlockWithMany: (id, newBlocks) =>
    set((s) => {
      if (newBlocks.length === 0) return s;
      const idx = s.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return s;
      const blocks = [...s.blocks];
      blocks.splice(idx, 1, ...newBlocks);
      return { blocks, isDirty: true, selectedBlockId: newBlocks[0]!.id };
    }),

  reorderNestedBlock: (parentColumnsId, columnIndex, oldIndex, newIndex) =>
    set((s) => ({
      blocks: moveNestedWithinColumn(s.blocks, parentColumnsId, columnIndex, oldIndex, newIndex),
      isDirty: true,
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
}));
