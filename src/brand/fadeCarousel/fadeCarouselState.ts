import type {
  BoxEdges,
  FadeAlign,
  FadeEasing,
  FadeHeight,
  FadeHide,
  FadeOverlayGradient,
  ResponsiveBox,
} from './fadeCarouselTypes';

export function nextFadeIndex(active: number, count: number, loop: boolean): number {
  if (count <= 0) return 0;
  if (active < count - 1) return active + 1;
  return loop ? 0 : active;
}

export function prevFadeIndex(active: number, count: number, loop: boolean): number {
  if (count <= 0) return 0;
  if (active > 0) return active - 1;
  return loop ? count - 1 : active;
}

export function clampStartIndex(start: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(start)) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(start)));
}

export function fadeHeightStyle(height: FadeHeight | undefined): { height: string } {
  if (height == null || height === 'auto') return { height: 'auto' };
  if (typeof height === 'number' && Number.isFinite(height)) return { height: `${height}px` };
  return { height: String(height) };
}

const ALIGN: Record<FadeAlign, { alignItems: string; justifyContent: string }> = {
  'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start' },
  'top-center': { alignItems: 'center', justifyContent: 'flex-start' },
  'top-right': { alignItems: 'flex-end', justifyContent: 'flex-start' },
  'center-left': { alignItems: 'flex-start', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  'center-right': { alignItems: 'flex-end', justifyContent: 'center' },
  'bottom-left': { alignItems: 'flex-start', justifyContent: 'flex-end' },
  'bottom-center': { alignItems: 'center', justifyContent: 'flex-end' },
  'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end' },
};

export function alignItems(align: FadeAlign | undefined) {
  return ALIGN[align ?? 'bottom-left'];
}

export function fadeEasing(easing: FadeEasing | undefined): string {
  if (easing === 'ease-in-out') return 'ease-in-out';
  if (easing === 'ease-out') return 'ease-out';
  if (easing === 'ease-in') return 'ease-in';
  if (easing === 'cubic-soft') return 'cubic-bezier(0.4, 0, 0.2, 1)';
  return 'cubic-bezier(0.22, 1, 0.36, 1)';
}

export function overlayGradientClass(kind: FadeOverlayGradient | undefined): string {
  if (kind === 'top') return 'icbs-fade-overlay--top';
  if (kind === 'radial') return 'icbs-fade-overlay--radial';
  if (kind === 'none') return 'icbs-fade-overlay--none';
  return 'icbs-fade-overlay--bottom';
}

export function shouldLazyLoadSlide(index: number, active: number, lazyLoad: boolean): boolean {
  if (!lazyLoad) return false;
  return index > 1 && index !== active && index !== active + 1;
}

export function fadeVisibilityClass(hide?: FadeHide): string {
  return [
    hide?.mobile ? 'icbs-fade-hide-mobile' : '',
    hide?.tablet ? 'icbs-fade-hide-tablet' : '',
    hide?.desktop ? 'icbs-fade-hide-desktop' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function edgePx(box: BoxEdges | undefined, side: keyof BoxEdges): string | undefined {
  const value = box?.[side];
  return Number.isFinite(Number(value)) ? `${Number(value)}px` : undefined;
}

export function fadeBoxVars(input: { padding?: ResponsiveBox; margin?: ResponsiveBox }): Record<string, string> {
  const vars: Record<string, string> = {};
  const write = (prefix: string, box: ResponsiveBox | undefined, kind: 'p' | 'm') => {
    if (!box) return;
    const map: Array<[string, keyof BoxEdges]> = [
      [`--fade-${kind}t${prefix}`, 'top'],
      [`--fade-${kind}r${prefix}`, 'right'],
      [`--fade-${kind}b${prefix}`, 'bottom'],
      [`--fade-${kind}l${prefix}`, 'left'],
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

export function typeStyle(style?: {
  size?: number | string;
  weight?: number | string;
  letterSpacing?: string;
  transform?: string;
  color?: string;
  lineHeight?: number | string;
}): Record<string, string> {
  if (!style) return {};
  const next: Record<string, string> = {};
  if (style.size != null) next.fontSize = typeof style.size === 'number' ? `${style.size}px` : String(style.size);
  if (style.weight != null) next.fontWeight = String(style.weight);
  if (style.letterSpacing) next.letterSpacing = style.letterSpacing;
  if (style.transform) next.textTransform = style.transform;
  if (style.color) next.color = style.color;
  if (style.lineHeight != null) next.lineHeight = String(style.lineHeight);
  return next;
}
