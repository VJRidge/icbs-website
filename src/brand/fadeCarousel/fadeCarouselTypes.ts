import type { CSSProperties, ReactNode } from 'react';

export type FadeAlign =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type FadeVariant = 'bleed' | 'split' | 'card';
export type FadeOverlayGradient = 'none' | 'bottom' | 'top' | 'radial';
export type FadeDotShape = 'dot' | 'line' | 'square';
export type FadeArrowShape = 'circle' | 'square' | 'none';
export type FadeArrowPosition = 'inside' | 'outside';
export type FadeEasing = 'ease-in-out' | 'ease-out' | 'ease-in' | 'cubic-premium' | 'cubic-soft';
export type FadeMotionFallback = 'cut' | 'static-first-slide';
export type FadeCtaVariant = 'primary' | 'secondary' | 'ghost';
export type FadeHeight = number | `${number}vh` | 'auto' | (string & {});

export type FadeCta = {
  label: string;
  href: string;
  variant?: FadeCtaVariant;
};

export type FadeTypeStyle = {
  size?: number | string;
  weight?: number | string;
  letterSpacing?: string;
  transform?: CSSProperties['textTransform'];
  color?: string;
  lineHeight?: number | string;
};

export type FadeCtaStyle = {
  background?: string;
  color?: string;
  border?: string;
  radius?: number | string;
  padding?: string;
  hoverBackground?: string;
  hoverColor?: string;
};

export type BoxEdges = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type ResponsiveBox = BoxEdges & {
  md?: BoxEdges;
  lg?: BoxEdges;
};

export type FadeHide = {
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

export type FadeSlideData = {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  body?: string;
  primaryCta?: FadeCta;
  secondaryCta?: FadeCta;
  textColor?: string;
};

export type FadeSlideProps = FadeSlideData & {
  index?: number;
  active?: boolean;
  total?: number;
  variant?: FadeVariant;
  align?: FadeAlign;
  overlayColor?: string;
  overlayOpacity?: number;
  overlayGradient?: FadeOverlayGradient;
  textColor?: string;
  maxContentWidth?: number | string;
  contentPadding?: number | string;
  lazyLoad?: boolean;
  eyebrowStyle?: FadeTypeStyle;
  titleStyle?: FadeTypeStyle;
  subtitleStyle?: FadeTypeStyle;
  bodyStyle?: FadeTypeStyle;
  primaryCtaStyle?: FadeCtaStyle;
  secondaryCtaStyle?: FadeCtaStyle;
  reducedMotion?: boolean;
};

export type FadeCarouselProps = {
  slides?: FadeSlideData[];
  children?: ReactNode;
  variant?: FadeVariant;
  autoplay?: boolean;
  autoplayInterval?: number;
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  startIndex?: number;
  height?: FadeHeight;
  align?: FadeAlign;
  overlayColor?: string;
  overlayOpacity?: number;
  overlayGradient?: FadeOverlayGradient;
  textColor?: string;
  eyebrowStyle?: FadeTypeStyle;
  titleStyle?: FadeTypeStyle;
  subtitleStyle?: FadeTypeStyle;
  bodyStyle?: FadeTypeStyle;
  primaryCtaStyle?: FadeCtaStyle;
  secondaryCtaStyle?: FadeCtaStyle;
  dotsActiveColor?: string;
  dotsInactiveColor?: string;
  dotsSize?: number;
  dotsSpacing?: number;
  dotsShape?: FadeDotShape;
  arrowsColor?: string;
  arrowsSize?: number;
  arrowsShape?: FadeArrowShape;
  arrowsPosition?: FadeArrowPosition;
  arrowsHoverBackground?: string;
  maxContentWidth?: number | string;
  contentPadding?: number | string;
  transitionDuration?: number;
  transitionEasing?: FadeEasing;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
  pauseWhenOffscreen?: boolean;
  lazyLoad?: boolean;
  preloadNext?: boolean;
  keyboard?: boolean;
  swipe?: boolean;
  swipeThreshold?: number;
  motionFallback?: FadeMotionFallback;
  padding?: ResponsiveBox;
  margin?: ResponsiveBox;
  hide?: FadeHide;
  ariaLabel?: string;
  live?: 'off' | 'polite';
  className?: string;
  id?: string;
  zIndex?: number;
};
