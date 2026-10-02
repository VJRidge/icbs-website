import { useEffect, useMemo, useState } from 'react';
import FileUpload from '../../FileUpload';
import BlogImageLightbox from '../BlogImageLightbox';
import { supabase } from '../../../lib/supabase';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import BlogBlockMediaDropZone from '../editor/BlogBlockMediaDropZone';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type GImage = {
  url: string;
  alt: string;
  caption: string;
  credit: string;
  focalX: number;
  focalY: number;
};

function normalizeImages(block: BlogBlock): GImage[] {
  const raw = Array.isArray(block.data.images) ? block.data.images : [];
  return raw.map((row: unknown) => {
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      url: String(o.url ?? ''),
      alt: String(o.alt ?? ''),
      caption: String(o.caption ?? ''),
      credit: String(o.credit ?? ''),
      focalX: Number(o.focalX) >= 0 ? Number(o.focalX) : 50,
      focalY: Number(o.focalY) >= 0 ? Number(o.focalY) : 50,
    };
  });
}

function moveImageIndex(arr: GImage[], from: number, to: number): GImage[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function BlogGalleryBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const images = useMemo(() => normalizeImages(block), [block]);
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

  const mode = String(block.data.mode ?? 'grid') as 'grid' | 'masonry' | 'strip';
  const columns = Math.min(6, Math.max(1, Number(block.data.columns) || 3));
  const gap = Math.min(48, Math.max(4, Number(block.data.gap) || 16));
  const aspectRatio = String(block.data.aspectRatio ?? 'auto');
  const lightboxEnabled = block.data.lightbox !== false;

  const visible = useMemo(() => images.filter((im) => im.url.trim()), [images]);
  const [lb, setLb] = useState<number | null>(null);

  const setImages = (next: GImage[]) => updateBlock(block.id, { images: next });

  const aspectStyle = (() => {
    switch (aspectRatio) {
      case '1/1':
        return 'aspect-square';
      case '4/3':
        return 'aspect-[4/3]';
      case '16/9':
        return 'aspect-video';
      default:
        return '';
    }
  })();

  if (!isEditing) {
    if (!visible.length) return null;

    const openLb = (i: number) => {
      if (!lightboxEnabled) return;
      setLb(i);
    };

    const tiles = visible.map((im, i) => (
      <figure
        key={`g-${im.url}-${i}`}
        className={`overflow-hidden rounded-xl bg-slate-100 shadow-sm ${
          lightboxEnabled ? 'cursor-zoom-in' : ''
        } ${mode === 'strip' ? 'w-64 shrink-0' : ''}`}
        onClick={() => openLb(i)}
        onKeyDown={(e) => {
          if (lightboxEnabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openLb(i);
          }
        }}
        role={lightboxEnabled ? 'button' : undefined}
        tabIndex={lightboxEnabled ? 0 : undefined}
      >
        <div className={`relative w-full overflow-hidden ${aspectStyle || 'min-h-[140px]'}`}>
          <img
            src={im.url}
            alt={im.alt}
            className={`h-full w-full object-cover ${!aspectStyle ? 'max-h-80 w-full' : ''}`}
            style={{ objectPosition: `${im.focalX}% ${im.focalY}%` }}
            referrerPolicy="no-referrer"
            loading={i > 0 ? 'lazy' : 'eager'}
            decoding="async"
          />
        </div>
        {(im.caption || im.credit) && mode !== 'strip' ? (
          <figcaption className="px-2 py-2 text-center text-xs text-slate-600">
            {im.caption ? <span className="font-medium">{im.caption}</span> : null}
            {im.credit ? <span className="mt-0.5 block italic text-slate-500">{im.credit}</span> : null}
          </figcaption>
        ) : null}
      </figure>
    ));

    const shell =
      mode === 'masonry' ? (
        <div style={{ columnCount: columns, columnGap: gap }}>
          {tiles.map((t, i) => (
            <div key={`m-${i}`} className="mb-4 break-inside-avoid">
              {t}
            </div>
          ))}
        </div>
      ) : mode === 'strip' ? (
        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 pt-1 [scrollbar-width:thin]" style={{ gap }}>
          {tiles}
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gap,
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {tiles}
        </div>
      );

    return (
      <>
        <section className="my-6">{shell}</section>
        {lb !== null && lightboxEnabled ? (
          <BlogImageLightbox
            images={visible.map((im) => ({
              url: im.url,
              alt: im.alt,
              caption: [im.caption, im.credit].filter(Boolean).join(' · ') || undefined,
            }))}
            initialIndex={lb}
            onClose={() => setLb(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <BlogBlockMediaDropZone
        userId={userId}
        accept="image/*"
        label="Drop images here or choose many — appended to the gallery"
        onUploadedUrls={(urls) => {
          const rows = urls.map((u) => ({
            url: u,
            alt: '',
            caption: '',
            credit: '',
            focalX: 50,
            focalY: 50,
          }));
          setImages([...images, ...rows]);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!userId}
          onClick={() =>
            openMediaLibrary((u) => {
              setImages([...images, { url: u, alt: '', caption: '', credit: '', focalX: 50, focalY: 50 }]);
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Add from media library
        </button>
      </div>

      {images.some((im) => im.url.trim()) ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Reorder — drag thumbnails</p>
          <div className="flex flex-wrap gap-2">
            {images.map((im, i) =>
              im.url.trim() ? (
                <button
                  key={`gth-${i}-${im.url}`}
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
                    setImages(moveImageIndex(images, from, i));
                  }}
                  className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 shadow-sm"
                  aria-label={`Reorder image ${i + 1}`}
                >
                  <img src={im.url} alt="" className="h-full w-full object-cover" />
                </button>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layout</label>
        <select
          value={mode}
          onChange={(e) => updateBlock(block.id, { mode: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="grid">Grid</option>
          <option value="masonry">Masonry</option>
          <option value="strip">Horizontal strip</option>
        </select>
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Columns</label>
        <input
          type="number"
          min={1}
          max={6}
          value={columns}
          onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) || 3 })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gap (px)</label>
        <input
          type="number"
          min={4}
          max={48}
          value={gap}
          onChange={(e) => updateBlock(block.id, { gap: Number(e.target.value) || 16 })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tile aspect</label>
        <select
          value={aspectRatio}
          onChange={(e) => updateBlock(block.id, { aspectRatio: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="auto">Natural</option>
          <option value="1/1">Square</option>
          <option value="4/3">4:3</option>
          <option value="16/9">16:9</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={lightboxEnabled}
            onChange={(e) => updateBlock(block.id, { lightbox: e.target.checked })}
          />
          Lightbox on click (published view)
        </label>
      </div>

      {images.map((im, i) => (
        <div key={`g-edit-${block.id}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Image {i + 1}</span>
            <button
              type="button"
              disabled={!userId}
              onClick={() =>
                openMediaLibrary((u) => {
                  const next = [...images];
                  next[i] = { ...next[i], url: u, alt: next[i].alt || 'Gallery image' };
                  setImages(next);
                })
              }
              className="ml-auto text-xs font-semibold text-brand-blue hover:underline disabled:opacity-40"
            >
              Library
            </button>
            <button
              type="button"
              disabled={images.length <= 1}
              onClick={() => {
                const next = images.filter((_, j) => j !== i);
                setImages(
                  next.length
                    ? next
                    : [{ url: '', alt: '', caption: '', credit: '', focalX: 50, focalY: 50 }],
                );
              }}
              className="text-xs font-semibold text-red-600 disabled:opacity-40"
            >
              Remove
            </button>
          </div>

          {im.url ? (
            <div className="relative mb-2">
              <img src={im.url} alt="" className="max-h-40 w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => {
                  const next = [...images];
                  next[i] = { ...next[i], url: '' };
                  setImages(next);
                }}
                className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-xs font-semibold text-white opacity-0 transition hover:bg-black/40 hover:opacity-100"
              >
                Remove image
              </button>
            </div>
          ) : (
            <FileUpload
              variant="compact"
              bucket="media-public"
              label="Upload"
              type="image"
              accept="image/*"
              value=""
              onChange={(nextUrl) => {
                if (nextUrl) {
                  const next = [...images];
                  next[i] = { ...next[i], url: nextUrl, alt: next[i].alt || 'Gallery image' };
                  setImages(next);
                }
              }}
            />
          )}

          <input
            value={im.url}
            onChange={(e) => {
              const next = [...images];
              next[i] = { ...next[i], url: e.target.value };
              setImages(next);
            }}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Or paste image URL"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={im.alt}
              onChange={(e) => {
                const next = [...images];
                next[i] = { ...next[i], alt: e.target.value };
                setImages(next);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Alt"
            />
            <input
              value={im.caption}
              onChange={(e) => {
                const next = [...images];
                next[i] = { ...next[i], caption: e.target.value };
                setImages(next);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Caption"
            />
          </div>
          <input
            value={im.credit}
            onChange={(e) => {
              const next = [...images];
              next[i] = { ...next[i], credit: e.target.value };
              setImages(next);
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Credit"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-black uppercase text-slate-400">
              Focal X
              <input
                type="range"
                min={0}
                max={100}
                value={im.focalX}
                onChange={(e) => {
                  const next = [...images];
                  next[i] = { ...next[i], focalX: Number(e.target.value) };
                  setImages(next);
                }}
                className="mt-1 w-full"
              />
            </label>
            <label className="text-[10px] font-black uppercase text-slate-400">
              Focal Y
              <input
                type="range"
                min={0}
                max={100}
                value={im.focalY}
                onChange={(e) => {
                  const next = [...images];
                  next[i] = { ...next[i], focalY: Number(e.target.value) };
                  setImages(next);
                }}
                className="mt-1 w-full"
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:opacity-95"
        onClick={() =>
          setImages([...images, { url: '', alt: '', caption: '', credit: '', focalX: 50, focalY: 50 }])
        }
      >
        Add image
      </button>
    </div>
  );
}
