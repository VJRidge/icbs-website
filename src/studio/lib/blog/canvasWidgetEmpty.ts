import { mediaCarouselIsEmpty } from './mediaWidgetOptions';

const MEDIA_EMPTY = new Set([
  'image',
  'video',
  'youtube',
  'gallery',
  'slideshow',
  'carousel',
  'video_playlist',
  'social_embed',
  'audio',
]);

function textOf(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rowsHaveValue(raw: unknown, keys: string[]): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((row) => {
    const item = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
    return keys.some((key) => textOf(item[key]));
  });
}

function chromeIsBlank(block: { type: string; data: Record<string, unknown> }): boolean {
  const { type, data } = block;
  if (type === 'callout') return !textOf(data.text);
  if (type === 'code' || type === 'html_embed') return !textOf(data.code ?? data.html);
  if (type === 'card') return !textOf(data.title) && !textOf(data.body) && !textOf(data.image);
  if (type === 'banner') return !textOf(data.text) && !textOf(data.subtext);
  if (type === 'testimonial') return !textOf(data.quote) && !rowsHaveValue(data.items, ['quote', 'name']);
  if (type === 'price_list') return !textOf(data.heading) && !rowsHaveValue(data.items, ['label', 'price']);
  if (type === 'team') return !rowsHaveValue(data.members, ['name']);
  if (type === 'icon_box') return !textOf(data.title) && !textOf(data.body);
  if (type === 'map_embed') return !textOf(data.src);
  return false;
}

/** Live canvas hides these until they have media or copy — show a placeholder instead. */
export function canvasWidgetEmptyLabel(block: { type: string; data: Record<string, unknown> }): string | null {
  const { type, data } = block;
  if (type === 'heading' || type === 'paragraph') return textOf(data.text) ? null : type === 'heading' ? 'Heading' : 'Text Editor';
  if (type === 'image') return textOf(data.url) ? null : 'Choose an image';
  if (type === 'video') return textOf(data.url) ? null : 'Add a video';
  if (type === 'youtube') return textOf(data.videoId) ? null : 'Add a YouTube video';
  if (type === 'social_embed') return textOf(data.input) ? null : 'Paste a social post';
  if (type === 'gallery') return rowsHaveValue(data.images, ['url']) ? null : 'Add gallery images';
  if (type === 'slideshow') return rowsHaveValue(data.slides, ['url']) ? null : 'Add slides';
  if (type === 'carousel') {
    return mediaCarouselIsEmpty(block) ? (data.kind === 'image' ? 'Add carousel images' : 'Add carousel media') : null;
  }
  if (type === 'video_playlist') return rowsHaveValue(data.videos, ['videoId']) ? null : 'Add playlist videos';
  if (type === 'audio') return textOf(data.url) ? null : 'Add audio';
  if (type === 'quote') return textOf(data.text) ? null : 'Add a quote';
  if (type === 'tabs') return Array.isArray(data.tabs) && data.tabs.length ? null : 'Add tabs';
  if (type === 'accordion') return Array.isArray(data.items) && data.items.length ? null : 'Add accordion sections';
  if (type === 'tweet') return textOf(data.url) || textOf(data.tweetId) ? null : 'Add a post URL';
  return null;
}

export function canvasWidgetEmptyIsMedia(type: string): boolean {
  return MEDIA_EMPTY.has(type);
}

/** Placeholder overlay or clickable empty chrome so the drop does not collapse into the column. */
export function canvasWidgetShowsEmpty(block: { type: string; data: Record<string, unknown> }): boolean {
  return canvasWidgetEmptyLabel(block) != null || chromeIsBlank(block);
}
