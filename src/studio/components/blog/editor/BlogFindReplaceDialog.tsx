import { useState } from 'react';
import type { Editor } from '@tiptap/core';
import { X } from 'lucide-react';

type Props = {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
};

/** Basic whole-document find/replace on HTML (preserves most structure). */
export default function BlogFindReplaceDialog({ editor, open, onClose }: Props) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');

  if (!open || !editor) return null;

  const replaceAll = () => {
    if (!find.trim()) return;
    const html = editor.getHTML();
    const parts = html.split(find);
    if (parts.length <= 1) {
      window.alert('No matches.');
      return;
    }
    const next = parts.join(replace);
    editor.commands.setContent(next, false);
    onClose();
    window.alert(`Replaced ${parts.length - 1} occurrence(s).`);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div data-blog-editor-chrome className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Find & replace</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Find</label>
        <input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
        />
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Replace with</label>
        <input
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
        />
        <p className="mb-4 text-[11px] leading-relaxed text-slate-500">
          Replaces plain text in the HTML output. Use carefully with rich content; prefer short phrases.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={replaceAll}
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow"
          >
            Replace all
          </button>
        </div>
      </div>
    </div>
  );
}
