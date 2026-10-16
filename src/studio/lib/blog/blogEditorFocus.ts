/** True when the caret is in the middle of a paragraph, so a list should start there — not wrap the whole block. */
export function shouldSplitTextblockBeforeList(parentOffset: number, parentSize: number): boolean {
  return parentOffset > 0 && parentOffset < parentSize
}

/** Canvas and the left panel each have a TipTap instance for the same block. */

export function pickFocusedEditor<T>(
  editors: { editor: T; hasFocus: boolean }[],
  lastFocused: T | null,
): T | null {
  const focused = editors.find((item) => item.hasFocus);
  if (focused) return focused.editor;
  if (lastFocused && editors.some((item) => item.editor === lastFocused)) return lastFocused;
  return editors[0]?.editor ?? null;
}
