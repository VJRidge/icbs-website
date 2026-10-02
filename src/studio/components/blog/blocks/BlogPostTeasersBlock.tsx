import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type Item = { title: string; slug: string; excerpt: string; imageUrl: string };

export default function BlogPostTeasersBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const raw = Array.isArray(block.data.items) ? block.data.items : [];
  const items: Item[] =
    raw.length > 0
      ? raw.map((r: unknown) => {
          const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return {
            title: String(o.title ?? ''),
            slug: String(o.slug ?? ''),
            excerpt: String(o.excerpt ?? ''),
            imageUrl: String(o.imageUrl ?? ''),
          };
        })
      : [{ title: '', slug: '', excerpt: '', imageUrl: '' }];
  const columns = Number(block.data.columns) === 3 ? 3 : 2;

  const setItems = (next: Item[]) => updateBlock(block.id, { items: next });

  if (!isEditing) {
    return (
      <section
        className="my-10 grid gap-6"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items
          .filter((it) => it.title.trim() || it.slug.trim())
          .map((it, i) => {
            const to = it.slug.trim() ? `/${encodeURIComponent(it.slug.trim())}` : '#';
            return (
              <article key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <a href={to} className="block">
                  {it.imageUrl.trim() ? (
                    <img src={it.imageUrl.trim()} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="aspect-[16/10] w-full bg-gradient-to-br from-brand-blue/20 to-brand-yellow/30" />
                  )}
                  <div className="p-4">
                    <h3 className="font-black text-brand-blue line-clamp-2">{it.title}</h3>
                    {it.excerpt.trim() ? <p className="mt-2 text-sm text-slate-600 line-clamp-3">{it.excerpt}</p> : null}
                  </div>
                </a>
              </article>
            );
          })}
      </section>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex gap-2">
        {([2, 3] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateBlock(block.id, { columns: c })}
            className={`rounded-lg px-3 py-1 text-xs font-black ${columns === c ? 'bg-brand-blue text-brand-yellow' : 'bg-white'}`}
          >
            {c} cols
          </button>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={it.title}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, title: e.target.value };
              setItems(next);
            }}
            placeholder="Title"
            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm font-black"
          />
          <input
            value={it.slug}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, slug: e.target.value };
              setItems(next);
            }}
            placeholder="Slug (URL segment)"
            className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-xs"
          />
          <textarea
            value={it.excerpt}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, excerpt: e.target.value };
              setItems(next);
            }}
            placeholder="Excerpt"
            rows={2}
            className="w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
          <input
            value={it.imageUrl}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, imageUrl: e.target.value };
              setItems(next);
            }}
            placeholder="Card image URL"
            className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-xs"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { title: '', slug: '', excerpt: '', imageUrl: '' }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs font-black uppercase"
      >
        <Plus className="h-4 w-4" /> Add card
      </button>
    </div>
  );
}
