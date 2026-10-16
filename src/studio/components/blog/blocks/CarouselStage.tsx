import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { hexToRgba, readCarouselStageStyle } from '../../../lib/blog/carouselStageStyle';
import { carouselSlideHref, embedMediaUrl, readNavigation } from '../../../lib/blog/mediaWidgetOptions';

type Item = {
  url: string;
  alt: string;
  caption: string;
  title: string;
  description: string;
  videoUrl: string;
  mediaType: string;
  link: string;
};

function readItems(block: BlogBlock): Item[] {
  const raw = Array.isArray(block.data.items) ? block.data.items : [];
  return raw.map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      url: String(item.url ?? ''),
      alt: String(item.alt ?? ''),
      caption: String(item.caption ?? ''),
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
      videoUrl: String(item.videoUrl ?? ''),
      mediaType: String(item.mediaType ?? (item.videoUrl ? 'video' : 'image')),
      link: String(item.link ?? item.href ?? ''),
    };
  }).filter((item) => item.url.trim() || item.videoUrl.trim());
}

function imageHeight(data: Record<string, unknown>): number {
  const size = String(data.imageSize ?? 'medium');
  if (size === 'thumbnail') return 150;
  if (size === 'large') return 420;
  if (size === 'full') return 520;
  if (size === 'custom') return Number(data.customHeight) || 400;
  return 280;
}

function captionFor(item: Item, source: string): string {
  if (source === 'title') return item.title;
  if (source === 'caption') return item.caption;
  if (source === 'description') return item.description || item.alt;
  return '';
}

function SlideImage({ item, fit, lazy }: { item: Item; fit: 'cover' | 'contain'; lazy: boolean }) {
  const contain = fit === 'contain';
  return (
    <img
      src={item.url}
      alt={item.alt}
      className="blog-carousel-slide-img"
      loading={lazy ? 'lazy' : 'eager'}
      style={{
        objectFit: fit,
        width: contain ? 'auto' : '100%',
        height: contain ? 'auto' : '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block',
        margin: contain ? 'auto' : undefined,
      }}
    />
  );
}

