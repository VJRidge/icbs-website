import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type TlItem = { year: string; title: string; body: string };

function normalizeItems(raw: unknown): TlItem[] {
  if (!Array.isArray(raw)) return [{ year: '', title: '', body: '' }];
  return raw.map((row) => {
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      year: String(o.year ?? ''),
      title: String(o.title ?? ''),
      body: String(o.body ?? ''),
    };
  });
}

export default function BlogTimelineBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const variant = (block.data.variant === 'minimal' ? 'minimal' : 'story_dark') as 'story_dark' | 'minimal';
  const quoteText = String(block.data.quoteText ?? '');
  const quoteAttribution = String(block.data.quoteAttribution ?? '');
  const sectionLabel = String(block.data.sectionLabel ?? 'THE TIMELINE').trim() || 'THE TIMELINE';
  const items = normalizeItems(block.data.items);

  const setItems = (next: TlItem[]) => updateBlock(block.id, { items: next });

  if (!isEditing && variant === 'story_dark') {
    return (
      <section className="blog-story-timeline not-prose my-10 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#080f26] px-6 py-10 shadow-xl sm:px-10">
        {quoteText.trim() ? (
          <header className="border-b border-white/10 pb-10">
            <blockquote className="m-0">
              <p className="font-serif text-[clamp(1.35rem,3.5vw,2rem)] font-medium italic leading-snug tracking-tight text-white">
                {quoteText.trim()}
              </p>
              {quoteAttribution.trim() ? (
                <footer className="mt-6 flex items-start gap-3">
                  <span className="mt-2 h-8 w-[3px] shrink-0 bg-[#c9a227]" aria-hidden />
                  <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-[#c9a227]">
                    {quoteAttribution.trim()}
                  </p>
                </footer>
              ) : null}
            </blockquote>
          </header>
        ) : null}

        <div className={quoteText.trim() ? 'pt-8' : ''}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#c9a227]">{sectionLabel}</h2>
            <div className="h-px min-w-[120px] flex-1 bg-gradient-to-r from-[#c9a227]/70 to-transparent" />
          </div>
          <ol className="mt-8 list-none space-y-0 p-0">
            {items.map((it, idx) => (
              <li key={`${idx}-${it.year}`} className="border-t border-white/10 py-8 first:border-t-0 first:pt-0">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,4.5rem)_1fr] sm:gap-10">
                  <div className="font-serif text-[1.65rem] font-bold leading-none text-[#c9a227] sm:pt-0.5">{it.year}</div>
                  <div className="min-w-0 space-y-2">
                    {it.title ? <p className="m-0 font-sans text-base font-semibold leading-snug text-white">{it.title}</p> : null}
                    {it.body ? <p className="m-0 font-sans text-[15px] font-normal leading-relaxed text-slate-400">{it.body}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  if (!isEditing && variant === 'minimal') {
    return (
      <section className="blog-timeline-minimal not-prose my-8 border-l-4 border-brand-blue/40 pl-5">
        {sectionLabel ? <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{sectionLabel}</p> : null}
        <ol className="mt-4 list-none space-y-6 p-0">
          {items.map((it, idx) => (
            <li key={idx}>
              <span className="text-sm font-bold text-brand-blue">{it.year}</span>
              <p className="mt-1 font-semibold text-slate-900">{it.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{it.body}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {(['story_dark', 'minimal'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => updateBlock(block.id, { variant: v })}
            className={`rounded px-2 py-1 text-[11px] font-semibold capitalize ${
              variant === v ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {v === 'story_dark' ? 'Story (dark)' : 'Minimal'}
          </button>
        ))}
      </div>

      {variant === 'story_dark' ? (
        <>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Lead quote</label>
            <textarea
              value={quoteText}
              onChange={(e) => updateBlock(block.id, { quoteText: e.target.value })}
              placeholder="Italic headline quote…"
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Quote attribution</label>
            <input
              value={quoteAttribution}
              onChange={(e) => updateBlock(block.id, { quoteAttribution: e.target.value })}
              placeholder="— JOHN LEWIS · ESSAY TITLE, YEAR"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Section label</label>
        <input
          value={sectionLabel}
          onChange={(e) => updateBlock(block.id, { sectionLabel: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Timeline rows</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2 py-1 text-[11px] font-semibold text-brand-yellow"
            onClick={() => setItems([...items, { year: '', title: '', body: '' }])}
          >
            <Plus size={12} /> Add row
          </button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
              {items.length > 1 ? (
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-500"
                  title="Remove row"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={it.year}
                placeholder="Year"
                className="rounded border border-slate-200 px-2 py-1.5 text-sm font-mono"
                onChange={(e) => {
                  const copy = [...items];
                  copy[idx] = { ...copy[idx], year: e.target.value };
                  setItems(copy);
                }}
              />
              <input
                value={it.title}
                placeholder="Bold line"
                className="sm:col-span-2 rounded border border-slate-200 px-2 py-1.5 text-sm"
                onChange={(e) => {
                  const copy = [...items];
                  copy[idx] = { ...copy[idx], title: e.target.value };
                  setItems(copy);
                }}
              />
            </div>
            <textarea
              value={it.body}
              placeholder="Supporting copy"
              rows={2}
              className="w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-sm"
              onChange={(e) => {
                const copy = [...items];
                copy[idx] = { ...copy[idx], body: e.target.value };
                setItems(copy);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
