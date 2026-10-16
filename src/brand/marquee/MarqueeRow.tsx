import { safeHref } from '../../studio/lib/blog/safeHref';
import { duplicateMarqueeTrack, gapValue, tintFilter } from './marqueeStyle';
import type { MarqueeItem, MarqueeRowProps } from './marqueeTypes';

function MarqueeLogo({ item, lazyLoad }: { item: MarqueeItem; lazyLoad: boolean }) {
  const decorative = !item.alt.trim();
  return (
    <img
      src={item.image}
      alt={decorative ? '' : item.alt}
      aria-hidden={decorative ? true : undefined}
      loading={lazyLoad ? 'lazy' : 'eager'}
      decoding="async"
    />
  );
}

export default function MarqueeRow({
  items,
  direction = 'left',
  speed = 40,
  gap,
  itemMaxHeight = 40,
  pauseOnHover = true,
  showEdgeFade = true,
  edgeFadeColor,
  variant = 'strip',
  tint = 'none',
  itemOpacity = 0.78,
  itemHoverOpacity = 1,
  colorizeOnHover = true,
  rowPaddingY,
  stripBackground,
  lazyLoad = true,
  reducedMotion = false,
  motionFallback = 'freeze',
}: MarqueeRowProps) {
  if (!items.length) return null;

  const staticMode = reducedMotion;
  const loop = staticMode ? items : duplicateMarqueeTrack(items);
  const fallbackClass =
    motionFallback === 'stacked-grid'
      ? 'icbs-marquee-track--grid'
      : motionFallback === 'fade'
        ? 'icbs-marquee-track--static'
        : 'icbs-marquee-track--freeze';
  const trackClass = staticMode ? `icbs-marquee-track ${fallbackClass}` : 'icbs-marquee-track';

  return (
    <div
      className={[
        'icbs-marquee-row',
        showEdgeFade && !staticMode ? 'icbs-marquee-row--fade' : '',
        pauseOnHover ? 'is-pause-hover' : '',
        colorizeOnHover ? 'is-colorize' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        background: stripBackground,
        ['--marquee-duration' as string]: `${speed}s`,
        ['--marquee-direction' as string]: direction === 'right' ? 'reverse' : 'normal',
        ['--marquee-gap' as string]: gapValue(gap),
        ['--marquee-item-h' as string]: `${itemMaxHeight}px`,
        ['--marquee-item-opacity' as string]: String(itemOpacity),
        ['--marquee-item-hover-opacity' as string]: String(itemHoverOpacity),
        ['--marquee-tint' as string]: tintFilter(tint),
        ['--marquee-row-py' as string]: rowPaddingY != null ? `${rowPaddingY}px` : undefined,
        ['--marquee-strip-bg' as string]: stripBackground,
        ['--marquee-fade' as string]: edgeFadeColor,
      }}
    >
      <div className={trackClass}>
        {loop.map((item, index) => {
          const href = safeHref(item.href);
          const className = `icbs-marquee-item${variant === 'chip' ? ' icbs-marquee-item--chip' : ''}`;
          const face = <MarqueeLogo item={item} lazyLoad={lazyLoad} />;
          if (href) {
            return (
              <a key={`${item.image}-${index}`} className={className} href={href}>
                {face}
              </a>
            );
          }
          return (
            <div key={`${item.image}-${index}`} className={className}>
              {face}
            </div>
          );
        })}
      </div>
    </div>
  );
}
