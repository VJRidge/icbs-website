import { supabase } from './supabase';
import { LANDING_MEDIA_BUCKET } from './landingPageConfig';
import { assertMediaSafeToDelete, findMediaIdByPath } from './mediaMetadata';

export type LandingMediaFileRow = {
  name: string;
  publicUrl: string;
  storagePath: string;
  createdAt: string | null;
  /** Packaged under /downloads (site) vs uploaded to media-public (library). */
  origin?: 'library' | 'site';
  /** Human label for site-packaged docs. */
  label?: string;
};

export function isProbablyGif(name: string): boolean {
  return /\.gif$/i.test(name);
}

export function isProbablyImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name);
}

export function isProbablyRasterImage(name: string): boolean {
  return /\.(png|jpe?g|webp|avif)$/i.test(name);
}

export function isProbablyDoc(name: string): boolean {
  return /\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|md|pages|key|numbers|zip)$/i.test(name);
}

export function isProbablyVideo(name: string): boolean {
  return /\.(mp4|webm|mov|mpe?g)$/i.test(name);
}

export function isProbablyAudio(name: string): boolean {
  return /\.(mp3|wav|m4a|aac|ogg|oga|flac|weba|opus|aiff?|wma)$/i.test(name);
}

/** File input `accept` for landing-media uploads (images, video, audio, documents). */
export const LANDING_MEDIA_UPLOAD_ACCEPT =
  'image/*,video/*,audio/*,.pdf,.doc,.docx,.md,.txt,.csv,.zip,application/pdf,.mp3,.wav,.m4a,.aac,.ogg,.flac,.weba,.opus,.aiff,.wma';

export type LandingMediaFileKind = 'image' | 'video' | 'audio' | 'doc' | 'other';

/** Tabs shown in the landing media picker modal. */
export type LandingMediaPickerTab = 'all' | 'image' | 'gif' | 'video' | 'doc';

export function getLandingMediaPickerTab(name: string): LandingMediaPickerTab {
  if (isProbablyGif(name)) return 'gif';
  if (isProbablyVideo(name)) return 'video';
  if (isProbablyRasterImage(name) || /\.svg$/i.test(name)) return 'image';
  if (isProbablyDoc(name) || isProbablyAudio(name)) return 'doc';
  return 'doc';
}

export function getLandingMediaFileKind(name: string): LandingMediaFileKind {
  if (isProbablyGif(name) || isProbablyRasterImage(name) || /\.svg$/i.test(name)) return 'image';
  if (isProbablyVideo(name)) return 'video';
  if (isProbablyAudio(name)) return 'audio';
  if (isProbablyDoc(name)) return 'doc';
  return 'other';
}

export function filterLandingMediaByTab<T extends { name: string }>(
  rows: T[],
  tab: LandingMediaPickerTab,
): T[] {
  if (tab === 'all') return rows;
  return rows.filter((r) => getLandingMediaPickerTab(r.name) === tab);
}

export function countLandingMediaByTab<T extends { name: string }>(
  rows: T[],
): Record<LandingMediaPickerTab, number> {
  const counts: Record<LandingMediaPickerTab, number> = {
    all: rows.length,
    image: 0,
    gif: 0,
    video: 0,
    doc: 0,
  };
  for (const row of rows) {
    counts[getLandingMediaPickerTab(row.name)] += 1;
  }
  return counts;
}

const FILE_KIND_SORT_ORDER: Record<LandingMediaFileKind, number> = {
  image: 0,
  video: 1,
  audio: 2,
  doc: 3,
  other: 4,
};

export type LandingMediaSortBy = 'date' | 'name' | 'type';

export function compareLandingMediaRows(
  a: LandingMediaFileRow,
  b: LandingMediaFileRow,
  sortBy: LandingMediaSortBy,
): number {
  if (sortBy === 'name') {
    const aLabel = (a.label || a.name).toLocaleLowerCase();
    const bLabel = (b.label || b.name).toLocaleLowerCase();
    const nameDiff = aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
    if (nameDiff !== 0) return nameDiff;
  }
  if (sortBy === 'type') {
    const kindDiff =
      FILE_KIND_SORT_ORDER[getLandingMediaFileKind(a.name)] -
      FILE_KIND_SORT_ORDER[getLandingMediaFileKind(b.name)];
    if (kindDiff !== 0) return kindDiff;
    const aLabel = (a.label || a.name).toLocaleLowerCase();
    const bLabel = (b.label || b.name).toLocaleLowerCase();
    const nameDiff = aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
    if (nameDiff !== 0) return nameDiff;
  }
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  // Site-packaged rows (no date) stay after dated library uploads when sorting Newest.
  if (aTime !== bTime) return bTime - aTime;
  const aLabel = (a.label || a.name).toLocaleLowerCase();
  const bLabel = (b.label || b.name).toLocaleLowerCase();
  return aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
}

export async function listLandingMediaFiles(userId: string, limit = 500): Promise<LandingMediaFileRow[]> {
  const { data, error } = await supabase.storage.from(LANDING_MEDIA_BUCKET).list(userId, {
    limit,
    offset: 0,
    sortBy: { column: 'updated_at', order: 'desc' },
  });
  if (error) throw error;

  return (data ?? [])
    .filter((f) => f.name && !f.name.endsWith('/'))
    .map((f) => {
      const storagePath = `${userId}/${f.name}`;
      const { data: pub } = supabase.storage.from(LANDING_MEDIA_BUCKET).getPublicUrl(storagePath);
      return {
        name: f.name,
        publicUrl: pub.publicUrl,
        storagePath,
        createdAt: f.updated_at ?? f.created_at ?? null,
      };
    });
}

export async function deleteLandingMediaFile(storagePath: string): Promise<void> {
  let mediaId: string | null = null;
  try {
    mediaId = await findMediaIdByPath(LANDING_MEDIA_BUCKET, storagePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Fail closed unless the media table/relation is clearly absent.
    if (!/relation .*media.* does not exist|Could not find the table|42P01|PGRST205/i.test(message)) {
      throw err instanceof Error ? err : new Error(message);
    }
  }
  if (mediaId) await assertMediaSafeToDelete(mediaId);

  const { error } = await supabase.storage.from(LANDING_MEDIA_BUCKET).remove([storagePath]);
  if (error) throw error;
  if (mediaId) {
    const { error: metaError } = await supabase.from('media').delete().eq('id', mediaId);
    if (metaError) throw metaError;
  }
}
