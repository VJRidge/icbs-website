import { createElement, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { readNavigation } from '../../../lib/blog/mediaWidgetOptions';
import { safeHref } from '../../../lib/blog/safeHref';

type Slide = {
  url: string;
  alt: string;
  caption: string;
  credit: string;
  title: string;
  description: string;
  buttonText: string;
  link: string;
  applyLinkOn: string;
  bgColor: string;
  bgSize: string;
  kenBurns: boolean;
  overlay: boolean;
  overlayColor: string;
  horizontal: string;
  vertical: string;
  textAlign: string;
  contentColor: string;
  textShadow: boolean;
  hidden: boolean;
};

const TITLE_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p', 'span']);

function normalizeSlides(block: BlogBlock): Slide[] {
  const raw = Array.isArray(block.data.slides) ? block.data.slides : [];
  return raw.map((slide) => {
    const row = slide && typeof slide === 'object' ? (slide as Record<string, unknown>) : {};
    return {
      url: String(row.url ?? ''),
      alt: String(row.alt ?? ''),
      caption: String(row.caption ?? ''),
      credit: String(row.credit ?? ''),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      buttonText: String(row.buttonText ?? ''),
      link: String(row.link ?? ''),
      applyLinkOn: String(row.applyLinkOn ?? 'button'),
      bgColor: String(row.bgColor ?? ''),
      bgSize: String(row.bgSize ?? 'cover'),
      kenBurns: Boolean(row.kenBurns),
      overlay: Boolean(row.overlay),
      overlayColor: String(row.overlayColor ?? ''),
      horizontal: String(row.horizontal ?? ''),
      vertical: String(row.vertical ?? ''),
      textAlign: String(row.textAlign ?? ''),
      contentColor: String(row.contentColor ?? ''),
      textShadow: Boolean(row.textShadow),
      hidden: Boolean(row.hidden),
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

function px(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  return raw.endsWith('px') ? raw : `${raw}px`;
}

function fitClass(size: string): string {
  if (size === 'contain') return 'object-contain';
  if (size === 'auto') return 'object-scale-down';
  return 'object-cover';
}

function placeClass(horizontal: string, vertical: string): string {
  const y = vertical === 'top' ? 'justify-start' : vertical === 'bottom' ? 'justify-end' : 'justify-center';
  const x = horizontal === 'left' ? 'items-start' : horizontal === 'right' ? 'items-end' : 'items-center';
  return `${y} ${x}`;
}

export default function BlogSlideshowBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const slides = useMemo(() => normalizeSlides(block), [block]);
  const data = block.data as Record<string, unknown>;
  const navigation = readNavigation(data);
  const showArrows = navigation === 'arrows' || navigation === 'arrows_dots';
  const showDots = navigation === 'dots' || navigation === 'arrows_dots';
  const autoplay = Boolean(data.autoplay);
  const interval = Math.min(15_000, Math.max(1000, Number(data.interval) || 5000));
  const transition = String(data.transition ?? 'fade');
  const speed = Math.min(2000, Math.max(200, Number(data.transitionSpeed) || 500));
  const pauseOnHover = data.pauseOnHover !== false;
  const pauseOnInteraction = Boolean(data.pauseOnInteraction);
  const loop = data.loop !== false;
  const showThumbs = Boolean(data.showThumbs);
  const showCounter = data.showCounter !== false;
  const aspectRatio = String(data.aspectRatio ?? '16/9');
  const captionMode = String(data.captionMode ?? 'below');
  const height = Number(data.height) || 0;
  const arrowSize = Number(data.arrowSize) || 28;
  const arrowColor = String(data.arrowColor ?? '#ffffff');

  const visible = useMemo(() => slides.filter((slide) => slide.url.trim() && !slide.hidden), [slides]);
  const visibleKey = useMemo(() => visible.map((slide) => slide.url).join('|'), [visible]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchRef = useRef<number | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const n = visible.length;
  const safeIdx = n ? ((idx % n) + n) % n : 0;
  const current = n ? visible[safeIdx] : null;

  useEffect(() => {
    setIdx(0);
  }, [block.id, visibleKey]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      if (!loop && ((dir < 0 && safeIdx === 0) || (dir > 0 && safeIdx === n - 1))) return;
      setIdx((currentIndex) => (currentIndex + dir + n) % n);
      if (pauseOnInteraction) {
        setPaused(true);
        if (holdRef.current) clearTimeout(holdRef.current);
        holdRef.current = setTimeout(() => setPaused(false), interval);
      }
    },
    [interval, loop, n, pauseOnInteraction, safeIdx],
  );

  useEffect(() => {
    const onVis = () => setHiddenTab(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!autoplay || isEditing || paused || hiddenTab || n <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => setIdx((currentIndex) => (currentIndex + 1) % n), interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, hiddenTab, interval, isEditing, n, paused]);

  if (!isEditing && !n) return null;

  const horizontal = current?.horizontal || String(data.horizontal ?? 'center');
  const vertical = current?.vertical || String(data.vertical ?? 'middle');
  const textAlign = (current?.textAlign || String(data.textAlign ?? horizontal)) as 'left' | 'center' | 'right';
  const title = current ? (current.title || (captionMode === 'overlay' ? current.caption : '')).trim() : '';
  const description = current?.description.trim() ?? '';
  const buttonText = current?.buttonText.trim() ?? '';
  const href = current ? safeHref(current.link) : undefined;
  const wholeSlide = current?.applyLinkOn === 'slide' && href && !isEditing;
  const showCopy = Boolean(title || description || buttonText);
  const titleTag = TITLE_TAGS.has(String(data.titleTag ?? '')) ? String(data.titleTag) : 'div';
  const descriptionTag = TITLE_TAGS.has(String(data.descriptionTag ?? '')) ? String(data.descriptionTag) : 'div';
  const shadow = current?.textShadow || data.textShadow ? '0 2px 8px rgba(0,0,0,0.45)' : undefined;
  const animation = String(data.contentAnimation ?? 'none');
  const pad = {
    paddingTop: Number(data.padTop) || 24,
    paddingRight: Number(data.padRight) || 48,
    paddingBottom: Number(data.padBottom) || 24,
    paddingLeft: Number(data.padLeft) || 48,
  };

  const frame = (
    <div
      className={`relative w-full overflow-hidden bg-slate-900 ${height > 0 ? '' : aspectClass(aspectRatio)}`}
      style={height > 0 ? { height } : undefined}
    >
      {current ? (
        transition === 'slide' ? (
          <div
            className="flex h-full transition-transform ease-out"
            style={{
              width: `${n * 100}%`,
              transform: `translateX(-${(safeIdx * 100) / n}%)`,
              transitionDuration: `${speed}ms`,
            }}
          >
            {visible.map((slide, index) => (
              <SlidePicture key={`${slide.url}-${index}`} slide={slide} blockTransition={transition} stacked={false} width={`${100 / n}%`} />
            ))}
          </div>
        ) : (
          visible.map((slide, index) => (
            <SlidePicture
              key={`${slide.url}-${index}`}
              slide={slide}
              blockTransition={transition}
              stacked
              active={index === safeIdx}
              speed={speed}
            />
          ))
        )
      ) : (
        <div className="flex h-full min-h-[220px] items-center justify-center px-16 text-center text-sm text-slate-300">
          Choose an image in the panel.
        </div>
      )}

      {current?.overlay ? (
        <div className="pointer-events-none absolute inset-0" style={{ background: current.overlayColor || 'rgba(0,0,0,0.35)' }} />
      ) : null}

      {showCopy ? (
        <div className={`pointer-events-none absolute inset-0 z-10 flex flex-col ${placeClass(horizontal, vertical)}`} style={pad}>
          <div
            key={`${safeIdx}-${animation}`}
            className={`pointer-events-auto ${animation === 'fade-up' ? 'blog-slide-fade-up' : ''} ${animation === 'fade' ? 'blog-slide-fade' : ''}`}
            style={{ width: `${Number(data.contentWidth) || 70}%`, textAlign, color: current?.contentColor || String(data.titleColor ?? '#ffffff'), textShadow: shadow }}
          >
            {title
              ? createElement(
                  titleTag as 'div',
                  {
                    className: 'font-semibold leading-tight',
                    style: { fontSize: px(data.titleSize) },
                  },
                  title,
                )
              : null}
            {description
              ? createElement(
                  descriptionTag as 'div',
                  {
                    className: 'mt-2 text-sm leading-relaxed',
                    style: {
                      color: String(data.descriptionColor ?? current?.contentColor ?? '#ffffff'),
                      fontSize: px(data.descriptionSize),
                    },
                  },
                  description,
                )
              : null}
            {buttonText ? (
              href && !isEditing && !wholeSlide ? (
                <a
                  href={href}
                  className="mt-4 inline-block border px-4 py-2 text-sm"
                  style={{
                    color: String(data.buttonColor ?? '#ffffff'),
                    background: data.buttonBg ? String(data.buttonBg) : 'transparent',
                    borderColor: String(data.buttonColor ?? '#ffffff'),
                    fontSize: px(data.buttonSize),
                  }}
                >
                  {buttonText}
                </a>
              ) : (
                <span
                  className="mt-4 inline-block border px-4 py-2 text-sm"
                  style={{
                    color: String(data.buttonColor ?? '#ffffff'),
                    background: data.buttonBg ? String(data.buttonBg) : 'transparent',
                    borderColor: String(data.buttonColor ?? '#ffffff'),
                    fontSize: px(data.buttonSize),
                  }}
                >
                  {buttonText}
                </span>
              )
            ) : null}
          </div>
        </div>
      ) : null}

      {showCounter && n > 1 ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white">
          {safeIdx + 1} / {n}
        </div>
      ) : null}

      {showArrows ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            style={{ color: arrowColor }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={arrowSize} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            style={{ color: arrowColor }}
            aria-label="Next slide"
          >
            <ChevronRight size={arrowSize} />
          </button>
        </>
      ) : null}

      {showDots && n > 1 ? (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
          {visible.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                setIdx(index);
              }}
              className={`h-2 w-2 rounded-full ${index === safeIdx ? 'bg-white' : 'bg-white/45'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  const body = wholeSlide ? (
    <a href={href} className="block text-inherit no-underline">
      {frame}
    </a>
  ) : (
    frame
  );

  return (
    <figure
      data-blog-slideshow
      tabIndex={0}
      className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg outline-none"
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          go(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          go(1);
        }
      }}
      onTouchStart={(event: TouchEvent<HTMLElement>) => {
        touchRef.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event: TouchEvent<HTMLElement>) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (start == null || n <= 1) return;
        const end = event.changedTouches[0]?.clientX ?? start;
        const delta = end - start;
        if (Math.abs(delta) < 48) return;
        go(delta < 0 ? 1 : -1);
      }}
    >
      {body}
      {showThumbs && n > 1 ? (
        <div className="flex gap-2 overflow-x-auto bg-slate-950 px-2 py-2">
          {visible.map((slide, index) => (
            <button
              key={`thumb-${slide.url}-${index}`}
              type="button"
              onClick={() => setIdx(index)}
              className={`h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-md border-2 ${index === safeIdx ? 'border-white' : 'border-transparent opacity-80'}`}
              aria-label={`Slide ${index + 1}`}
            >
              <img src={slide.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {captionMode === 'below' && current && !showCopy && (current.caption || current.credit) ? (
        <figcaption className="bg-white px-4 py-3 text-center text-sm text-slate-600">
          {current.caption ? <span className="font-medium text-slate-800">{current.caption}</span> : null}
          {current.credit ? <span className="mt-1 block text-xs italic text-slate-500">{current.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function SlidePicture({
  slide,
  blockTransition,
  stacked,
  active = true,
  speed = 500,
  width,
}: {
  slide: Slide;
  blockTransition: string;
  stacked: boolean;
  active?: boolean;
  speed?: number;
  width?: string;
}) {
  const ken = slide.kenBurns || blockTransition === 'kenburns';
  return (
    <div
      className={`${ken ? 'blog-slideshow-kenburns' : ''} ${stacked ? `absolute inset-0 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}` : 'relative h-full shrink-0 overflow-hidden'}`}
      style={{
        width,
        background: slide.bgColor || '#111111',
        transitionProperty: 'opacity',
        transitionDuration: `${speed}ms`,
      }}
    >
      {slide.url ? (
        <img src={slide.url} alt={slide.alt} className={`h-full w-full ${fitClass(slide.bgSize)}`} referrerPolicy="no-referrer" />
      ) : null}
    </div>
  );
}
