import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type Item = { value: string; label: string; icon: string };

export default function BlogStatsBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const items = (Array.isArray(block.data.items) ? block.data.items : []) as Item[];
  const columns = Math.min(6, Math.max(1, Number(block.data.columns) || 3));

  const normalized: Item[] =
    items.length > 0
      ? items.map((r) => ({
          value: String((r as Item).value ?? ''),
          label: String((r as Item).label ?? ''),
          icon: String((r as Item).icon ?? ''),
        }))
      : [{ value: '1K+', label: 'Alumni', icon: '🎓' }];

  if (!isEditing) {
    return (
      <section
        className="my-8 grid gap-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 sm:px-8"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {normalized.map((it, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl">{it.icon}</div>
            <div className="mt-2 font-serif text-2xl font-black text-brand-blue md:text-3xl">{it.value}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{it.label}</div>
          </div>
        ))}
      </section>
    );
  }

  const setItems = (next: Item[]) => updateBlock(block.id, { items: next });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
        Columns
        <input
          type="number"
          min={1}
          max={6}
          value={columns}
          onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) || 3 })}
          className="w-16 rounded border border-slate-200 px-2 py-1"
        />
      </label>
      <div className="space-y-3">
        {normalized.map((it, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 p-2">
            <input
              value={it.icon}
              onChange={(e) => {
                const next = [...normalized];
                next[i] = { ...it, icon: e.target.value };
                setItems(next);
              }}
              className="w-14 rounded border border-slate-200 px-1 py-2 text-center text-lg"
              placeholder="🎓"
            />
            <input
              value={it.value}
              onChange={(e) => {
                const next = [...normalized];
                next[i] = { ...it, value: e.target.value };
                setItems(next);
              }}
              placeholder="1K+"
              className="w-24 rounded border border-slate-200 px-2 py-2 text-sm font-black"
            />
            <input
              value={it.label}
              onChange={(e) => {
                const next = [...normalized];
                next[i] = { ...it, label: e.target.value };
                setItems(next);
              }}
              placeholder="Label"
              className="min-w-[8rem] flex-1 rounded border border-slate-200 px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setItems(normalized.filter((_, j) => j !== i))}
              className="rounded p-2 text-red-500 hover:bg-red-50"
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems([...normalized, { value: '', label: '', icon: '⭐' }])}
        className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-black uppercase text-slate-600"
      >
        <Plus className="h-4 w-4" /> Add stat
      </button>
    </div>
  );
}
