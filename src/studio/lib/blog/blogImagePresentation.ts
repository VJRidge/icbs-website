import { cssFilterFromAdjustments } from './blogImageProcessing';

/** Keys copied with “Copy style” for image blocks (not url / alt / caption). */
export const IMAGE_STYLE_CLIPBOARD_KEYS = [
  'width',
  'scale',
  'brightness',
  'contrast',
  'saturation',
  'cropX',
  'cropY',
  'cropW',
  'cropH',
  'borderRadiusPx',
  'shadowPreset',
  'borderWidthPx',
  'borderColor',
  'overlayColor',
  'overlayOpacity',
  'overlayBlendMode',
  'filterPreset',
  'extraBlurPx',
  'extraGrayscale',
  'hueRotateDeg',
  'overlayTitle',
  'overlaySubtitle',
  'overlayPlacement',
  'overlayTextColor',
  'overlayTextShadow',
  'overlayTitleSize',
  'hoverEffect',
] as const;

export type ImageStyleClipboardKey = (typeof IMAGE_STYLE_CLIPBOARD_KEYS)[number];

export function pickImageStyleForClipboard(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of IMAGE_STYLE_CLIPBOARD_KEYS) {
    if (k in data) out[k] = data[k];
  }
  return out;
}

export function presetFilterFragment(preset: string): string {
  switch (preset) {
    case 'warm':
      return 'sepia(12%) saturate(112%)';
    case 'cool':
      return 'saturate(92%) hue-rotate(-8deg)';
    case 'bw':
      return 'grayscale(100%)';
    case 'vivid':
      return 'saturate(135%) contrast(105%)';
    case 'fade':
      return 'saturate(85%) brightness(104%)';
    case 'crisp':
      return 'contrast(112%) saturate(108%)';
    default:
      return '';
  }
}

export function buildBlogImageFilterCss(data: {
  brightness: number;
  contrast: number;
  saturation: number;
  filterPreset: string;
  extraBlurPx: number;
  extraGrayscale: number;
  hueRotateDeg: number;
}): string {
  const base = cssFilterFromAdjustments({
    brightness: data.brightness,
    contrast: data.contrast,
    saturation: data.saturation,
  });
  const parts = [base, presetFilterFragment(data.filterPreset)];
  if (data.extraBlurPx > 0) parts.push(`blur(${data.extraBlurPx}px)`);
  if (data.extraGrayscale > 0) parts.push(`grayscale(${Math.min(100, data.extraGrayscale)}%)`);
  if (data.hueRotateDeg) parts.push(`hue-rotate(${data.hueRotateDeg}deg)`);
  return parts.filter(Boolean).join(' ');
}

export function boxShadowFromPreset(preset: string): string {
  switch (preset) {
    case 'sm':
      return '0 1px 2px rgba(0,0,0,0.06)';
    case 'md':
      return '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)';
    case 'lg':
      return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
    case 'xl':
      return '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
    case 'inner':
      return 'inset 0 2px 8px rgba(0,0,0,0.12)';
    default:
      return 'none';
  }
}

export function overlayPlacementClass(placement: string): string {
  switch (placement) {
    case 'top-left':
      return 'top-3 left-3 right-auto bottom-auto';
    case 'top-center':
      return 'top-3 left-1/2 right-auto bottom-auto -translate-x-1/2';
    case 'bottom-center':
      return 'bottom-3 left-1/2 right-auto top-auto -translate-x-1/2';
    case 'bottom-left':
      return 'bottom-3 left-3 right-auto top-auto';
    case 'center':
    default:
      return 'top-1/2 left-1/2 right-auto bottom-auto -translate-x-1/2 -translate-y-1/2';
  }
}

/** HTML `class` for overlay copy (matches `index.css` blog-block-img-overlay-text modifiers). */
export function overlayPlacementHtmlClass(placement: string): string {
  switch (placement) {
    case 'top-left':
      return 'blog-block-img-overlay-text blog-block-img-overlay-text--tl';
    case 'top-center':
      return 'blog-block-img-overlay-text blog-block-img-overlay-text--tc';
    case 'bottom-center':
      return 'blog-block-img-overlay-text blog-block-img-overlay-text--bc';
    case 'bottom-left':
      return 'blog-block-img-overlay-text blog-block-img-overlay-text--bl';
    case 'center':
    default:
      return 'blog-block-img-overlay-text blog-block-img-overlay-text--c';
  }
}

export function overlayTitleHtmlClass(size: string): string {
  switch (size) {
    case 'sm':
      return 'blog-block-img-title-sm';
    case 'md':
      return 'blog-block-img-title-md';
    case 'xl':
      return 'blog-block-img-title-xl';
    case 'lg':
    default:
      return 'blog-block-img-title-lg';
  }
}

export function overlayTitleSizeClass(size: string): string {
  switch (size) {
    case 'sm':
      return 'text-sm sm:text-base';
    case 'md':
      return 'text-base sm:text-lg';
    case 'xl':
      return 'text-xl sm:text-2xl md:text-3xl';
    case 'lg':
    default:
      return 'text-lg sm:text-xl md:text-2xl';
  }
}

export function hoverInnerClass(effect: string): string {
  switch (effect) {
    case 'zoom':
      return 'blog-block-img-hover-zoom';
    case 'lift':
      return 'blog-block-img-hover-lift';
    default:
      return '';
  }
}
