import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { readSkillItems } from '../../../lib/blog/marketingWidgets';

export default function BlogSkillBarBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const items = readSkillItems(block.data as Record<string, unknown>);
  const heading = String(block.data.heading ?? '').trim();

  const bars = (
    <section className="blog-skill-bars my-6 space-y-5">
      {heading ? <h3 className="text-xl font-black text-slate-900">{heading}</h3> : null}
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </div>
          <div className="h-[3px] overflow-hidden bg-slate-100">
            <div className="h-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
          </div>
        </div>
      ))}
    </section>
  );

  if (!isEditing) return bars;

  return (
    <div className="space-y-3">
      <input
        value={String(block.data.heading ?? '')}
        onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
        placeholder="Optional heading"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      {items.map((item, index) => (
        <div key={`skill-${index}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_80px_80px]">
          <input
            value={item.label}
            onChange={(event) => {
              const next = items.map((row, i) => (i === index ? { ...row, label: event.target.value } : row));
              updateBlock(block.id, { items: next });
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={item.value}
            onChange={(event) => {
              const next = items.map((row, i) => (i === index ? { ...row, value: Number(event.target.value) || 0 } : row));
              updateBlock(block.id, { items: next });
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="color"
            value={item.color}
            onChange={(event) => {
              const next = items.map((row, i) => (i === index ? { ...row, color: event.target.value } : row));
              updateBlock(block.id, { items: next });
            }}
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200"
          />
        </div>
      ))}
      <button
        type="button"
        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold"
        onClick={() => updateBlock(block.id, { items: [...items, { label: 'New skill', value: 50, color: '#7c3aed' }] })}
      >
        Add skill
      </button>
      {bars}
    </div>
  );
}
