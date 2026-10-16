import { createElement, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { supabaseBrowser } from '../../../../lib/supabaseBrowser';
import { PUBLISHED_CONTENTS_VIEW } from '../../../../lib/publishedContent';
import {
  clipExcerpt,
  excerptFromPost,
  imageSizeClass,
  readPostTeaserLayout,
} from '../../../lib/blog/postTeaserLayout';
import { teaserCategoryByContentId, teaserCategoryLabel } from '../../../lib/blog/postTeaserCategory';

type Item = { title: string; slug: string; excerpt: string; imageUrl: string; date?: string; category?: string };
type Mode = 'latest' | 'manual';

function asItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [{ title: '', slug: '', excerpt: '', imageUrl: '' }];
  return raw.map((r: unknown) => {
    const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
    return {
      title: String(o.title ?? ''),
      slug: String(o.slug ?? ''),
      excerpt: excerptFromPost({ excerpt: o.excerpt }),
      imageUrl: String(o.imageUrl ?? ''),
      date: String(o.date ?? ''),
    };
  });
}

function TeaserGrid({ items, data }: { items: Item[]; data: Record<string, unknown> }) {
  const layout = readPostTeaserLayout(data);
  const titleColor = String(data.titleColor ?? '').trim() || undefined;
  const excerptColor = String(data.excerptColor ?? '').trim() || undefined;
  const metaColor = String(data.metaColor ?? '').trim() || undefined;
  const [page, setPage] = useState(1);
  const pageSize = layout.limit;
  const paged = layout.pagination === 'numbers';
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = paged ? items.slice((safePage - 1) * pageSize, safePage * pageSize) : items.slice(0, pageSize);
  if (items.length === 0) {
    return <p className="my-8 text-sm text-slate-500">No published posts yet. They’ll show up here after you publish.</p>;
  }
  const row = layout.showImage && layout.imagePosition === 'left';
  const cols = layout.skin === 'full' && !row ? 1 : layout.columns;
  return (
    <section
      className={`blog-block-post-teasers is-${layout.skin} is-${layout.imagePosition} my-10 grid gap-6`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {visible.map((it, i) => {
        const slug = it.slug.trim().replace(/^\/?(blog\/)?/, '');
        const to = slug ? `/blog/${encodeURIComponent(slug)}` : '/blog';
        const words = layout.skin === 'full' ? Math.max(layout.excerptLength, 80) : layout.excerptLength;
        const copy = layout.showExcerpt ? clipExcerpt(it.excerpt, words) : '';
        return (
          <article
            key={`${slug}-${i}`}
            className={`blog-post-teaser overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md ${
              row ? 'flex gap-4' : ''
            }`}
          >
            <a
              href={to}
              className={row ? 'flex min-w-0 flex-1 flex-col gap-0' : 'block'}
              target={layout.openInNewWindow ? '_blank' : undefined}
              rel={layout.openInNewWindow ? 'noopener noreferrer' : undefined}
            >
              {it.category ? (
                <p className={`vj-k ${row ? 'px-3 pt-3' : 'px-4 pt-4'}`}>{it.category}</p>
              ) : null}
              <div className={row ? 'flex min-w-0 flex-1 gap-4 p-3 pt-2' : ''}>
              {layout.showImage ? (
                it.imageUrl.trim() ? (
                  <img
                    src={it.imageUrl.trim()}
                    alt=""
                    className={`object-cover ${imageSizeClass(layout.imageResolution)} ${row ? 'shrink-0' : 'w-full'}`}
                    style={{
                      aspectRatio: String(layout.imageRatio),
                      width: row ? `${layout.imageWidth}%` : undefined,
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`bg-gradient-to-br from-brand-blue/20 to-brand-yellow/30 ${row ? 'shrink-0' : 'w-full'}`}
                    style={{ aspectRatio: String(layout.imageRatio), width: row ? `${layout.imageWidth}%` : undefined }}
                  />
                )
              ) : null}
              <div className={row ? 'min-w-0 flex-1' : 'p-4'}>
                {layout.showTitle
                  ? createElement(
                      layout.titleTag,
                      { className: 'font-black text-brand-blue line-clamp-2', style: { color: titleColor } },
                      it.title,
                    )
                  : null}
                {layout.showMeta && it.date ? (
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: metaColor || '#b53d0d' }}>
                    {it.date}
                  </p>
                ) : null}
                {copy ? (
                  <p className={`mt-2 text-slate-600 ${layout.skin === 'full' ? 'text-base leading-relaxed' : 'text-sm'}`} style={{ color: excerptColor }}>
                    {copy}
                  </p>
                ) : null}
                {layout.showReadMore ? (
                  <span className="mt-3 inline-block text-[11px] font-black uppercase tracking-widest text-brand-blue">
                    {layout.readMoreText}
                  </span>
                ) : null}
              </div>
              </div>
            </a>
          </article>
        );
      })}
      {paged && totalPages > 1 ? (
        <nav className="col-span-full flex justify-center gap-1 text-xs font-bold text-slate-500" aria-label="Posts">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              type="button"
              className={`rounded border px-2 py-1 ${
                safePage === index + 1 ? 'border-brand-blue bg-brand-blue text-brand-yellow' : 'border-slate-200'
              }`}
              onClick={() => setPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </nav>
      ) : null}
    </section>
  );
}

export default function BlogPostTeasersBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const mode: Mode = block.data.mode === 'manual' ? 'manual' : 'latest';
  const items = asItems(block.data.items);
  const layout = readPostTeaserLayout(block.data as Record<string, unknown>);
  const columns = layout.columns;
  const limit = layout.limit;
  const fetchCap = layout.pagination === 'numbers' ? 48 : limit;
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
    void (async () => {
      const { data } = await sb
        .from(PUBLISHED_CONTENTS_VIEW)
        .select('id, slug, title, published_at, published_document, taxonomies')
        .eq('kind', 'post')
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('list_order', { ascending: true })
        .order('published_at', { ascending: false })
        .limit(fetchCap);
      if (gone) return;
      const rows = data ?? [];
      const ids = rows.map((r) => String((r as { id?: string }).id ?? '')).filter(Boolean);
      let live: Record<string, string> = {};
      if (ids.length) {
        const { data: links } = await sb
          .from('content_taxonomies')
          .select('content_id, is_primary, taxonomies(kind, name)')
          .in('content_id', ids);
        if (!gone && links) live = teaserCategoryByContentId(links as { content_id?: string; is_primary?: boolean; taxonomies?: unknown }[]);
      }
      if (gone) return;
      setLatest(
        rows.map((r) => {
          const rec = r as {
            id?: string;
            slug: string;
            title: string;
            published_at?: string | null;
            published_document?: { title?: string; excerpt?: string; featured_image_url?: string; html?: string } | null;
            taxonomies?: unknown;
          };
          const doc = rec.published_document ?? null;
          return {
            title: doc?.title || rec.title || '',
            slug: rec.slug,
            excerpt: excerptFromPost({ excerpt: doc?.excerpt, html: doc?.html }),
            imageUrl: doc?.featured_image_url ?? '',
            date: rec.published_at ? String(rec.published_at).slice(0, 10) : '',
            category: live[String(rec.id ?? '')] || teaserCategoryLabel(rec.taxonomies),
          };
        }),
      );
    })();
    return () => {
      gone = true;
    };
  }, [mode, filled.length, fetchCap]);

  const cards = mode === 'manual' && filled.length > 0 ? filled : latest ?? [];

  if (!isEditing) return <TeaserGrid items={cards} data={block.data as Record<string, unknown>} />;

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
        <TeaserGrid items={latest ?? []} data={block.data as Record<string, unknown>} />
      )}
    </div>
  );
}