export default function CarouselStage({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const data = block.data as Record<string, unknown>;
  const kind = String(data.kind ?? 'media');
  const items = useMemo(() => readItems(block), [block]);
  const skin = String(data.skin ?? 'carousel');
  const imageMode = kind === 'image';
  const perView = imageMode
    ? Math.min(6, Math.max(1, Number(data.slidesToShow) || 3))
    : skin === 'slideshow'
      ? 1
      : Math.min(6, Math.max(1, Number(data.slidesPerView) || 1));
  const step = Math.min(perView, Math.max(1, Number(data.slidesToScroll) || 1));
  const navigation = imageMode ? readNavigation(data) : data.showArrows === false && data.showDots === false ? 'none' : readNavigation({
    ...data,
    navigation: data.navigation ?? (data.showDots === false ? 'arrows' : 'arrows_dots'),
  });
  const showArrows = imageMode ? navigation === 'arrows' || navigation === 'arrows_dots' : data.showArrows !== false;
  const showDots = imageMode ? navigation === 'dots' || navigation === 'arrows_dots' : data.showDots !== false;
  const stage = readCarouselStageStyle(data, imageMode);
  const height = imageMode && String(data.imageSize ?? 'medium') !== 'custom' ? imageHeight(data) : stage.height;
  const {
    arrowSize,
    arrowColor,
    playSize,
    playColor,
    gap,
    radius,
    fit,
    widthPercent,
    padding,
    borderWidth,
    borderColor,
    slideBg,
    arrowShadow,
    dotSize,
    dotGap,
    dotColor,
    dotActiveColor,
    dotPosition,
    lightboxWidth,
    lightboxUi,
    lightboxUiHover,
    lightboxColor,
  } = stage;
  const effect = String(data.effect ?? 'slide');
  const loop = data.loop !== false;
  const autoplay = Boolean(data.autoplay) && !isEditing;
  const interval = Number(data.interval) || 5000;
  const direction = String(data.direction ?? 'left') === 'right' ? -1 : 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const count = items.length;
  const safeIndex = count ? ((index % count) + count) % count : 0;

  useEffect(() => {
    setIndex(0);
    setPlaying(null);
  }, [block.id, count]);

  useEffect(() => {
    if (!autoplay || paused || count <= 1) return;
    const timer = setInterval(() => setIndex((current) => current + direction * step), interval);
    return () => clearInterval(timer);
  }, [autoplay, count, direction, interval, paused, step]);

  if (!isEditing && count === 0) return null;

  const windowItems = count
    ? Array.from({ length: Math.min(perView, count) }, (_, offset) => items[(safeIndex + offset) % count]!)
    : [];

  function go(dir: -1 | 1) {
    if (count <= 1) return;
    const next = safeIndex + dir * direction * step;
    if (!loop && (next < 0 || next >= count)) return;
    setIndex(next);
    setPlaying(null);
    if (data.pauseOnInteraction) setPaused(true);
  }

  function openItem(item: Item) {
    if (isEditing) return;
    const href = carouselSlideHref(item, data);
    if (href) return;
    if (data.lightbox && item.url && !item.videoUrl) setLightbox(item.url);
  }

  const dots = showDots && count > 1 ? (
    <div
      className={`flex justify-center ${dotPosition === 'inside' ? 'absolute inset-x-0 bottom-3 z-20' : 'mt-3'}`}
      style={{ gap: dotGap }}
    >
      {items.map((_, dot) => (
        <button
          key={dot}
          type="button"
          aria-label={`Go to slide ${dot + 1}`}
          onClick={() => setIndex(dot)}
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: dot === safeIndex ? dotActiveColor : dotColor,
          }}
        />
      ))}
    </div>
  ) : null;
  const arrowClass = `absolute top-1/2 z-20 -translate-y-1/2 ${arrowShadow ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : ''}`;
  const lazy = data.lazyLoad !== false;

  return (
    <section
      className="relative my-6"
      style={{ width: `${widthPercent}%`, marginInline: widthPercent < 100 ? 'auto' : undefined }}
      onMouseEnter={() => data.pauseOnHover !== false && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden bg-slate-950" style={{ minHeight: count ? undefined : 220 }}>
        {count === 0 ? (
          <div className="flex h-[220px] items-center justify-center px-16 text-center text-sm text-slate-300">
            Add images in the panel.
          </div>
        ) : (
          <div
            key={`${safeIndex}-${effect}`}
            className={`flex ${effect === 'fade' ? 'blog-slide-fade' : ''} ${effect === 'cube' ? 'blog-carousel-cube' : ''}`}
            style={{ gap }}
          >
            {windowItems.map((item, offset) => {
              const absolute = (safeIndex + offset) % count;
              const embed = embedMediaUrl(item.videoUrl);
              const showVideo = item.mediaType === 'video' && embed && playing === absolute;
              const cover = skin === 'coverflow' && offset === Math.floor(windowItems.length / 2);
              const caption = captionFor(item, String(data.captionSource ?? 'none')) || (data.overlay === 'text' ? item.caption || item.title : '');
              const href = carouselSlideHref(item, data);
              return (
                <figure
                  key={`${item.url}-${item.videoUrl}-${offset}`}
                  className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"
                  style={{
                    height,
                    borderRadius: radius,
                    background: slideBg,
                    border: borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined,
                    padding,
                    transform: cover ? 'scale(1.04)' : undefined,
                  }}
                >
                  {showVideo ? (
                    <iframe src={embed} title={item.title || 'Video'} className="h-full w-full" allowFullScreen />
                  ) : item.url ? (
                    href ? (
                      <a
                        href={href}
                        className="flex h-full w-full items-center justify-center"
                        onClick={(event) => {
                          if (isEditing || event.currentTarget.closest('[data-widget-box]')) event.preventDefault();
                        }}
                      >
                        <SlideImage item={item} fit={fit} lazy={lazy} />
                      </a>
                    ) : (
                      <button type="button" className="flex h-full w-full items-center justify-center" onClick={() => openItem(item)}>
                        <SlideImage item={item} fit={fit} lazy={lazy} />
                      </button>
                    )
                  ) : (
                    <div className="h-full w-full bg-slate-900" />
                  )}
                  {item.mediaType === 'video' && embed && !showVideo ? (
                    <button
                      type="button"
                      aria-label="Play video"
                      className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55"
                      style={{ width: playSize, height: playSize, color: playColor }}
                      onClick={() => setPlaying(absolute)}
                    >
                      <span className="ml-1 inline-block border-y-[8px] border-l-[14px] border-y-transparent border-l-current" />
                    </button>
                  ) : null}
                  {caption ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-black/45 px-3 py-2 text-center text-sm text-white">
                      {caption}
                    </figcaption>
                  ) : null}
                </figure>
              );
            })}
          </div>
        )}
        {showArrows ? (
          <>
            <button type="button" aria-label="Previous" className={`${arrowClass} left-2`} style={{ color: arrowColor }} onClick={() => go(-1)}>
              <ChevronLeft size={arrowSize} />
            </button>
            <button type="button" aria-label="Next" className={`${arrowClass} right-2`} style={{ color: arrowColor }} onClick={() => go(1)}>
              <ChevronRight size={arrowSize} />
            </button>
          </>
        ) : null}
        {dotPosition === 'inside' ? dots : null}
      </div>
      {dotPosition === 'outside' ? dots : null}
      {lightbox ? (
        <button
          type="button"
          className="blog-carousel-lightbox fixed inset-0 z-[80] flex items-center justify-center p-6"
          style={{
            background: hexToRgba(lightboxColor, 0.8),
            ['--carousel-lb-ui' as string]: lightboxUi,
            ['--carousel-lb-hover' as string]: lightboxUiHover,
          }}
          onClick={() => setLightbox(null)}
          aria-label="Close image"
        >
          <img
            src={lightbox}
            alt=""
            className="blog-carousel-lightbox-img object-contain"
            style={{ width: `${lightboxWidth}%`, maxHeight: '90vh' }}
          />
        </button>
      ) : null}
    </section>
  );
}
