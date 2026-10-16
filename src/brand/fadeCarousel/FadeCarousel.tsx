import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type TouchEvent,
} from 'react';
import FadeControls from './FadeControls';
import FadeSlide from './FadeSlide';
import {
  clampStartIndex,
  fadeBoxVars,
  fadeEasing,
  fadeHeightStyle,
  fadeVisibilityClass,
  nextFadeIndex,
  prevFadeIndex,
  shouldLazyLoadSlide,
} from './fadeCarouselState';
import type { FadeCarouselProps, FadeSlideData, FadeSlideProps } from './fadeCarouselTypes';
import './fadeCarousel.css';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return reduced;
}

function childSlides(children: FadeCarouselProps['children']): FadeSlideData[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const props = child.props as FadeSlideData;
    if (!props.title && !props.image) return [];
    return [props];
  });
}

export default function FadeCarousel({
  slides,
  children,
  variant = 'bleed',
  autoplay = true,
  autoplayInterval = 6,
  loop = true,
  showArrows = true,
  showDots = true,
  showCounter = false,
  startIndex = 0,
  height = '80vh',
  align = 'bottom-left',
  overlayColor = '#072a1b',
  overlayOpacity = 0.62,
  overlayGradient = 'bottom',
  textColor = '#f7f7f2',
  eyebrowStyle,
  titleStyle,
  subtitleStyle,
  bodyStyle,
  primaryCtaStyle,
  secondaryCtaStyle,
  dotsActiveColor = '#fdc20f',
  dotsInactiveColor = 'rgba(247,247,242,0.45)',
  dotsSize = 8,
  dotsSpacing = 8,
  dotsShape = 'line',
  arrowsColor = '#f7f7f2',
  arrowsSize = 22,
  arrowsShape = 'circle',
  arrowsPosition = 'inside',
  arrowsHoverBackground,
  maxContentWidth,
  contentPadding,
  transitionDuration = 800,
  transitionEasing = 'cubic-premium',
  pauseOnHover = true,
  pauseOnFocus = true,
  pauseWhenOffscreen = true,
  lazyLoad = true,
  preloadNext = true,
  keyboard = true,
  swipe = true,
  swipeThreshold = 40,
  motionFallback = 'cut',
  padding,
  margin,
  hide,
  ariaLabel = 'Featured slides',
  live = 'polite',
  className,
  id,
  zIndex,
}: FadeCarouselProps) {
  const reducedMotion = usePrefersReducedMotion();
  const list = slides?.length ? slides : childSlides(children);
  const count = list.length;
  const staticFirst = reducedMotion && motionFallback === 'static-first-slide';
  const [active, setActive] = useState(() => clampStartIndex(startIndex, Math.max(count, 1)));
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const touchX = useRef<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const canPlay =
    autoplay &&
    !staticFirst &&
    !reducedMotion &&
    count > 1 &&
    !userPaused &&
    !(pauseOnHover && hoverPaused) &&
    !(pauseOnFocus && focusPaused) &&
    !hidden &&
    !(pauseWhenOffscreen && offscreen);

  const go = useCallback(
    (index: number) => {
      setActive(clampStartIndex(index, count));
    },
    [count],
  );
  const next = useCallback(() => go(nextFadeIndex(active, count, loop)), [active, count, go, loop]);
  const prev = useCallback(() => go(prevFadeIndex(active, count, loop)), [active, count, go, loop]);

  useEffect(() => {
    setActive(clampStartIndex(startIndex, Math.max(count, 1)));
  }, [count, startIndex]);

  useEffect(() => {
    if (!canPlay) return;
    const timer = window.setInterval(next, Math.max(2, autoplayInterval) * 1000);
    return () => window.clearInterval(timer);
  }, [autoplayInterval, canPlay, next]);

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== 'visible');
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!pauseWhenOffscreen || !rootRef.current) return;
    const node = rootRef.current;
    const observer = new IntersectionObserver((entries) => {
      setOffscreen(!(entries[0]?.isIntersecting ?? true));
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [pauseWhenOffscreen]);

  useEffect(() => {
    if (!preloadNext || count < 2) return;
    const upcoming = list[nextFadeIndex(active, count, loop)];
    if (!upcoming?.image) return;
    const img = new Image();
    img.src = upcoming.image;
  }, [active, count, list, loop, preloadNext]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!keyboard || staticFirst) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prev();
    } else if (event.key === ' ' && !(event.target as HTMLElement).closest('a, button')) {
      event.preventDefault();
      setUserPaused((value) => !value);
    }
  }

  function onTouchStart(event: TouchEvent) {
    if (!swipe) return;
    touchX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent) {
    if (!swipe || touchX.current == null) return;
    const x = event.changedTouches[0]?.clientX ?? touchX.current;
    const delta = x - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < swipeThreshold) return;
    if (delta < 0) next();
    else prev();
  }

  const slideNodes = useMemo(() => {
    if (children && !slides?.length) {
      return Children.map(children, (child, index) => {
        if (!isValidElement(child) || (staticFirst && index > 0)) return null;
        return cloneElement(child as ReactElement<FadeSlideProps>, {
          index,
          active: index === active,
          total: count,
          variant,
          align,
          overlayColor,
          overlayOpacity,
          overlayGradient,
          textColor: (child.props as FadeSlideProps).textColor ?? textColor,
          maxContentWidth,
          contentPadding,
          lazyLoad: shouldLazyLoadSlide(index, active, lazyLoad),
          eyebrowStyle,
          titleStyle,
          subtitleStyle,
          bodyStyle,
          primaryCtaStyle,
          secondaryCtaStyle,
          reducedMotion,
        });
      });
    }
    return list.map((slide, index) => {
      if (staticFirst && index > 0) return null;
      return (
        <FadeSlide
          key={`${slide.title}-${index}`}
          {...slide}
          index={index}
          active={index === active}
          total={count}
          variant={variant}
          align={align}
          overlayColor={overlayColor}
          overlayOpacity={overlayOpacity}
          overlayGradient={overlayGradient}
          textColor={slide.textColor ?? textColor}
          maxContentWidth={maxContentWidth}
          contentPadding={contentPadding}
          lazyLoad={shouldLazyLoadSlide(index, active, lazyLoad)}
          eyebrowStyle={eyebrowStyle}
          titleStyle={titleStyle}
          subtitleStyle={subtitleStyle}
          bodyStyle={bodyStyle}
          primaryCtaStyle={primaryCtaStyle}
          secondaryCtaStyle={secondaryCtaStyle}
          reducedMotion={reducedMotion}
        />
      );
    });
  }, [
    active,
    align,
    bodyStyle,
    children,
    contentPadding,
    count,
    eyebrowStyle,
    lazyLoad,
    list,
    maxContentWidth,
    overlayColor,
    overlayGradient,
    overlayOpacity,
    primaryCtaStyle,
    reducedMotion,
    secondaryCtaStyle,
    slides,
    staticFirst,
    subtitleStyle,
    textColor,
    titleStyle,
    variant,
  ]);

  if (!count) return null;
  const current = list[active];

  return (
    <section
      ref={rootRef}
      id={id}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={keyboard ? 0 : undefined}
      onKeyDown={onKeyDown}
      onMouseEnter={() => pauseOnHover && setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => pauseOnFocus && setFocusPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocusPaused(false);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={[
        'icbs-fade',
        `icbs-fade--${variant}`,
        canPlay ? 'is-playing' : 'is-paused',
        reducedMotion ? 'is-cut' : '',
        fadeVisibilityClass(hide),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          ...fadeBoxVars({ padding, margin }),
          zIndex,
          ['--fade-ms' as string]: `${transitionDuration}ms`,
          ['--fade-ease' as string]: fadeEasing(transitionEasing),
          ['--fade-interval' as string]: `${autoplayInterval}s`,
          ['--fade-dot-active' as string]: dotsActiveColor,
          ['--fade-dot-idle' as string]: dotsInactiveColor,
          ['--fade-dot-size' as string]: `${dotsSize}px`,
          ['--fade-dot-gap' as string]: `${dotsSpacing}px`,
          ['--fade-arrow' as string]: arrowsColor,
          ['--fade-arrow-hover' as string]: arrowsHoverBackground,
          ['--fade-ink' as string]: textColor,
        } as CSSProperties
      }
    >
      {live !== 'off' ? (
        <div className="icbs-fade-live" aria-live={live} aria-atomic="true">
          {current ? `Slide ${active + 1} of ${count}: ${current.title}` : ''}
        </div>
      ) : null}
      <div className="icbs-fade-stage" style={fadeHeightStyle(height)}>
        {slideNodes}
        {!staticFirst ? (
          <FadeControls
            count={count}
            active={active}
            autoplay={autoplay && !reducedMotion}
            playing={canPlay}
            showArrows={showArrows}
            showDots={showDots}
            showCounter={showCounter}
            arrowsPosition={arrowsPosition}
            arrowsShape={arrowsShape}
            arrowsSize={arrowsSize}
            dotsShape={dotsShape}
            onPrev={prev}
            onNext={next}
            onGo={go}
            onToggle={() => setUserPaused((value) => !value)}
          />
        ) : null}
      </div>
    </section>
  );
}

export { FadeSlide };
