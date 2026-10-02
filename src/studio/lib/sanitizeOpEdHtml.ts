import DOMPurify from 'dompurify';
import { escapeAmpersandsInQuotedAttrs } from './blog/fixHtmlAmpersandsInAttrs';
import { isAllowedEmbedIframeSrc } from './blog/socialEmbed';

const g = globalThis as unknown as { __opEdPurifyHooks?: boolean };

function installMediaHooks(): void {
  if (typeof window === 'undefined' || g.__opEdPurifyHooks) return;
  g.__opEdPurifyHooks = true;
  DOMPurify.addHook('uponSanitizeElement', (node) => {
    if (node.nodeName === 'IFRAME') {
      const src = (node as HTMLIFrameElement).getAttribute('src') || '';
      if (!isAllowedEmbedIframeSrc(src)) {
        node.parentNode?.removeChild(node);
      }
      return;
    }
    if (node.nodeName === 'VIDEO' || node.nodeName === 'IMG') {
      const src = (node as HTMLImageElement).getAttribute('src') || '';
      if (!/^https:\/\//i.test(src)) {
        node.parentNode?.removeChild(node);
      }
    }
  });
}

/**
 * Safe HTML for Op-Ed manuscript (rich text). Allows common semantic tags, images, video, and YouTube embeds.
 */
const FRAGMENT_PURIFY_ATTR = [
  'data-youtube-video',
  'allow',
  'allowfullscreen',
  'frameborder',
  'src',
  'controls',
  'width',
  'height',
  'alt',
  'title',
  'referrerpolicy',
  'loading',
  'class',
  'style',
  'id',
  /** Popover API (blog modal block) */
  'popover',
  'popovertarget',
  'popovertargetaction',
] as const;

const WHOLE_DOC_EXTRA_ATTR = [
  'href',
  'rel',
  'charset',
  'name',
  'content',
  'media',
  'crossorigin',
  'id',
  'lang',
  'xmlns',
] as const;

/**
 * Sanitize a full HTML document (e.g. pasted `DOCTYPE` + `head` + `body` story cards).
 * Used with `srcDoc` on a sandboxed iframe so document-level `<style>` / fonts apply.
 */
export function sanitizeOpEdHtmlWholeDocument(dirty: string): string {
  if (typeof window === 'undefined') return '';
  installMediaHooks();
  const patched = escapeAmpersandsInQuotedAttrs(dirty);
  return DOMPurify.sanitize(patched, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    ADD_TAGS: ['iframe', 'video', 'source', 'html', 'head', 'body', 'meta', 'link', 'title', 'style'],
    ADD_ATTR: [...FRAGMENT_PURIFY_ATTR, ...WHOLE_DOC_EXTRA_ATTR],
  });
}

export function sanitizeOpEdHtml(dirty: string): string {
  if (typeof window === 'undefined') return '';
  installMediaHooks();
  const patched = escapeAmpersandsInQuotedAttrs(dirty);
  return DOMPurify.sanitize(patched, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['iframe', 'video', 'source'],
    ADD_ATTR: [...FRAGMENT_PURIFY_ATTR],
  });
}
