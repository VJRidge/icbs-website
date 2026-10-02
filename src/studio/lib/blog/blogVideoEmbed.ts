/** YouTube URL → raw video ID, or null. */
export function youtubeVideoIdFromUrl(raw: string): string | null {
  const m = raw
    .trim()
    .match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([^&?/\s]+)/);
  const id = m?.[1]?.trim();
  return id || null;
}

/** mqdefault JPG for editor thumbnails and light lists. */
export function youtubePosterUrlFromUrl(raw: string): string | null {
  const id = youtubeVideoIdFromUrl(raw);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/** YouTube watch / short / embed URL → embed iframe src, or null if not YouTube. */
export function youtubeEmbedSrcFromUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([^&?/\s]+)/);
  const id = m?.[1]?.trim();
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** True when URL should use an HTML5 video element (uploaded file or direct asset URL). */
export function isDirectVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u || !/^https?:\/\//i.test(u)) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com|instagram\.com/i.test(u)) return false;
  return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(u);
}

export function videoBlockEmbedSrc(url: string): string {
  const yt = youtubeEmbedSrcFromUrl(url);
  if (yt) return yt;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return '';
}
