import { readFeaturedImageRatio } from './featuredImage';

export type PostTeaserSkin = 'classic' | 'cards' | 'full';
export type PostTeaserImagePosition = 'left' | 'top';
export type PostTeaserImageResolution = 'thumbnail' | 'medium' | 'full';
export type PostTeaserPagination = 'none' | 'numbers';

export type PostTeaserLayout = {
  skin: PostTeaserSkin;
  columns: number;
  limit: number;
  showImage: boolean;
  imagePosition: PostTeaserImagePosition;
  imageResolution: PostTeaserImageResolution;
  imageRatio: number;
  imageWidth: number;
  showTitle: boolean;
  titleTag: 'h2' | 'h3';
  showExcerpt: boolean;
  excerptLength: number;
  showMeta: boolean;
  showReadMore: boolean;
  readMoreText: string;
  openInNewWindow: boolean;
  pagination: PostTeaserPagination;
};

const SKINS: PostTeaserSkin[] = ['classic', 'cards', 'full'];
const POSITIONS: PostTeaserImagePosition[] = ['left', 'top'];
const RESOLUTIONS: PostTeaserImageResolution[] = ['thumbnail', 'medium', 'full'];

function asUnion<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function flag(value: unknown, fallback: boolean): boolean {
  if (value === false || value === 'false' || value === 0) return false;
  if (value === true || value === 'true' || value === 1) return true;
  return fallback;
}

export function clipExcerpt(text: string, words: number): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const cap = clamp(words, 1, 400, 40);
  if (parts.length <= cap) return parts.join(' ');
  return `${parts.slice(0, cap).join(' ')}…`;
}

export function teaserPlainText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Prefer the saved excerpt; otherwise use the first words of the post body. */
export function excerptFromPost(input: { excerpt?: unknown; html?: unknown }): string {
  return teaserPlainText(input.excerpt) || teaserPlainText(input.html);
}

/** Companion fields so picking a skin actually changes the grid. */
export function skinLayoutPatch(skin: PostTeaserSkin): Record<string, unknown> {
  if (skin === 'classic') return { skin, imagePosition: 'left', columns: 1 };
  if (skin === 'full') return { skin, imagePosition: 'top', columns: 1, showExcerpt: true, excerptLength: 80 };
  return { skin, imagePosition: 'top' };
}

export const POST_TEASER_IMAGE_RATIOS = [
  { id: 'portrait', label: 'Portrait', value: 0.75 },
  { id: 'square', label: 'Square', value: 1 },
  { id: 'fourThree', label: '4:3', value: 4 / 3 },
  { id: 'wide', label: '16:9', value: 16 / 9 },
] as const;

export function imageRatioPreset(value: number): string | null {
  const match = POST_TEASER_IMAGE_RATIOS.find((row) => Math.abs(row.value - value) < 0.02);
  return match?.id ?? null;
}

export function imageSizeClass(resolution: PostTeaserImageResolution): string {
  if (resolution === 'thumbnail') return 'max-h-[150px]';
  if (resolution === 'medium') return 'max-h-[300px]';
  return '';
}

export function readPostTeaserLayout(data: Record<string, unknown>): PostTeaserLayout {
  const skin = asUnion(data.skin, SKINS, 'cards');
  const columns = clamp(Number(data.columns), 1, 4, skin === 'classic' ? 1 : 3);
  return {
    skin,
    columns,
    limit: clamp(Number(data.limit ?? data.postsPerPage), 1, 24, 6),
    showImage: flag(data.showImage, true),
    imagePosition: asUnion(data.imagePosition, POSITIONS, skin === 'classic' ? 'left' : 'top'),
    imageResolution: asUnion(data.imageResolution, RESOLUTIONS, 'medium'),
    imageRatio: readFeaturedImageRatio(data.imageRatio),
    imageWidth: clamp(Number(data.imageWidth), 15, 80, 35),
    showTitle: flag(data.showTitle, true),
    titleTag: data.titleTag === 'h2' ? 'h2' : 'h3',
    showExcerpt: flag(data.showExcerpt, true),
    excerptLength: clamp(Number(data.excerptLength), 1, 400, 40),
    showMeta: flag(data.showMeta, false),
    showReadMore: flag(data.showReadMore, false),
    readMoreText: String(data.readMoreText ?? 'Read more').trim() || 'Read more',
    openInNewWindow: flag(data.openInNewWindow, false),
    pagination: data.pagination === 'numbers' ? 'numbers' : 'none',
  };
}

export function postTeaserLayoutPatch(layout: Partial<PostTeaserLayout>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(layout)) {
    patch[key] = value;
  }
  return patch;
}
