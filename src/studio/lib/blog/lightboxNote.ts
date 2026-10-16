import type { CSSProperties } from 'react';
import { paragraphBlockWrapperStyle } from './blogParagraphBlockStyle';

export const LIGHTBOX_WORD_MAX = 150;

export function lightboxCopyStyle(data: Record<string, unknown>): CSSProperties {
  const style = { ...paragraphBlockWrapperStyle(data) };
  delete style.fontWeight;
  return style;
}

function escapePlain(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function lightboxLooksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function lightboxPlainToHtml(plain: string): string {
  const parts = splitBody(plain);
  if (parts.length === 0) return '<p></p>';
  return parts.map((part) => `<p>${escapePlain(part).replace(/\n/g, '<br/>')}</p>`).join('');
}

export function lightboxHtml(data: Record<string, unknown>): string {
  const raw = lightboxBodyForEdit(data).trim();
  if (!raw) return '<p></p>';
  return lightboxLooksLikeHtml(raw) ? raw : lightboxPlainToHtml(raw);
}

export function lightboxPlainText(data: Record<string, unknown>): string {
  return lightboxHtml(data)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitBody(body: string): string[] {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function countLightboxWords(text: string): number {
  const trimmed = lightboxLooksLikeHtml(text)
    ? lightboxPlainText({ body: text })
    : text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function clampLightboxBody(text: string): string {
  const matches = text.match(/\S+|\s+/g);
  if (!matches) return text;
  let words = 0;
  let out = '';
  for (const token of matches) {
    if (/^\s+$/.test(token)) {
      if (words > 0) out += token;
      continue;
    }
    if (words >= LIGHTBOX_WORD_MAX) break;
    out += token;
    words += 1;
  }
  return out;
}

export function lightboxBodyForEdit(data: Record<string, unknown>): string {
  const body = String(data.body ?? '');
  if (body.trim()) return body;
  if (!Array.isArray(data.paragraphs)) return body;
  return data.paragraphs
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
}

export function lightboxParagraphsForDisplay(data: Record<string, unknown>): string[] {
  return splitBody(lightboxBodyForEdit(data));
}
