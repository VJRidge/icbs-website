import { useEffect, useMemo, useState } from 'react';
import FileUpload from '../../FileUpload';
import { supabase } from '../../../lib/supabase';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import BlogBlockMediaDropZone from '../editor/BlogBlockMediaDropZone';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type Item = { url: string; alt: string; caption: string; videoUrl?: string };

function normalizeItems(block: BlogBlock): Item[] {
  const raw = Array.isArray(block.data.items) ? block.data.items : [];
  return raw.map((row: unknown) => {
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      url: String(o.url ?? ''),
      alt: String(o.alt ?? ''),
      caption: String(o.caption ?? ''),
            videoUrl: typeof o.videoUrl === 'string' ? o.videoUrl : undefined,
    };
  });
}

function moveItemIndex(arr: Item[], from: number, to: number): Item[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function BlogCarouselBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const items = useMemo(() => normalizeItems(block), [block]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUserId(data.session?.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const peekPx = Math.min(120, Math.max(0, Number(block.data.peekPx) || 32));
  const snap = block.data.snap !== false;

  const visible = useMemo(() => items.filter((it) => it.url.trim() || (it.videoUrl && it.videoUrl.trim())), [items]);

  const setItems = (next: Item[]) => updateBlock(block.id, { items: next });

  if (!isEditing) {
    if (!visible.length) return null;

    return (
      <section className="my-6">
        <div
          className={`flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] ${snap ? 'snap-x snap-mandatory' : ''}`}
          style={{ paddingLeft: peekPx, paddingRight: peekPx }}
          aria-label="Carousel"
        >
          {visible.map((it, i) => (
            <figure
              key={`car-${i}-${it.url || it.videoUrl}`}
              className={`w-[min(100vw-4rem,520px)] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md ${snap ? 'snap-center' : ''}`}
            >
              {it.videoUrl?.trim() ? (
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={it.videoUrl.trim()}
                    title={it.alt || 'Embedded video'}
                    className="h-full w-full"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={it.url}
                  alt={it.alt}
                  className="aspect-video w-full object-cover"
                  referrerPolicy="no-referrer"
                  loading={i > 0 ? 'lazy' : 'eager'}
                  decoding="async"
                />
              )}
              {it.caption?.trim() ? (
                <figcaption className="px-4 py-3 text-center text-sm text-slate-600">{it.caption}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <BlogBlockMediaDropZone
        userId={userId}
        accept="image/*"
        label="Drop images or choose many — new carousel slides"
        onUploadedUrls={(urls) => {
          const rows = urls.map((u) => ({ url: u, alt: '', caption: '' }));
          setItems([...items, ...rows]);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!userId}
          onClick={() =>
            openMediaLibrary((u) => {
              setItems([...items, { url: u, alt: '', caption: '' }]);
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Add from media library
        </button>
      </div>

      {items.some((it) => it.url.trim() || it.videoUrl?.trim()) ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Reorder — drag thumbnails (images only)</p>
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) =>
              it.url.trim() && !it.videoUrl?.trim() ? (
                <button
                  key={`cth-${i}-${it.url}`}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(i));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('text/plain'));
                    if (Number.isNaN(from)) return;
                    setItems(moveItemIndex(items, from, i));
                  }}
                  className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 shadow-sm"
                  aria-label={`Reorder slide ${i + 1}`}
                >
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                </button>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={snap} onChange={(e) => updateBlock(block.id, { snap: e.target.checked })} />
          Snap slides
        </label>
        <label className="flex items-center gap-2">
          Peek padding (px)
          <input
            type="number"
            min={0}
            max={120}
            value={peekPx}
            onChange={(e) => updateBlock(block.id, { peekPx: Number(e.target.value) || 0 })}
            className="w-20 rounded border border-slate-200 px-2 py-1"
          />
        </label>
      </div>

      {items.map((it, i) => (
        <div key={`car-edit-${block.id}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500">Slide {i + 1}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!userId}
                onClick={() =>
                  openMediaLibrary((u) => {
                    const next = [...items];
                    next[i] = { ...next[i], url: u, videoUrl: undefined };
                    setItems(next);
                  })
                }
                className="text-xs font-semibold text-brand-blue hover:underline disabled:opacity-40"
              >
                Library
              </button>
              <button
                type="button"
                disabled={items.length <= 1}
                onClick={() => {
                  const next = items.filter((_, j) => j !== i);
                  setItems(next.length ? next : [{ url: '', alt: '', caption: '' }]);
                }}
                className="text-xs font-semibold text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>

          {!it.url ? (
            <FileUpload
              variant="compact"
              bucket="media-public"
              label="Upload image"
              type="image"
              accept="image/*"
              value=""
              onChange={(nextUrl) => {
                if (nextUrl) {
                  const next = [...items];
                  next[i] = { ...next[i], url: nextUrl, alt: next[i].alt || 'Slide' };
                  setItems(next);
                }
              }}
            />
          ) : (
            <div className="relative mb-2">
              <img src={it.url} alt="" className="max-h-36 w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => {
                  const next = [...items];
                  next[i] = { ...next[i], url: '' };
                  setItems(next);
                }}
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-xs font-semibold text-white opacity-0 transition hover:bg-black/40 hover:opacity-100"
              >
                Remove image
              </button>
            </div>
          )}

          <input
            value={it.url}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], url: e.target.value };
              setItems(next);
            }}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Image URL"
          />
          <input
            value={it.videoUrl ?? ''}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...next[i], videoUrl: e.target.value };
              setItems(next);
            }}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Optional embed URL (overrides image)"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={it.alt}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], alt: e.target.value };
                setItems(next);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Alt"
            />
            <input
              value={it.caption}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], caption: e.target.value };
                setItems(next);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Caption"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:opacity-95"
        onClick={() => setItems([...items, { url: '', alt: '', caption: '' }])}
      >
        Add slide
      </button>
    </div>
  );
}
