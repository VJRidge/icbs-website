import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import BlogBlockMediaDropZone from '../editor/BlogBlockMediaDropZone';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

type Slide = { url: string; alt: string; caption: string; credit: string };

function normalizeSlides(block: BlogBlock): Slide[] {
  const raw = Array.isArray(block.data.slides) ? block.data.slides : [];
  return raw.map((s: unknown) => {
    const o = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
    return {
      url: String(o.url ?? ''),
      alt: String(o.alt ?? ''),
      caption: String(o.caption ?? ''),
      credit: String(o.credit ?? ''),
    };
  });
}

function aspectClass(ratio: string): string {
  switch (ratio) {
    case '4/3':
      return 'aspect-[4/3]';
    case '1/1':
      return 'aspect-square';
    case 'auto':
      return 'aspect-auto min-h-[200px]';
    case '16/9':
    default:
      return 'aspect-video';
  }
}

function moveSlideIndex(arr: Slide[], from: number, to: number): Slide[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

export default function BlogSlideshowBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const slides = useMemo(() => normalizeSlides(block), [block]);

  const autoplay = Boolean(block.data.autoplay);
  const rawInterval = Number(block.data.interval) || 5000;
  const interval = Math.min(10_000, Math.max(2000, rawInterval));
  const transition = String(block.data.transition ?? 'fade') as 'fade' | 'slide' | 'kenburns';
  const showDots = block.data.showDots !== false;
  const showThumbs = Boolean(block.data.showThumbs);
  const showCounter = block.data.showCounter !== false;
  const pauseOnHover = block.data.pauseOnHover !== false;
  const aspectRatio = String(block.data.aspectRatio ?? '16/9');
  const captionMode = String(block.data.captionMode ?? 'below') as 'below' | 'overlay' | 'none';

  const visible = useMemo(() => slides.filter((s) => s.url.trim()), [slides]);
  const visibleKey = useMemo(() => visible.map((s) => s.url).join('|'), [visible]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchRef = useRef<number | null>(null);

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

  const n = visible.length;
  const safeIdx = n ? ((idx % n) + n) % n : 0;
  const current = n ? visible[safeIdx] : null;

  useEffect(() => {
    setIdx(0);
  }, [block.id, visibleKey]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!n) return;
      setIdx((i) => (i + dir + n) % n);
    },
    [n],
  );

  const autoplayPaused = paused || hiddenTab;
  useEffect(() => {
    const onVis = () => setHiddenTab(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!autoplay || isEditing || autoplayPaused || n <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % n), interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, isEditing, autoplayPaused, interval, n]);

  const setSlides = (next: Slide[]) => updateBlock(block.id, { slides: next });

  const kb = transition === 'kenburns' ? 'blog-slideshow-kenburns' : '';

  if (!isEditing) {
    if (!n || !current?.url.trim()) return null;

    const slideInner = (s: Slide, i: number, stacked: boolean) => (
      <div
        key={`pv-${s.url}-${i}`}
        className={
          stacked
            ? `absolute inset-0 transition-opacity duration-500 ${i === safeIdx ? 'opacity-100' : 'pointer-events-none opacity-0'}`
            : 'relative h-full shrink-0 overflow-hidden'
        }
        style={!stacked && n ? { width: `${100 / n}%` } : undefined}
      >
        <img
          src={s.url}
          alt={s.alt}
          className={`h-full w-full object-cover ${kb}`}
          referrerPolicy="no-referrer"
          loading={stacked && i !== safeIdx ? 'lazy' : 'eager'}
          decoding="async"
        />
      </div>
    );

    const rail =
      transition === 'slide' ? (
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            width: `${n * 100}%`,
            transform: `translateX(-${(safeIdx * 100) / n}%)`,
          }}
        >
          {visible.map((s, i) => slideInner(s, i, false))}
        </div>
      ) : (
        visible.map((s, i) => slideInner(s, i, true))
      );

    const dotRow = showDots && n > 1 && (
      <div
        className={`absolute left-0 right-0 flex justify-center gap-1.5 ${showThumbs ? 'bottom-[4.25rem]' : 'bottom-3'}`}
      >
        {visible.map((_, i) => (
          <button
            key={`dot-${i}`}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-2 w-2 rounded-full transition-colors ${i === safeIdx ? 'bg-white' : 'bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    );

    return (
      <figure
        data-blog-slideshow
        tabIndex={0}
        className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-blue/40"
        onMouseEnter={() => pauseOnHover && setPaused(true)}
        onMouseLeave={() => pauseOnHover && setPaused(false)}
        onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
          if (!n || n <= 1) return;
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(1);
          }
        }}
        onTouchStart={(e: TouchEvent<HTMLElement>) => {
          touchRef.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e: TouchEvent<HTMLElement>) => {
          const start = touchRef.current;
          touchRef.current = null;
          if (start == null || n <= 1) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const d = end - start;
          if (Math.abs(d) < 48) return;
          if (d < 0) go(1);
          else go(-1);
        }}
      >
        <div className={`relative w-full overflow-hidden bg-slate-900 ${aspectClass(aspectRatio)}`}>
          {rail}
          {showCounter && n > 1 ? (
            <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
              {safeIdx + 1} / {n}
            </div>
          ) : null}
          {captionMode === 'overlay' && (current.caption || current.credit) ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-sm text-white">
              {current.caption ? <p className="font-semibold">{current.caption}</p> : null}
              {current.credit ? <p className="text-xs text-white/80">{current.credit}</p> : null}
            </div>
          ) : null}
          {n > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
                aria-label="Previous slide"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
                aria-label="Next slide"
              >
                <ChevronRight size={22} />
              </button>
            </>
          ) : null}
          {dotRow}
        </div>
        {showThumbs && n > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-t border-slate-800 bg-slate-950 px-2 py-2 [scrollbar-width:thin]">
            {visible.map((s, i) => (
              <button
                key={`th-${s.url}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                className={`relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  i === safeIdx ? 'border-brand-yellow ring-1 ring-brand-yellow/50' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                aria-label={`Slide ${i + 1}`}
              >
                <img src={s.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
        {captionMode === 'below' && (current.caption || current.credit) ? (
          <figcaption className="bg-white px-4 py-3 text-center text-sm text-slate-600">
            {current.caption ? <span className="font-medium text-slate-800">{current.caption}</span> : null}
            {current.credit ? <span className="mt-1 block text-xs italic text-slate-500">{current.credit}</span> : null}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <div className="space-y-4">
      <BlogBlockMediaDropZone
        userId={userId}
        accept="image/*"
        label="Drop multiple images or choose many — new slides append to the end"
        onUploadedUrls={(urls) => {
          const appended = urls.map((u) => ({ url: u, alt: '', caption: '', credit: '' }));
          setSlides([...slides, ...appended]);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!userId}
          onClick={() =>
            openMediaLibrary((u) => {
              setSlides([...slides, { url: u, alt: '', caption: '', credit: '' }]);
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Add slide from library
        </button>
      </div>

      {slides.some((s) => s.url.trim()) ? (
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Reorder — drag thumbnails</p>
          <div className="flex flex-wrap gap-2">
            {slides.map((s, i) =>
              s.url.trim() ? (
                <button
                  key={`sth-${i}-${s.url}`}
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
                    setSlides(moveSlideIndex(slides, from, i));
                  }}
                  className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 shadow-sm"
                  aria-label={`Reorder slide ${i + 1}`}
                >
                  <img src={s.url} alt="" className="h-full w-full object-cover" />
                </button>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Transition</label>
        <select
          value={transition}
          onChange={(e) => updateBlock(block.id, { transition: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-1"
        >
          <option value="fade">Fade</option>
          <option value="slide">Slide</option>
          <option value="kenburns">Ken Burns</option>
        </select>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Aspect ratio</label>
        <select
          value={aspectRatio}
          onChange={(e) => updateBlock(block.id, { aspectRatio: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="16/9">16:9</option>
          <option value="4/3">4:3</option>
          <option value="1/1">1:1</option>
          <option value="auto">Auto</option>
        </select>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Caption</label>
        <select
          value={captionMode}
          onChange={(e) => updateBlock(block.id, { captionMode: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="below">Below image</option>
          <option value="overlay">Overlay</option>
          <option value="none">Hidden</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={autoplay} onChange={(e) => updateBlock(block.id, { autoplay: e.target.checked })} />
          Autoplay
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showDots} onChange={(e) => updateBlock(block.id, { showDots: e.target.checked })} />
          Dots
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showThumbs} onChange={(e) => updateBlock(block.id, { showThumbs: e.target.checked })} />
          Thumbnail strip
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showCounter} onChange={(e) => updateBlock(block.id, { showCounter: e.target.checked })} />
          Counter
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pauseOnHover} onChange={(e) => updateBlock(block.id, { pauseOnHover: e.target.checked })} />
          Pause on hover
        </label>
        <label className="flex items-center gap-2">
          Interval (2–10s)
          <input
            type="number"
            min={2000}
            max={10000}
            step={500}
            value={interval}
            onChange={(e) => {
              const v = Math.min(10_000, Math.max(2000, Number(e.target.value) || 5000));
              updateBlock(block.id, { interval: v });
            }}
            className="w-24 rounded border border-slate-200 px-2 py-1"
          />
        </label>
      </div>

      {slides.map((s, i) => (
        <div key={`slide-edit-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Slide {i + 1}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!userId}
                onClick={() =>
                  openMediaLibrary((u) => {
                    const next = [...slides];
                    next[i] = { ...next[i], url: u };
                    setSlides(next);
                  })
                }
                className="text-xs font-semibold text-brand-blue hover:underline disabled:opacity-40"
              >
                Library
              </button>
              <button
                type="button"
                disabled={slides.length <= 1}
                onClick={() => {
                  const next = slides.filter((_, j) => j !== i);
                  setSlides(next.length ? next : [{ url: '', alt: '', caption: '', credit: '' }]);
                  setIdx(0);
                }}
                className="text-xs font-semibold text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
          <input
            value={s.url}
            onChange={(e) => {
              const next = [...slides];
              next[i] = { ...next[i], url: e.target.value };
              setSlides(next);
            }}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Image URL"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={s.alt}
              onChange={(e) => {
                const next = [...slides];
                next[i] = { ...next[i], alt: e.target.value };
                setSlides(next);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Alt text"
            />
            <input
              value={s.caption}
              onChange={(e) => {
                const next = [...slides];
                next[i] = { ...next[i], caption: e.target.value };
                setSlides(next);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Caption"
            />
          </div>
          <input
            value={s.credit}
            onChange={(e) => {
              const next = [...slides];
              next[i] = { ...next[i], credit: e.target.value };
              setSlides(next);
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Credit / source"
          />
        </div>
      ))}

      <button
        type="button"
        className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:opacity-95"
        onClick={() => setSlides([...slides, { url: '', alt: '', caption: '', credit: '' }])}
      >
        Add slide
      </button>
    </div>
  );
}
