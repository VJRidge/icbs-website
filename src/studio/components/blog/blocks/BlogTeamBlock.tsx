import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type Member = { name: string; role: string; image: string; bio: string };

export default function BlogTeamBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const raw = Array.isArray(block.data.members) ? block.data.members : [];
  const members: Member[] =
    raw.length > 0
      ? raw.map((r: unknown) => {
          const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return {
            name: String(o.name ?? ''),
            role: String(o.role ?? ''),
            image: String(o.image ?? ''),
            bio: String(o.bio ?? ''),
          };
        })
      : [{ name: '', role: '', image: '', bio: '' }];
  const columns = Math.min(4, Math.max(1, Number(block.data.columns) || 3));
  const layout = String(block.data.layout ?? 'grid') === 'scroll' ? 'scroll' : 'grid';

  const setMembers = (next: Member[]) => updateBlock(block.id, { members: next });

  if (!isEditing) {
    const gridClass =
      layout === 'scroll'
        ? 'flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory'
        : 'grid gap-6';
    const cardClass = layout === 'scroll' ? 'min-w-[220px] max-w-[260px] shrink-0 snap-start' : '';

    return (
      <section className="my-10">
        <div
          className={gridClass}
          style={layout === 'grid' ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
        >
          {members.map((m, i) => (
            <article
              key={i}
              className={`overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm ${cardClass}`}
            >
              {m.image.trim() ? (
                <img src={m.image.trim()} alt="" className="aspect-square w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-4xl text-slate-300">👤</div>
              )}
              <div className="p-4">
                <h4 className="font-black text-brand-blue">{m.name}</h4>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{m.role}</p>
                {m.bio.trim() ? <p className="mt-2 text-sm text-slate-600">{m.bio}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-xs font-bold text-slate-600">
          Columns
          <input
            type="number"
            min={1}
            max={4}
            value={columns}
            onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) || 3 })}
            className="ml-2 w-14 rounded border border-slate-200 px-2 py-1"
          />
        </label>
        <div className="flex gap-2">
          {(['grid', 'scroll'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => updateBlock(block.id, { layout: l })}
              className={`rounded-lg px-3 py-1 text-xs font-black uppercase ${layout === l ? 'bg-brand-blue text-brand-yellow' : 'bg-white'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {members.map((m, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={m.image}
            onChange={(e) => {
              const next = [...members];
              next[i] = { ...m, image: e.target.value };
              setMembers(next);
            }}
            placeholder="Photo URL"
            className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-xs"
          />
          <input
            value={m.name}
            onChange={(e) => {
              const next = [...members];
              next[i] = { ...m, name: e.target.value };
              setMembers(next);
            }}
            placeholder="Name"
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm font-black"
          />
          <input
            value={m.role}
            onChange={(e) => {
              const next = [...members];
              next[i] = { ...m, role: e.target.value };
              setMembers(next);
            }}
            placeholder="Role"
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
          />
          <textarea
            value={m.bio}
            onChange={(e) => {
              const next = [...members];
              next[i] = { ...m, bio: e.target.value };
              setMembers(next);
            }}
            placeholder="Bio"
            rows={2}
            className="w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setMembers([...members, { name: '', role: '', image: '', bio: '' }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs font-black uppercase text-slate-600"
      >
        <Plus className="h-4 w-4" /> Add member
      </button>
    </div>
  );
}
