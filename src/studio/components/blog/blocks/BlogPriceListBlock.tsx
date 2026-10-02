import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type Row = { label: string; price: string; detail: string };

export default function BlogPriceListBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const heading = String(block.data.heading ?? '');
  const raw = Array.isArray(block.data.items) ? block.data.items : [];
  const items: Row[] =
    raw.length > 0
      ? raw.map((r: unknown) => {
          const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return {
            label: String(o.label ?? ''),
            price: String(o.price ?? ''),
            detail: String(o.detail ?? ''),
          };
        })
      : [{ label: '', price: '', detail: '' }];

  const setItems = (next: Row[]) => updateBlock(block.id, { items: next });

  if (!isEditing) {
    return (
      <section className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {heading.trim() ? <h3 className="mb-4 text-lg font-black text-brand-blue">{heading}</h3> : null}
        <ul className="divide-y divide-slate-100">
          {items.map((it, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0">
              <div className="min-w-0">
                <span className="font-bold text-slate-900">{it.label}</span>
                {it.detail.trim() ? <p className="text-xs text-slate-500">{it.detail}</p> : null}
              </div>
              <span className="shrink-0 font-black text-brand-blue">{it.price}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <input
        value={heading}
        onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
        placeholder="Section heading (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      {items.map((it, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <input
            value={it.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, label: e.target.value };
              setItems(next);
            }}
            placeholder="Item / service"
            className="min-w-[8rem] flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
          <input
            value={it.price}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, price: e.target.value };
              setItems(next);
            }}
            placeholder="$99"
            className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm font-black"
          />
          <input
            value={it.detail}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, detail: e.target.value };
              setItems(next);
            }}
            placeholder="Note"
            className="min-w-[6rem] flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs"
          />
          <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { label: '', price: '', detail: '' }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs font-black uppercase"
      >
        <Plus className="h-4 w-4" /> Add line
      </button>
    </div>
  );
}
