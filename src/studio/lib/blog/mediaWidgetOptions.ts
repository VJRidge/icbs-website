export type NavMode = 'arrows_dots' | 'arrows' | 'dots' | 'none';

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
