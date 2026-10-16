import type {
  BoxEdges,
  MarqueeDirection,
  MarqueeHide,
  MarqueeProps,
  MarqueeRowPlan,
  MarqueeTint,
  ResponsiveBox,
} from './marqueeTypes';

const DEFAULT_DIRECTIONS: MarqueeDirection[] = ['left', 'right', 'left'];
const DEFAULT_SPEEDS = [40, 28, 34];

export function planMarqueeRows(
  count = 1,
  directions?: MarqueeDirection[],
  speeds?: number[],
): MarqueeRowPlan[] {
  const rows = Math.min(3, Math.max(1, Math.round(Number(count) || 1)));
  return Array.from({ length: rows }, (_, index) => ({
    direction: directions?.[index] === 'right' || directions?.[index] === 'left' ? directions[index]! : DEFAULT_DIRECTIONS[index]!,
    speed: Number.isFinite(Number(speeds?.[index])) ? Math.max(6, Number(speeds?.[index])) : DEFAULT_SPEEDS[index]!,
  }));
}

export function duplicateMarqueeTrack<T>(items: T[]): T[] {
  if (!items.length) return [];
  return [...items, ...items];
}

export function marqueeVisibilityClass(hide?: MarqueeHide): string {
  return [
    hide?.mobile ? 'icbs-marquee-hide-mobile' : '',
    hide?.tablet ? 'icbs-marquee-hide-tablet' : '',
    hide?.desktop ? 'icbs-marquee-hide-desktop' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function tintFilter(tint: MarqueeTint | undefined): string {
  if (tint === 'grayscale') return 'grayscale(1)';
  if (tint === 'mono') return 'grayscale(1) contrast(0.2) brightness(1.15)';
  return 'none';
}

function edgePx(box: BoxEdges | undefined, side: keyof BoxEdges): string | undefined {
  const value = box?.[side];
  return Number.isFinite(Number(value)) ? `${Number(value)}px` : undefined;
}

export function boxToCssVars(input: { padding?: ResponsiveBox; margin?: ResponsiveBox }): Record<string, string> {
  const vars: Record<string, string> = {};
  const write = (prefix: string, box: ResponsiveBox | undefined, kind: 'p' | 'm') => {
    if (!box) return;
    const map: Array<[string, keyof BoxEdges]> = [
      [`--marquee-${kind}t${prefix}`, 'top'],
      [`--marquee-${kind}r${prefix}`, 'right'],
      [`--marquee-${kind}b${prefix}`, 'bottom'],
      [`--marquee-${kind}l${prefix}`, 'left'],
    ];
    for (const [key, side] of map) {
      const value = edgePx(box, side);
      if (value) vars[key] = value;
    }
  };
  write('', input.padding, 'p');
  write('-md', input.padding?.md, 'p');
  write('-lg', input.padding?.lg, 'p');
  write('', input.margin, 'm');
  write('-md', input.margin?.md, 'm');
  write('-lg', input.margin?.lg, 'm');
  return vars;
}

export function typeStyle(style?: MarqueeProps['eyebrowStyle']): Record<string, string> {
  if (!style) return {};
  const next: Record<string, string> = {};
  if (style.size != null) next.fontSize = typeof style.size === 'number' ? `${style.size}px` : style.size;
  if (style.weight != null) next.fontWeight = String(style.weight);
  if (style.letterSpacing) next.letterSpacing = style.letterSpacing;
  if (style.color) next.color = style.color;
  return next;
}

export function gapValue(gap?: number | string): string {
  if (typeof gap === 'number' && Number.isFinite(gap)) return `${gap}px`;
  if (typeof gap === 'string' && gap.trim()) return gap;
  return '2.5rem';
}
