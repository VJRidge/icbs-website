import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { shouldSplitTextblockBeforeList } from './blog/blogEditorFocus';

export type ToolbarTextSelection = { from: number; to: number };

const savedToolbarSelection = new WeakMap<Editor, ToolbarTextSelection>();
const frozenToolbarSelection = new WeakMap<Editor, ToolbarTextSelection>();

/** Decide which range to keep when the toolbar steals focus. */
export function rememberedToolbarSelection(args: {
  live: ToolbarTextSelection;
  frozen?: ToolbarTextSelection;
  previouslySaved?: ToolbarTextSelection;
  editorHasFocus: boolean;
}): ToolbarTextSelection | undefined {
  const { live, frozen, previouslySaved, editorHasFocus } = args;
  if (live.from !== live.to) return live;
  if (frozen && frozen.from !== frozen.to) return frozen;
  if (editorHasFocus) return live;
  return previouslySaved;
}

/**
 * Snapshot TipTap selection before toolbar controls steal focus.
 * Keeps a caret so lists start where the user clicked, not at the top of the box.
 */
export function saveToolbarEditorSelection(editor: Editor): void {
  const live = { from: editor.state.selection.from, to: editor.state.selection.to };
  const next = rememberedToolbarSelection({
    live,
    frozen: frozenToolbarSelection.get(editor),
    previouslySaved: savedToolbarSelection.get(editor),
    editorHasFocus: editor.view.hasFocus(),
  });
  if (next) savedToolbarSelection.set(editor, next);
  if (live.from !== live.to) frozenToolbarSelection.delete(editor);
}

/** After the toolbar steals focus, put the caret back — not an older color highlight. */
export function selectionToRestore(args: {
  live: ToolbarTextSelection;
  saved?: ToolbarTextSelection;
  frozen?: ToolbarTextSelection;
  editorHasFocus: boolean;
}): ToolbarTextSelection | undefined {
  if (args.editorHasFocus) return args.live;
  return args.saved ?? args.frozen ?? args.live;
}

/** Put the caret or highlight back before a toolbar command (lists, indent, marks). */
export function restoreToolbarEditorSelection(editor: Editor): boolean {
  if (editor.isDestroyed) return false;
  const target = selectionToRestore({
    live: { from: editor.state.selection.from, to: editor.state.selection.to },
    saved: savedToolbarSelection.get(editor),
    frozen: frozenToolbarSelection.get(editor),
    editorHasFocus: editor.view.hasFocus(),
  });
  if (!target) {
    return editor.chain().focus().run();
  }
  const docSize = editor.state.doc.content.size;
  const from = Math.max(0, Math.min(target.from, docSize));
  const to = Math.max(0, Math.min(target.to, docSize));
  return editor.chain().setTextSelection({ from, to }).focus().run();
}

/** Lock the current highlight before a toolbar control takes focus. */
export function freezeToolbarEditorSelection(editor: Editor): void {
  let from = editor.state.selection.from;
  let to = editor.state.selection.to;
  if (from === to) {
    const saved = savedToolbarSelection.get(editor);
    if (!saved || saved.from === saved.to) return;
    from = saved.from;
    to = saved.to;
  }
  const range = { from, to };
  savedToolbarSelection.set(editor, range);
  frozenToolbarSelection.set(editor, range);
}

export function peekToolbarEditorSelection(editor: Editor): ToolbarTextSelection | undefined {
  return savedToolbarSelection.get(editor);
}

/** Keep the last non-empty highlight so toolbar controls can apply after blur. */
export function attachToolbarSelectionMemory(editor: Editor): () => void {
  const remember = () => {
    if (editor.view.hasFocus()) saveToolbarEditorSelection(editor);
  };
  editor.on('selectionUpdate', remember);
  return () => {
    editor.off('selectionUpdate', remember);
  };
}

type ApplyInlineOptions = {
  refocus?: boolean;
};

export function getCurrentTextblockRange(editor: Editor): ToolbarTextSelection {
  const { $from } = editor.state.selection;
  return { from: $from.start($from.depth), to: $from.end($from.depth) };
}

export function collapseSelectionToCurrentTextblock(editor: Editor): void {
  if (editor.isDestroyed) return;
  const { $from } = editor.state.selection;
  const blockStart = $from.start($from.depth);
  const blockEnd = $from.end($from.depth);
  const anchor = Math.min(Math.max($from.pos, blockStart), blockEnd);
  editor.chain().setTextSelection({ from: anchor, to: anchor }).focus().run();
}

export function applyEditorBlockAlign(
  editor: Editor,
  align: 'left' | 'center' | 'right' | 'justify',
): boolean {
  if (editor.isDestroyed) return false;

  const { tr, doc } = editor.state;
  doc.forEach((node, offset) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      tr.setNodeMarkup(offset, undefined, { ...node.attrs, textAlign: align });
    }
  });

  editor.view.dispatch(tr);
  collapseSelectionToCurrentTextblock(editor);
  savedToolbarSelection.delete(editor);
  return true;
}

