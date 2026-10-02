/**
 * Parse post URLs and platform embed codes into iframe src or blockquote markup.
 * Iframe-first when possible; blockquote + platform script as fallback.
 */

import DOMPurify from 'dompurify';
import type { BlogBlock } from './blogBlockTypes';

export type SocialEmbedPlatform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin';

export type ParsedSocialEmbed = {
  platform: SocialEmbedPlatform | null;
  sourceUrl: string | null;
  iframeSrc: string | null;
  blockquoteHtml: string | null;
  needsScript: boolean;
  error: string | null;
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractBlockquote(html: string): string | null {
  const match = html.match(/<blockquote[\s\S]*?<\/blockquote>/i);
  return match ? match[0].trim() : null;
}

function extractIframeSrc(html: string): string | null {
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || null;
}

function instagramIframeFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'instagram.com') return null;
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    const [kind, shortcode] = segments;
    if (!shortcode || !['p', 'reel', 'tv'].includes(kind)) return null;
    return `https://www.instagram.com/${kind}/${shortcode}/embed`;
  } catch {
    return null;
  }
}

function facebookPostUrl(raw: string): string | null {
  const decoded = decodeHtmlEntities(raw.trim());
  if (!decoded) return null;

  const dataHref = decoded.match(/data-href=["']([^"']+)["']/i)?.[1];
  if (dataHref) return dataHref;

  const urlMatch = decoded.match(/https?:\/\/(?:www\.)?(?:facebook\.com|fb\.watch)\/[^\s"'<>]+/i);
  if (urlMatch) return urlMatch[0].replace(/[/?#]+$/, '');

  return null;
}

function facebookIframeFromUrl(postUrl: string): string {
  return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(postUrl)}&show_text=true&width=500`;
}

function tiktokVideoId(raw: string): string | null {
  const decoded = decodeHtmlEntities(raw);
  const fromAttr = decoded.match(/data-video-id=["'](\d+)["']/i)?.[1];
  if (fromAttr) return fromAttr;

  const fromUrl = decoded.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i)?.[1];
  if (fromUrl) return fromUrl;

  const fromEmbed = decoded.match(/tiktok\.com\/embed\/v2\/(\d+)/i)?.[1];
  if (fromEmbed) return fromEmbed;

  return null;
}

function tiktokIframeFromVideoId(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}

function linkedinEmbedFromInput(raw: string): string | null {
  const decoded = decodeHtmlEntities(raw.trim());

  const iframeSrc = extractIframeSrc(decoded);
  if (iframeSrc && /linkedin\.com\/embed\//i.test(iframeSrc)) return iframeSrc;

  const urnInline = decoded.match(/urn:li:(activity|share|ugcPost):(\d+)/i);
  if (urnInline) {
    return `https://www.linkedin.com/embed/feed/update/urn:li:${urnInline[1]}:${urnInline[2]}`;
  }

  try {
    const url = new URL(decoded.match(/https?:\/\/[^\s"'<>]+/i)?.[0] || decoded);
    if (!url.hostname.replace(/^www\./, '').endsWith('linkedin.com')) return null;

    const pathUrn = url.pathname.match(/urn:li:(activity|share|ugcPost):(\d+)/i);
    if (pathUrn) {
      return `https://www.linkedin.com/embed/feed/update/urn:li:${pathUrn[1]}:${pathUrn[2]}`;
    }

    const activityId = url.pathname.match(/activity-(\d+)/i)?.[1];
    if (activityId) {
      return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`;
    }
  } catch {
    /* fall through */
  }

  return null;
}

function parseInstagram(input: string): ParsedSocialEmbed | null {
  const trimmed = input.trim();
  if (!/instagram/i.test(trimmed)) return null;

  const blockquote = extractBlockquote(trimmed);
  if (blockquote && /instagram-media/i.test(blockquote)) {
    const permalink =
      blockquote.match(/data-instgrm-permalink=["']([^"']+)["']/i)?.[1] ||
      blockquote.match(/href=["'](https:\/\/www\.instagram\.com\/[^"']+)["']/i)?.[1] ||
      null;
    return {
      platform: 'instagram',
      sourceUrl: permalink,
      iframeSrc: permalink ? instagramIframeFromUrl(permalink) : null,
      blockquoteHtml: blockquote,
      needsScript: true,
      error: null,
    };
  }

  const urlMatch = trimmed.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i)?.[0];
  if (urlMatch) {
    const iframeSrc = instagramIframeFromUrl(urlMatch);
    return {
      platform: 'instagram',
      sourceUrl: urlMatch,
      iframeSrc,
      blockquoteHtml: null,
      needsScript: false,
      error: iframeSrc ? null : 'Could not parse this Instagram link.',
    };
  }

  return null;
}

function parseFacebook(input: string): ParsedSocialEmbed | null {
  const trimmed = input.trim();
  if (!/facebook|fb\.watch|fb-post/i.test(trimmed)) return null;

  const blockquote = extractBlockquote(trimmed);
  if (blockquote && /fb-(post|video)/i.test(blockquote)) {
    const postUrl = facebookPostUrl(blockquote);
    return {
      platform: 'facebook',
      sourceUrl: postUrl,
      iframeSrc: postUrl ? facebookIframeFromUrl(postUrl) : null,
      blockquoteHtml: blockquote,
      needsScript: true,
      error: postUrl ? null : 'Could not read Facebook post URL from embed code.',
    };
  }

  const postUrl = facebookPostUrl(trimmed);
  if (postUrl) {
    return {
      platform: 'facebook',
      sourceUrl: postUrl,
      iframeSrc: facebookIframeFromUrl(postUrl),
      blockquoteHtml: null,
      needsScript: false,
      error: null,
    };
  }

  return null;
}

function parseTiktok(input: string): ParsedSocialEmbed | null {
  const trimmed = input.trim();
  if (!/tiktok/i.test(trimmed)) return null;

  const blockquote = extractBlockquote(trimmed);
  if (blockquote && /tiktok-embed/i.test(blockquote)) {
    const videoId = tiktokVideoId(blockquote);
    return {
      platform: 'tiktok',
      sourceUrl: blockquote.match(/cite=["']([^"']+)["']/i)?.[1] || null,
      iframeSrc: videoId ? tiktokIframeFromVideoId(videoId) : null,
      blockquoteHtml: blockquote,
      needsScript: true,
      error: videoId ? null : 'Could not read TikTok video id from embed code.',
    };
  }

  const videoId = tiktokVideoId(trimmed);
  if (videoId) {
    const urlMatch = trimmed.match(/https?:\/\/(?:www\.)?tiktok\.com\/[^\s"'<>]+/i)?.[0] || null;
    return {
      platform: 'tiktok',
      sourceUrl: urlMatch,
      iframeSrc: tiktokIframeFromVideoId(videoId),
      blockquoteHtml: null,
      needsScript: false,
      error: null,
    };
  }

  return null;
}

function parseLinkedin(input: string): ParsedSocialEmbed | null {
  const trimmed = input.trim();
  if (!/linkedin/i.test(trimmed)) return null;

  const blockquote = extractBlockquote(trimmed);
  if (blockquote && /linkedin-embed|linkedin\.com\/embed/i.test(blockquote)) {
    const iframeSrc = linkedinEmbedFromInput(blockquote) || extractIframeSrc(blockquote);
    return {
      platform: 'linkedin',
      sourceUrl: blockquote.match(/data-url=["']([^"']+)["']/i)?.[1] || null,
      iframeSrc,
      blockquoteHtml: blockquote,
      needsScript: !iframeSrc,
      error: iframeSrc ? null : 'Could not parse LinkedIn embed.',
    };
  }

  const iframeSrc = linkedinEmbedFromInput(trimmed);
  if (iframeSrc) {
    const urlMatch = trimmed.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/i)?.[0] || null;
    return {
      platform: 'linkedin',
      sourceUrl: urlMatch,
      iframeSrc,
      blockquoteHtml: null,
      needsScript: false,
      error: null,
    };
  }

  return null;
}

function detectPlatformFromIframe(src: string): SocialEmbedPlatform | null {
  if (/instagram\.com/i.test(src)) return 'instagram';
  if (/facebook\.com\/plugins/i.test(src)) return 'facebook';
  if (/tiktok\.com/i.test(src)) return 'tiktok';
  if (/linkedin\.com\/embed/i.test(src)) return 'linkedin';
  return null;
}

export function parseSocialEmbedInput(input: string): ParsedSocialEmbed {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      platform: null,
      sourceUrl: null,
      iframeSrc: null,
      blockquoteHtml: null,
      needsScript: false,
      error: null,
    };
  }

  const iframeOnly = extractIframeSrc(trimmed);
  if (iframeOnly && isAllowedSocialIframeSrc(iframeOnly)) {
    return {
      platform: detectPlatformFromIframe(iframeOnly),
      sourceUrl: null,
      iframeSrc: iframeOnly,
      blockquoteHtml: null,
      needsScript: false,
      error: null,
    };
  }

  for (const parser of [parseInstagram, parseFacebook, parseTiktok, parseLinkedin]) {
    const result = parser(trimmed);
    if (result) return result;
  }

  return {
    platform: null,
    sourceUrl: null,
    iframeSrc: null,
    blockquoteHtml: null,
    needsScript: false,
    error: 'Paste a public post URL or embed code from Instagram, Facebook, TikTok, or LinkedIn.',
  };
}

export function isAllowedSocialIframeSrc(src: string): boolean {
  return (
    /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[^/]+\/embed/i.test(src) ||
    /^https:\/\/www\.facebook\.com\/plugins\/(post|video)\.php/i.test(src) ||
    /^https:\/\/(www\.)?tiktok\.com\/embed\//i.test(src) ||
    /^https:\/\/(www\.)?linkedin\.com\/embed\//i.test(src)
  );
}

export function isAllowedEmbedIframeSrc(src: string): boolean {
  return (
    /^https:\/\/(www\.)?youtube\.com\/embed\//i.test(src) ||
    /^https:\/\/www\.youtube-nocookie\.com\/embed\//i.test(src) ||
    /^https:\/\/(www\.)?google\.com\/maps\/embed/i.test(src) ||
    isAllowedSocialIframeSrc(src)
  );
}

export function socialEmbedIframeHeight(platform: SocialEmbedPlatform | null): number {
  switch (platform) {
    case 'tiktok':
      return 740;
    case 'instagram':
      return 540;
    case 'facebook':
      return 480;
    case 'linkedin':
      return 560;
    default:
      return 480;
  }
}

export function socialEmbedPlatformLabel(platform: SocialEmbedPlatform | null): string {
  switch (platform) {
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
    case 'tiktok':
      return 'TikTok';
    case 'linkedin':
      return 'LinkedIn';
    default:
      return 'Social post';
  }
}

export function sanitizeSocialEmbedBlockquote(html: string): string {
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['blockquote', 'a', 'div', 'p', 'section', 'cite'],
    ALLOWED_ATTR: [
      'class',
      'style',
      'cite',
      'href',
      'target',
      'rel',
      'data-instgrm-permalink',
      'data-instgrm-version',
      'data-instgrm-captioned',
      'data-href',
      'data-width',
      'data-show-text',
      'data-video-id',
      'data-embed-from',
      'data-url',
    ],
  });
}

export function collectSocialEmbedScriptPlatforms(blocks: BlogBlock[]): SocialEmbedPlatform[] {
  const out = new Set<SocialEmbedPlatform>();
  for (const block of blocks) {
    if (block.type !== 'social_embed') continue;
    const parsed = parseSocialEmbedInput(String(block.data.input ?? ''));
    if (parsed.platform && parsed.blockquoteHtml && !parsed.iframeSrc) {
      out.add(parsed.platform);
    }
  }
  return [...out];
}
