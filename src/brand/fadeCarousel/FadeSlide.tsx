import type { CSSProperties } from 'react';
import { safeHref } from '../../studio/lib/blog/safeHref';
import { alignItems, overlayGradientClass, typeStyle } from './fadeCarouselState';
import type { FadeCta, FadeCtaStyle, FadeSlideProps } from './fadeCarouselTypes';

function Cta({ cta, tone, style }: { cta: FadeCta; tone: 'primary' | 'secondary'; style?: FadeCtaStyle }) {
  const href = safeHref(cta.href);
  if (!href) return null;
  const variant = cta.variant ?? (tone === 'primary' ? 'primary' : 'secondary');
  return (
    <a
      href={href}
      className={`icbs-fade-cta${variant !== 'primary' ? ` icbs-fade-cta--${variant}` : ''}`}
      style={
        {
          background: style?.background,
          color: style?.color,
          border: style?.border,
          borderRadius: typeof style?.radius === 'number' ? `${style.radius}px` : style?.radius,
          padding: style?.padding,
          ['--fade-cta-hover-bg' as string]: style?.hoverBackground,
          ['--fade-cta-hover-ink' as string]: style?.hoverColor,
        } as CSSProperties
      }
    >
      {cta.label}
    </a>
  );
}

export default function FadeSlide({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  body,
  primaryCta,
  secondaryCta,
  index = 0,
  active = false,
  total = 1,
  variant = 'bleed',
  align = 'bottom-left',
  overlayColor = '#072a1b',
  overlayOpacity = 0.62,
  overlayGradient = 'bottom',
  textColor,
  maxContentWidth,
  contentPadding,
  lazyLoad = false,
  eyebrowStyle,
  titleStyle,
  subtitleStyle,
  bodyStyle,
  primaryCtaStyle,
  secondaryCtaStyle,
}: FadeSlideProps) {
  const copyAlign = alignItems(align);
  const copyStyle: CSSProperties = {
    ...copyAlign,
    color: textColor,
    maxWidth: typeof maxContentWidth === 'number' ? `${maxContentWidth}px` : maxContentWidth,
    padding: typeof contentPadding === 'number' ? `${contentPadding}px` : contentPadding,
    ['--fade-copy-max' as string]: typeof maxContentWidth === 'number' ? `${maxContentWidth}px` : maxContentWidth,
    ['--fade-copy-pad' as string]: typeof contentPadding === 'number' ? `${contentPadding}px` : contentPadding,
  };
  const overlayStyle = {
    ['--fade-overlay' as string]: overlayColor,
    ['--fade-overlay-a' as string]: String(overlayOpacity),
  } as CSSProperties;

  const copy = (
    <div className="icbs-fade-copy" style={copyStyle}>
      {eyebrow ? (
        <p className="icbs-fade-eyebrow" style={typeStyle(eyebrowStyle)}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className="icbs-fade-title" style={typeStyle(titleStyle)}>
        {title}
      </h2>
      {subtitle ? (
        <p className="icbs-fade-sub" style={typeStyle(subtitleStyle)}>
          {subtitle}
        </p>
      ) : null}
      {body ? (
        <p className="icbs-fade-body" style={typeStyle(bodyStyle)}>
          {body}
        </p>
      ) : null}
      {primaryCta || secondaryCta ? (
        <div className="icbs-fade-ctas">
          {primaryCta ? <Cta cta={primaryCta} tone="primary" style={primaryCtaStyle} /> : null}
          {secondaryCta ? <Cta cta={secondaryCta} tone="secondary" style={secondaryCtaStyle} /> : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <article
      className={`icbs-fade-slide${active ? ' is-active' : ''}`}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}`}
      aria-hidden={active ? undefined : true}
      inert={active ? undefined : true}
    >
      <div className="icbs-fade-media">
        {image ? (
          <img src={image} alt={imageAlt} loading={lazyLoad ? 'lazy' : 'eager'} decoding="async" />
        ) : null}
        {variant !== 'split' ? (
          <div className={`icbs-fade-overlay ${overlayGradientClass(overlayGradient)}`} style={overlayStyle} />
        ) : null}
      </div>
      {copy}
    </article>
  );
}
