import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import MarqueeRow from './MarqueeRow';
import { boxToCssVars, marqueeVisibilityClass, planMarqueeRows, typeStyle } from './marqueeStyle';
import type { MarqueeProps } from './marqueeTypes';
import './marquee.css';

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

export default function Marquee({
  items = [],
  rows = 1,
  directions,
  speeds,
  children,
  eyebrow,
  heading,
  ariaLabel = 'Logos of companies using this brand',
  background,
  stripBackground,
  edgeFadeColor,
  showEdgeFade = true,
  pauseOnHover = true,
  gap,
  itemMaxHeight,
  tint,
  colorizeOnHover = true,
  itemOpacity,
  itemHoverOpacity,
  eyebrowStyle,
  headingStyle,
  rowPaddingY,
  borderTop,
  borderBottom,
  padding,
  margin,
  hide,
  motionFallback = 'freeze',
  lazyLoad = true,
  className,
  id,
  zIndex,
}: MarqueeProps) {
  const reducedMotion = usePrefersReducedMotion();
  const plans = planMarqueeRows(rows, directions, speeds);
  const fade = edgeFadeColor ?? background ?? '#ffffff';
  const vars = boxToCssVars({ padding, margin });
  const generated: ReactNode =
    children ??
    plans.map((plan, index) => (
      <MarqueeRow
        key={`${plan.direction}-${plan.speed}-${index}`}
        items={items}
        direction={plan.direction}
        speed={plan.speed}
        gap={gap}
        itemMaxHeight={itemMaxHeight}
        pauseOnHover={pauseOnHover}
        showEdgeFade={showEdgeFade}
        edgeFadeColor={fade}
        variant="strip"
        tint={tint}
        colorizeOnHover={colorizeOnHover}
        itemOpacity={itemOpacity}
        itemHoverOpacity={itemHoverOpacity}
        rowPaddingY={rowPaddingY}
        stripBackground={stripBackground}
        lazyLoad={lazyLoad}
        reducedMotion={reducedMotion}
        motionFallback={motionFallback}
      />
    ));

  return (
    <section
      id={id}
      role="region"
      aria-label={ariaLabel}
      className={['icbs-marquee', marqueeVisibilityClass(hide), className].filter(Boolean).join(' ')}
      style={
        {
          ...vars,
          background,
          borderTop,
          borderBottom,
          zIndex,
        } as CSSProperties
      }
    >
      {eyebrow || heading ? (
        <header className="icbs-marquee-copy">
          {eyebrow ? (
            <p className="icbs-marquee-eyebrow" style={typeStyle(eyebrowStyle)}>
              {eyebrow}
            </p>
          ) : null}
          {heading ? (
            <h2 className="icbs-marquee-heading" style={typeStyle(headingStyle)}>
              {heading}
            </h2>
          ) : null}
        </header>
      ) : null}
      <div className="icbs-marquee-stack">{generated}</div>
    </section>
  );
}

export { MarqueeRow };
