import { safeHref } from './safeHref';

export type NavMode = 'arrows_dots' | 'arrows' | 'dots' | 'none';

/** Click target for a carousel slide: per-item link, else widget link mode. */
export function carouselSlideHref(
  item: { url?: string; link?: string; href?: string },
  data: Record<string, unknown>,
): string {
  const own = safeHref(item.link ?? item.href) ?? '';
  if (own) return own;
  const mode = String(data.linkMode ?? 'none');
  if (mode === 'media') return safeHref(item.url) ?? '';
  if (mode === 'custom') return safeHref(data.customUrl) ?? '';
  return '';
}

/** Empty dropped carousel has a blank items row, so the canvas would collapse to nothing. */
export function mediaCarouselIsEmpty(block: { type: string; data: Record<string, unknown> }): boolean {
  if (block.type !== 'carousel') return false;
  const items = Array.isArray(block.data.items) ? block.data.items : [];
  return !items.some((row) => {
    const item = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
    return Boolean(String(item.url ?? '').trim() || String(item.videoUrl ?? '').trim());
  });
}

export function readNavigation(data: Record<string, unknown>): NavMode {
  const raw = String(data.navigation ?? '');
  if (raw === 'arrows_dots' || raw === 'arrows' || raw === 'dots' || raw === 'none') return raw;
  const arrows = data.showArrows !== false;
  const dots = data.showDots !== false;
  if (arrows && dots) return 'arrows_dots';
  if (arrows) return 'arrows';
  if (dots) return 'dots';
  return 'none';
}

export function navigationPatch(mode: NavMode): Record<string, unknown> {
  return {
    navigation: mode,
    showArrows: mode === 'arrows' || mode === 'arrows_dots',
    showDots: mode === 'dots' || mode === 'arrows_dots',
  };
}

export function carouselPreset(preset?: string): Record<string, unknown> {
  if (preset === 'image') {
    return {
      kind: 'image',
      slidesToShow: 3,
      slidesToScroll: 1,
      navigation: 'arrows_dots',
      showArrows: true,
      showDots: true,
      imageStretch: false,
      linkMode: 'none',
      captionSource: 'none',
      imageSize: 'medium',
    };
  }
  if (preset === 'media') {
    return {
      kind: 'media',
      skin: 'carousel',
      slidesPerView: 1,
      slidesToScroll: 1,
      showArrows: true,
      showDots: true,
      effect: 'slide',
      height: 420,
    };
  }
  return {};
}

/** Turn a YouTube or Vimeo page link into an embed URL. Other https links pass through. */
export function embedMediaUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop() || '';
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host === 'vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean).pop() ?? '';
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
    if (url.protocol === 'https:' || url.protocol === 'http:') return value;
  } catch {
    return '';
  }
  return '';
}
