import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { safeHref } from '../../../lib/blog/safeHref';
import { readTickerItems, tickerSpeed } from '../../../lib/blog/marketingWidgets';

export default function BlogNewsTickerBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const items = readTickerItems(block.data as Record<string, unknown>);
  const speed = tickerSpeed(block.data as Record<string, unknown>);
  const loop = [...items, ...items];

  if (!isEditing) {
    return (
      <section className="blog-news-ticker my-4 overflow-hidden border-y border-slate-200 bg-slate-950 py-2 text-white" aria-label="News ticker">
        <div className="blog-news-ticker-track" style={{ animationDuration: `${speed}s` }}>
          {loop.map((item, index) => {
            const href = safeHref(item.url);
            const label = <span className="px-6 text-xs font-black uppercase tracking-[0.2em]">{item.text}</span>;
            return href ? (
              <a key={`${item.text}-${index}`} href={href} className="shrink-0 text-inherit no-underline">
                {label}
              </a>
            ) : (
              <span key={`${item.text}-${index}`} className="shrink-0">
                {label}
              </span>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">News ticker</p>
      {items.map((item, index) => (
        <div key={`tick-${index}`} className="grid gap-2 sm:grid-cols-2">
          <input
            value={item.text}
            onChange={(event) => {
              const next = items.map((row, i) => (i === index ? { ...row, text: event.target.value } : row));
              updateBlock(block.id, { items: next });
            }}
            placeholder="Headline"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={item.url}
            onChange={(event) => {
              const next = items.map((row, i) => (i === index ? { ...row, url: event.target.value } : row));
              updateBlock(block.id, { items: next });
            }}
            placeholder="Optional link"
            className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold"
          onClick={() => updateBlock(block.id, { items: [...items, { text: 'New headline', url: '' }] })}
        >
          Add item
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Speed
          <input
            type="range"
            min={8}
            max={90}
            value={speed}
            onChange={(event) => updateBlock(block.id, { speed: Number(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
