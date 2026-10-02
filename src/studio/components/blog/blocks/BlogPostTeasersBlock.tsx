import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { supabaseBrowser } from '../../../../lib/supabaseBrowser';

type Item = { title: string; slug: string; excerpt: string; imageUrl: string };
type Mode = 'latest' | 'manual';

function asItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [{ title: '', slug: '', excerpt: '', imageUrl: '' }];
  return raw.map((r: unknown) => {
    const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
    return {
      title: String(o.title ?? ''),
      slug: String(o.slug ?? ''),
      excerpt: String(o.excerpt ?? ''),
      imageUrl: String(o.imageUrl ?? ''),
    };
  });
}

function TeaserGrid({ items, columns }: { items: Item[]; columns: number }) {
  if (items.length === 0) {
    return <p className="my-8 text-sm text-slate-500">No published posts yet. They’ll show up here after you publish.</p>;
  }
  return (
    <section className="my-10 grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((it, i) => {
        const slug = it.slug.trim().replace(/^\/?(blog\/)?/, '');
        const to = slug ? `/blog/${encodeURIComponent(slug)}` : '/blog';
        return (
          <article
            key={`${slug}-${i}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
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

export default function BlogPostTeasersBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const mode: Mode = block.data.mode === 'manual' ? 'manual' : 'latest';
  const items = asItems(block.data.items);
  const columns = Number(block.data.columns) === 3 ? 3 : 2;
  const filled = items.filter((it) => it.title.trim() || it.slug.trim());
  const [latest, setLatest] = useState<Item[] | null>(null);

  useEffect(() => {
    if (mode === 'manual' && filled.length > 0) return;
    const sb = supabaseBrowser();
    if (!sb) {
      setLatest([]);
      return;
    }
    let gone = false;
    void sb
      .from('contents')
      .select('slug, title, published_document')
      .eq('kind', 'post')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(columns * 2)
      .then(({ data }) => {
        if (gone) return;
        setLatest(
          (data ?? []).map((r) => {
            const doc = r.published_document as { title?: string; excerpt?: string; featured_image_url?: string } | null;
            return {
              title: doc?.title || r.title || '',
              slug: r.slug,
              excerpt: doc?.excerpt ?? '',
              imageUrl: doc?.featured_image_url ?? '',
            };
          }),
        );
      });
    return () => {
      gone = true;
    };
  }, [mode, filled.length, columns]);

  const cards = mode === 'manual' && filled.length > 0 ? filled : latest ?? [];

  if (!isEditing) return <TeaserGrid items={cards} columns={columns} />;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['latest', 'Latest published'],
            ['manual', 'Manual cards'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => updateBlock(block.id, { mode: value })}
            className={`rounded-lg px-3 py-1 text-xs font-black ${mode === value ? 'bg-brand-blue text-brand-yellow' : 'bg-white'}`}
          >
            {label}
          </button>
        ))}
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
      {mode === 'latest' ? (
        <p className="text-xs font-medium text-slate-600">
          Pulls published posts from <span className="font-mono">/blog</span>, newest first. Add this block to any page.
        </p>
      ) : null}
      {mode === 'manual' ? (
        <>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateBlock(block.id, { items: items.filter((_, j) => j !== i) })}
                  className="text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                value={it.title}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...it, title: e.target.value };
                  updateBlock(block.id, { items: next });
                }}
                placeholder="Title"
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm font-black"
              />
              <input
                value={it.slug}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...it, slug: e.target.value };
                  updateBlock(block.id, { items: next });
                }}
                placeholder="Slug (my-post-title)"
                className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-xs"
              />
              <textarea
                value={it.excerpt}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...it, excerpt: e.target.value };
                  updateBlock(block.id, { items: next });
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
                  updateBlock(block.id, { items: next });
                }}
                placeholder="Card image URL"
                className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-xs"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateBlock(block.id, { items: [...items, { title: '', slug: '', excerpt: '', imageUrl: '' }] })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs font-black uppercase"
          >
            <Plus className="h-4 w-4" /> Add card
          </button>
        </>
      ) : (
        <TeaserGrid items={latest ?? []} columns={columns} />
      )}
    </div>
  );
}
