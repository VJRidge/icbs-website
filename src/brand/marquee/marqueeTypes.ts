import type { ReactNode } from 'react';

export type MarqueeDirection = 'left' | 'right';
export type MarqueeTint = 'none' | 'grayscale' | 'mono';
export type MarqueeRowVariant = 'strip' | 'chip';
export type MarqueeMotionFallback = 'freeze' | 'fade' | 'stacked-grid';

export type MarqueeItem = {
  image: string;
  alt: string;
  href?: string;
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

export type MarqueeHide = {
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

export type MarqueeTypeStyle = {
  size?: number | string;
  weight?: number | string;
  letterSpacing?: string;
  color?: string;
};

export type MarqueeRowPlan = {
  direction: MarqueeDirection;
  speed: number;
};

export type MarqueeRowProps = {
  items: MarqueeItem[];
  direction?: MarqueeDirection;
  speed?: number;
  gap?: number | string;
  itemMaxHeight?: number;
  pauseOnHover?: boolean;
  showEdgeFade?: boolean;
  edgeFadeColor?: string;
  variant?: MarqueeRowVariant;
  tint?: MarqueeTint;
  itemOpacity?: number;
  itemHoverOpacity?: number;
  colorizeOnHover?: boolean;
  rowPaddingY?: number;
  stripBackground?: string;
  lazyLoad?: boolean;
  reducedMotion?: boolean;
  motionFallback?: MarqueeMotionFallback;
};

export type MarqueeProps = {
  items?: MarqueeItem[];
  rows?: number;
  directions?: MarqueeDirection[];
  speeds?: number[];
  children?: ReactNode;
  eyebrow?: string;
  heading?: string;
  ariaLabel?: string;
  background?: string;
  stripBackground?: string;
  edgeFadeColor?: string;
  showEdgeFade?: boolean;
  pauseOnHover?: boolean;
  gap?: number | string;
  itemMaxHeight?: number;
  tint?: MarqueeTint;
  colorizeOnHover?: boolean;
  itemOpacity?: number;
  itemHoverOpacity?: number;
  eyebrowStyle?: MarqueeTypeStyle;
  headingStyle?: MarqueeTypeStyle;
  rowPaddingY?: number;
  borderTop?: string;
  borderBottom?: string;
  padding?: ResponsiveBox;
  margin?: ResponsiveBox;
  hide?: MarqueeHide;
  motionFallback?: MarqueeMotionFallback;
  lazyLoad?: boolean;
  className?: string;
  id?: string;
  zIndex?: number;
};
