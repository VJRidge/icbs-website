import { useMemo } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';

type AccRow = { title: string; html: string; open: boolean };

function normalizeItems(block: BlogBlock): AccRow[] {
  const raw = Array.isArray(block.data.items) ? block.data.items : [];
  return raw.map((t: unknown) => {
    const o = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};
    return {
      title: String(o.title ?? 'Section'),
      html: typeof o.html === 'string' ? o.html : '',
      open: Boolean(o.open),
    };
  });
}

export default function BlogAccordionBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const items = useMemo(() => normalizeItems(block), [block]);

  const setItems = (next: AccRow[]) => updateBlock(block.id, { items: next });

  if (!isEditing) {
    if (!items.length) return null;
    return (
      <section className="my-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {items.map((it, i) => (
          <details key={`acc-${i}-${it.title}`} open={it.open} className="group px-4 py-1">
            <summary className="cursor-pointer list-none py-3 font-black text-brand-blue marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex w-full items-center justify-between gap-2">
                <span>{it.title || `Section ${i + 1}`}</span>
                <span className="text-slate-400 transition-transform group-open:rotate-180">▾</span>
              </span>
            </summary>
            <div
              className="prose prose-slate max-w-none pb-4 prose-headings:font-black prose-headings:text-brand-blue"
              dangerouslySetInnerHTML={{ __html: sanitizeBlogBlockHtml(it.html || '<p></p>') || '<p></p>' }}
            />
          </details>
        ))}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        onClick={() =>
          setItems([...items, { title: `Section ${items.length + 1}`, html: '<p></p>', open: false }])
        }
      >
        Add section
      </button>

      {items.map((it, i) => (
        <div key={`acc-edit-${block.id}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={it.open}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], open: e.target.checked };
                  setItems(next);
                }}
              />
              Open by default
            </label>
            <button
              type="button"
              disabled={items.length <= 1}
              onClick={() => {
                const next = items.filter((_, j) => j !== i);
                setItems(next.length ? next : [{ title: 'Section 1', html: '', open: false }]);
              }}
              className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
          <input
            value={it.title}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], title: e.target.value };
              setItems(next);
            }}
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">HTML body</label>
          <textarea
            value={it.html}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], html: e.target.value };
              setItems(next);
            }}
            rows={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  );
}
