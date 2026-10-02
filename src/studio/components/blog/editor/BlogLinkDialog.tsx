import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type Props = {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
};

export default function BlogLinkDialog({ editor, open, onClose }: Props) {
  const [href, setHref] = useState('');
  const [targetBlank, setTargetBlank] = useState(true);
  const [internalQ, setInternalQ] = useState('');
  const [internalHits, setInternalHits] = useState<Array<{ title: string; slug: string }>>([]);

  useEffect(() => {
    if (!open || !editor) return;
    const prev = editor.getAttributes('link') as { href?: string; target?: string | null };
    setHref(prev.href ?? '');
    setTargetBlank(prev.target === '_blank' || prev.target == null);
  }, [open, editor]);

  useEffect(() => {
    if (!open) return;
    const q = internalQ.trim();
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('contents')
        .select('title,slug')
        .eq('kind', 'page')
        .eq('status', 'published')
        .ilike('title', `%${q}%`)
        .limit(12);
      if (!cancelled) setInternalHits((data as Array<{ title: string; slug: string }>) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [internalQ, open]);

  if (!open) return null;

  const apply = () => {
    if (!editor) return;
    const url = href.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onClose();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url, target: targetBlank ? '_blank' : null })
      .run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div data-blog-editor-chrome className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Insert link</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">URL</label>
        <input
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://… or #section-id"
          className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue/50"
        />
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={targetBlank}
            onChange={(e) => setTargetBlank(e.target.checked)}
            className="rounded border-slate-300 text-brand-blue"
          />
          Open in new tab
        </label>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Link to published post</p>
          <input
            value={internalQ}
            onChange={(e) => setInternalQ(e.target.value)}
            placeholder="Search by title…"
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none"
          />
          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-100">
            {internalHits.map((h) => (
              <button
                key={h.slug}
                type="button"
                onClick={() => setHref(`/${encodeURIComponent(h.slug)}`)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-800">{h.title}</span>
                <span className="font-mono text-[10px] text-slate-400">/{h.slug}</span>
              </button>
            ))}
            {internalHits.length === 0 ? <p className="px-3 py-4 text-center text-xs text-slate-400">No matches.</p> : null}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
