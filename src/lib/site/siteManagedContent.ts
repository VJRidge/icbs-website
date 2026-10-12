/** Types + pure helpers for staff-managed public site content. */

import type { BookUpdateEntry } from '../../pages/resources/bookUpdates';
import { defaultDownloadMap } from './publicSurfaces';

export const DOWNLOAD_MAP_KEY = 'download_map';
export const BOOK_UPDATES_KEY = 'book_updates';

export type DownloadMapDocument = {
  urls: Record<string, string>;
};

export type BookUpdatesDocument = {
  entries: BookUpdateEntry[];
};

export function emptyDownloadMapDocument(): DownloadMapDocument {
  return { urls: defaultDownloadMap() };
}

export function emptyBookUpdatesDocument(): BookUpdatesDocument {
  return { entries: [] };
}

export function parseDownloadMap(document: unknown): DownloadMapDocument {
  const base = emptyDownloadMapDocument();
  if (!document || typeof document !== 'object') return base;
  const urls = (document as { urls?: unknown }).urls;
  if (!urls || typeof urls !== 'object') return base;
  const merged = { ...base.urls };
  for (const [key, value] of Object.entries(urls as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) merged[key] = value.trim();
  }
  return { urls: merged };
}

export function parseBookUpdates(document: unknown): BookUpdatesDocument {
  if (!document || typeof document !== 'object') return emptyBookUpdatesDocument();
  const raw = (document as { entries?: unknown }).entries;
  if (!Array.isArray(raw)) return emptyBookUpdatesDocument();
  const entries: BookUpdateEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id.trim() : '';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
    const publishedAt = typeof r.publishedAt === 'string' ? r.publishedAt.trim() : '';
    const type = r.type;
    if (!id || !title || !summary || !publishedAt) continue;
    if (type !== 'Correction' && type !== 'Link update' && type !== 'Tool change') continue;
    entries.push({
      id,
      type,
      publishedAt,
      title,
      summary,
      readerAction: typeof r.readerAction === 'string' && r.readerAction.trim() ? r.readerAction.trim() : undefined,
    });
  }
  return { entries };
}

export function resolveDownloadUrl(
  map: DownloadMapDocument | null | undefined,
  key: string,
  fallback: string,
): string {
  const fromMap = map?.urls?.[key]?.trim();
  return fromMap || fallback;
}

export function validateBookUpdateEntry(entry: Partial<BookUpdateEntry>): string | null {
  if (!entry.title?.trim()) return 'Title is required.';
  if (!entry.summary?.trim()) return 'Summary is required.';
  if (!entry.publishedAt?.trim()) return 'Publication date is required.';
  if (entry.type !== 'Correction' && entry.type !== 'Link update' && entry.type !== 'Tool change') {
    return 'Type must be Correction, Link update, or Tool change.';
  }
  return null;
}
