/** Shared brand + editor color tokens used across blog, carousel, and freeform. */

export type CarouselThemeColorSwatch = {
  bg: string;
  head: string;
  body: string;
  accent: string;
};

export type CarouselThemeColorPreset = {
  label: string;
  hint: string;
  swatch: CarouselThemeColorSwatch;
};

/** Core I Call BS brand swatches — single-click picks in freeform, image inspector, etc. */
export const EDITOR_BRAND_SWATCHES = [
  '#072a1b',
  '#fdc20f',
  '#FFD700',
  '#E8B800',
  '#FFFFFF',
  '#000000',
] as const;

/** Blog paragraph toolbar text colors (legacy flat list). */
export const EDITOR_TEXT_COLOR_SWATCHES = [
  '#0f172a',
  '#072a1b',
  '#b45309',
  '#15803d',
  '#b91c1c',
  '#7c3aed',
] as const;

/** Blog/post toolbar dropdown — I Call BS theme colors. */
export const EDITOR_POST_THEME_TEXT_COLORS = [
  '#072a1b',
  '#E8B800',
  '#FFD700',
  '#fdc20f',
  '#0f172a',
  '#FFFFFF',
] as const;

/** Blog/post toolbar dropdown — common text colors. */
export const EDITOR_POST_BASIC_TEXT_COLORS = [
  '#000000',
  '#ffffff',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#7c3aed',
  '#ea580c',
  '#ec4899',
] as const;

/** Blog paragraph toolbar highlight colors. */
export const EDITOR_HIGHLIGHT_SWATCHES = [
  '#E8B800',
  '#5BC8F0',
  '#072a1b',
  '#22c55e',
  '#f472b6',
  '#f97316',
] as const;

/** Carousel floating toolbar — readable on dark slide backgrounds. */
export const EDITOR_CAROUSEL_TEXT_SWATCHES = [
  '#FFFFFF',
  '#FFD700',
  '#fdc20f',
  '#072a1b',
  '#000000',
  '#A8C5E8',
] as const;

/** Post / page accent color presets in the blog CMS sidebar. */
export const EDITOR_ACCENT_PRESETS = [
  { value: '#E8B800', label: 'Gold' },
  { value: '#1B5E20', label: 'Forest' },
  { value: '#6A1B9A', label: 'Purple' },
  { value: '#0D2B45', label: 'Midnight' },
  { value: '#7B1818', label: 'Maroon' },
  { value: '#111111', label: 'Onyx' },
] as const;

/** Quick-apply carousel theme combos (background + headline + body + accent). */
export const CAROUSEL_THEME_COLOR_PRESETS: CarouselThemeColorPreset[] = [
  {
    label: 'BS Green',
    hint: 'Green + white + gold',
    swatch: { bg: '#072a1b', head: '#FFFFFF', body: '#FFFFFF', accent: '#FFD700' },
  },
  {
    label: 'BS Gold',
    hint: 'Gold + green text',
    swatch: { bg: '#FFD700', head: '#072a1b', body: '#1A1A2E', accent: '#072a1b' },
  },
  {
    label: 'Onyx',
    hint: 'Black + gold',
    swatch: { bg: '#0A0A0A', head: '#FFFFFF', body: '#E0E0E0', accent: '#FFD700' },
  },
  {
    label: 'Ivory',
    hint: 'Cream + navy text',
    swatch: { bg: '#F4F4F0', head: '#072a1b', body: '#1A1A2E', accent: '#C8A23E' },
  },
  {
    label: 'Cream + Navy',
    hint: 'Soft cream + navy + gold',
    swatch: { bg: '#FAF6EC', head: '#072a1b', body: '#2A2A4A', accent: '#FFD700' },
  },
  {
    label: 'Cream + Forest',
    hint: 'Cream + dark green text',
    swatch: { bg: '#F2EBDB', head: '#0F3D2E', body: '#1F2A26', accent: '#B8860B' },
  },
  {
    label: 'Sky',
    hint: 'Light blue + navy',
    swatch: { bg: '#A8C5E8', head: '#072a1b', body: '#0A0E24', accent: '#FFD700' },
  },
  {
    label: 'Navy + Sky',
    hint: 'Dark navy + light blue + gold',
    swatch: { bg: '#0E1B4D', head: '#A8C5E8', body: '#E5EEFA', accent: '#FFD700' },
  },
  {
    label: 'Royal Duo',
    hint: 'Dark blue + light blue',
    swatch: { bg: '#10286F', head: '#7FB2F0', body: '#D6E5F8', accent: '#7FB2F0' },
  },
  {
    label: 'Black & White',
    hint: 'Pure black + white',
    swatch: { bg: '#000000', head: '#FFFFFF', body: '#FFFFFF', accent: '#FFFFFF' },
  },
  {
    label: 'Forest',
    hint: 'Green + cream',
    swatch: { bg: '#0F3D2E', head: '#F4F4F0', body: '#E8E8DC', accent: '#FFD700' },
  },
];

export function normalizeHexColor(color: string, fallback = '#000000'): string {
  const trimmed = color.trim();
  if (!trimmed.startsWith('#')) return fallback;
  if (trimmed.length >= 7) return trimmed.slice(0, 7);
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export function hexColorsMatch(a: string, b: string): boolean {
  return normalizeHexColor(a).toLowerCase() === normalizeHexColor(b).toLowerCase();
}
