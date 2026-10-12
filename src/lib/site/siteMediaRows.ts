/** Packaged site docs (public/downloads) as Media library rows. */

import { SITE_DOCUMENT_SLOTS, TEMPLATE_FILE_SLOTS, type PublicFileSlot } from './publicSurfaces';
import {
  emptyDownloadMapDocument,
  parseDownloadMap,
  resolveDownloadUrl,
  type DownloadMapDocument,
} from './siteManagedContent';

export type SiteMediaRow = {
  name: string;
  publicUrl: string;
  storagePath: string;
  createdAt: string | null;
  origin: 'site';
  label: string;
  slotKey: string;
};

function fileNameFromPath(path: string): string {
  const clean = path.split('?')[0] ?? path;
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] || clean;
}

function rowFromSlot(slot: PublicFileSlot, map: DownloadMapDocument): SiteMediaRow {
  const url = resolveDownloadUrl(map, slot.key, slot.defaultPath);
  return {
    name: fileNameFromPath(url.startsWith('http') ? slot.defaultPath : url),
    publicUrl: url,
    storagePath: `site:${slot.key}`,
    createdAt: null,
    origin: 'site',
    label: slot.label,
    slotKey: slot.key,
  };
}

/** PDFs + Markdown starters that ship with the site (not Supabase media-public). */
export function sitePackagedMediaRows(map?: DownloadMapDocument | null): SiteMediaRow[] {
  const resolved = map ?? emptyDownloadMapDocument();
  return [...SITE_DOCUMENT_SLOTS, ...TEMPLATE_FILE_SLOTS].map((slot) => rowFromSlot(slot, resolved));
}

export function parseDownloadMapDocument(document: unknown): DownloadMapDocument {
  return parseDownloadMap(document);
}