/** Prefer live highlight; fall back to saved/frozen range after toolbar focus loss. */
function resolveToolbarSelectionRange(editor: Editor): { from: number; to: number } | null {
  const docSize = editor.state.doc.content.size;
  const live = editor.state.selection;
  let from = live.from;
  let to = live.to;

  if (from === to) {
    const saved = frozenToolbarSelection.get(editor) ?? savedToolbarSelection.get(editor);
    if (!saved || saved.from === saved.to) return null;
    from = saved.from;
    to = saved.to;
  }

  from = Math.max(0, Math.min(from, docSize));
  to = Math.max(0, Math.min(to, docSize));
  if (from >= to) return null;
  return { from, to };
}

type TextStylePatch = Record<string, string | null | undefined>;

/** Merge textStyle attrs present anywhere in the range (not only at $from). */
function collectTextStyleAttrsInRange(
  editor: Editor,
  from: number,
  to: number,
): Record<string, unknown> {
  const markType = editor.state.schema.marks.textStyle;
  if (!markType) return {};

  const merged: Record<string, unknown> = {};
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    const mark = markType.isInSet(node.marks);
    if (!mark?.attrs) return;
    for (const [key, val] of Object.entries(mark.attrs)) {
      if (val != null && val !== '' && merged[key] == null) {
        merged[key] = val;
      }
    }
  });
  return merged;
}

/**
 * Apply textStyle only on the resolved highlight range — never extendMarkRange
 * (that was coloring entire paragraphs when any textStyle mark was present).
 * Merges with existing size/family/color so controls do not clobber each other.
 */
function applyTextStylePatch(
  editor: Editor,
  patch: TextStylePatch,
  options?: ApplyInlineOptions,
): boolean {
  if (editor.isDestroyed) return false;

  const range = resolveToolbarSelectionRange(editor);
  if (!range) return false;

  const { from, to } = range;
  const { state, view } = editor;
  const markType = state.schema.marks.textStyle;
  if (!markType) return false;

  const merged: Record<string, unknown> = {
    ...collectTextStyleAttrsInRange(editor, from, to),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  let tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
  tr = tr.removeMark(from, to, markType);

  const hasAttrs = Object.values(merged).some((v) => v != null && v !== '');
  if (hasAttrs) {
    tr = tr.addMark(from, to, markType.create(merged));
  }

  view.dispatch(tr);

  // Keep the same range selected so the user can apply multiple styles in a row.
  savedToolbarSelection.set(editor, { from, to });
  frozenToolbarSelection.set(editor, { from, to });

  if (options?.refocus !== false) {
    editor.chain().setTextSelection({ from, to }).focus().run();
  }
  return true;
}

/** Bold toolbar state: active only when every selected text node has a bold mark. */
export function isBoldActiveInSelection(editor: Editor): boolean {
  if (editor.isDestroyed) return false;
  const { from, to, empty } = editor.state.selection;
  if (empty) return editor.isActive('bold');

  let anyText = false;
  let allBold = true;
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    anyText = true;
    if (!node.marks.some((m) => m.type.name === 'bold')) allBold = false;
  });
  return anyText && allBold;
}

function clearToolbarSelectionLocks(editor: Editor): void {
  frozenToolbarSelection.delete(editor);
}

export function releaseFrozenToolbarSelection(editor: Editor): void {
  clearToolbarSelectionLocks(editor);
}

export function applyEditorFontFamily(editor: Editor, fontFamily: string): boolean {
  // Merge into existing textStyle attrs so size/color are not clobbered.
  return applyTextStylePatch(editor, { fontFamily: fontFamily || null });
}

export function applyEditorFontSize(editor: Editor, fontSize: string): boolean {
  return applyTextStylePatch(editor, { fontSize: fontSize || null });
}

export function applyEditorFontWeight(editor: Editor, fontWeight: string): boolean {
  return applyTextStylePatch(editor, { fontWeight: fontWeight || null });
}

export function applyEditorTextColor(
  editor: Editor,
  color: string,
  options?: ApplyInlineOptions,
): boolean {
  return applyTextStylePatch(editor, { color: color || null }, options);
}

export function applyEditorHighlight(editor: Editor, color: string): boolean {
  if (editor.isDestroyed) return false;
  const range = resolveToolbarSelectionRange(editor);
  if (!range) return false;

  const { from, to } = range;
  let chain = editor.chain().setTextSelection({ from, to });
  chain = color ? chain.setHighlight({ color }) : chain.unsetHighlight();
  const ran = chain.focus().run();
  if (ran) {
    savedToolbarSelection.set(editor, { from, to });
    frozenToolbarSelection.set(editor, { from, to });
  }
  return ran;
}

export function preserveEditorSelectionOnControlMouseDown(e: { preventDefault: () => void }): void {
  e.preventDefault();
}

export function toggleListAtCaret(editor: Editor, kind: 'bulletList' | 'orderedList' | 'taskList'): boolean {
  restoreToolbarEditorSelection(editor);
  const { empty, $from } = editor.state.selection;
  if (empty && $from.parent.isTextblock && shouldSplitTextblockBeforeList($from.parentOffset, $from.parent.content.size)) {
    editor.chain().focus().splitBlock().run();
  }
  const chain = editor.chain().focus();
  if (kind === 'bulletList') return chain.toggleBulletList().run();
  if (kind === 'orderedList') return chain.toggleOrderedList().run();
  return chain.toggleTaskList().run();
}
