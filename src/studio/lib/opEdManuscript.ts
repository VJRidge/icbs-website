/** Minimum manuscript length (plain-text words) to submit for editorial review. Drafts may be shorter. */
export const OP_ED_REVIEW_MIN_WORDS = 250;
/** Maximum manuscript length (plain-text words) for review submission. */
export const OP_ED_REVIEW_MAX_WORDS = 2500;

/** Pasted standalone pages (`<!DOCTYPE html>…`) are HTML but do not start with typical body tags. */
export function isFullHtmlDocument(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return /^\s*<(!DOCTYPE|html)\b/i.test(s);
}

/** Decode `&lt;` / `&gt;` / `&amp;` / numeric entities (browser). */
export function decodeBasicHtmlEntities(s: string): string {
  if (typeof document === 'undefined') return s;
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

/**
 * TipTap/ProseMirror stores a pasted full `.html` file as one paragraph whose text is escaped (e.g. `&lt;!DOCTYPE`).
 * Recover the real document for rendering or source editing.
 */
export function unwrapTiptapEscapedFullDocument(raw: string): string | null {
  const s = raw.trim();
  const singleP = /^<p(?:\s[^>]*)?>([\s\S]*)<\/p>\s*$/i.exec(s);
  if (!singleP) return null;
  const inner = decodeBasicHtmlEntities(singleP[1].trim()).trim();
  if (!inner || !isFullHtmlDocument(inner)) return null;
  return inner;
}

/** Prefer iframe / sanitization pipeline on normalized body. */
export function coerceBlogHtmlForRendering(raw: string): string {
  const t = raw.trim();
  const u = unwrapTiptapEscapedFullDocument(raw);
  return (u ?? t).trim();
}

/**
 * Full-page/HTML-card pastes belong in raw source editing — TipTap strips `<html>`, `<head>`, `<style>`.
 */
export function prefersBlogRawHtmlEditor(body: string): boolean {
  const s = coerceBlogHtmlForRendering(body);
  if (!s) return false;
  if (isFullHtmlDocument(s)) return true;
  if (/<head\b/i.test(s) && /<style\b/i.test(s)) return true;
  if (/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/i.test(s.slice(0, 12000))) return true;
  return false;
}

/** Heuristic: stored HTML from TipTap vs legacy plain-text rows. */
export function manuscriptLooksLikeHtml(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (isFullHtmlDocument(s)) return true;
  return /<(p|div|h[1-6]|ul|ol|li|br|img|blockquote|strong|em|span|a|video|iframe|section|article|header|footer|main|nav|figure|table|thead|tbody|tr|td|th)\b/i.test(
    s,
  );
}

/** Plain text from manuscript HTML (for counts and limits). */
export function htmlPlainText(html: string): string {
  if (!html?.trim()) return '';
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function htmlWordCount(html: string): number {
  const text = htmlPlainText(html).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** Character count using the same plain-text extraction as {@link htmlWordCount}. */
export function htmlCharCount(html: string): number {
  return htmlPlainText(html).length;
}

export function escapeHtmlForEditor(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One-time upgrade for legacy plain-text manuscripts in the rich editor. */
export function legacyPlainManuscriptToHtml(text: string): string {
  const inner = escapeHtmlForEditor(text).replace(/\n/g, '<br/>');
  return `<p>${inner}</p>`;
}

export function htmlToPlainSnippet(html: string, maxChars = 220): string {
  if (!html.trim()) return '';
  if (typeof document === 'undefined') {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}…`;
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = doc.body.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}
