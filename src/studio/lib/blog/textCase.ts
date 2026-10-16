import type { Editor } from '@tiptap/core';
import { restoreToolbarEditorSelection } from '../tiptapTextStyleCommands';

export const TEXT_CASE_OPTIONS = [
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'title', label: 'Title Case' },
  { value: 'sentence', label: 'Sentence case' },
] as const;

export type TextCaseOption = (typeof TEXT_CASE_OPTIONS)[number]['value'];

export function applyTextCase(text: string, mode: TextCaseOption): string {
  if (mode === 'uppercase') return text.toLocaleUpperCase();
  if (mode === 'lowercase') return text.toLocaleLowerCase();
  if (mode === 'title') {
    return text.replace(/[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F']*/g, (word) => {
      return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
    });
  }
  return text.toLocaleLowerCase().replace(/(^\s*|[.!?]\s+)([a-z\u00E0-\u00FF])/g, (match, prefix: string, letter: string) => {
    return `${prefix}${letter.toLocaleUpperCase()}`;
  });
}

export function applyEditorTextCase(editor: Editor, mode: TextCaseOption): boolean {
  if (editor.isDestroyed) return false;
  restoreToolbarEditorSelection(editor);
  const { empty, from, to, $from } = editor.state.selection;
  const start = empty ? $from.start($from.depth) : from;
  const end = empty ? $from.end($from.depth) : to;
  if (start >= end) return false;

  const replacements: { from: number; to: number; text: string }[] = [];
  editor.state.doc.nodesBetween(start, end, (node, pos) => {
    if (!node.isText || !node.text) return;
    const fromPos = Math.max(start, pos);
    const toPos = Math.min(end, pos + node.nodeSize);
    if (fromPos >= toPos) return;
    const slice = node.text.slice(fromPos - pos, toPos - pos);
    const next = applyTextCase(slice, mode);
    if (next !== slice) replacements.push({ from: fromPos, to: toPos, text: next });
  });
  if (!replacements.length) return false;

  let tr = editor.state.tr;
  for (let i = replacements.length - 1; i >= 0; i -= 1) {
    const item = replacements[i];
    if (!item) continue;
    tr = tr.insertText(item.text, item.from, item.to);
  }
  editor.view.dispatch(tr);
  editor.chain().setTextSelection({ from: start, to: start + (end - start) }).focus().run();
  return true;
}
