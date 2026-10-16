/** Where the paid PDF lives. Prefer a media-private object over a forever public URL. */

export const BOOK_SIGNED_URL_EXPIRES = 72 * 60 * 60;

const UNSAFE = /(?:^|\/)\.\.(?:\/|$)/;

export function bookPrivateObjectPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^\/+/, '');
  if (!trimmed || trimmed.length > 1024) return null;
  if (trimmed.includes('\\') || trimmed.includes('\0') || trimmed.includes('://')) return null;
  if (UNSAFE.test(trimmed)) return null;
  if (trimmed.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) return null;
  return trimmed;
}

export type BookDownloadSource =
  | { kind: 'private'; path: string }
  | { kind: 'public'; url: string }
  | { kind: 'missing' };

export function resolveBookDownloadSource(input: {
  privatePath?: string | null;
  publicUrl?: string | null;
}): BookDownloadSource {
  const path = bookPrivateObjectPath(input.privatePath ?? '');
  if (path) return { kind: 'private', path };
  const url = (input.publicUrl ?? '').trim();
  if (url.startsWith('https://') || url.startsWith('http://')) return { kind: 'public', url };
  return { kind: 'missing' };
}

export function bookFulfillmentConfigured(input: {
  privatePath?: string | null;
  publicUrl?: string | null;
}): boolean {
  return resolveBookDownloadSource(input).kind !== 'missing';
}
