import { supabase } from './supabase';
import { LANDING_MEDIA_BUCKET } from './landingPageConfig';

export type MediaMetadataInput = {
  bucket: string;
  path: string;
  mime?: string | null;
  byteSize?: number | null;
  title?: string | null;
  alt?: string | null;
  caption?: string | null;
  credit?: string | null;
  isPublic?: boolean;
  createdBy?: string | null;
};

export function mediaRowFromUpload(input: MediaMetadataInput) {
  return {
    bucket: input.bucket,
    path: input.path,
    mime: input.mime ?? null,
    byte_size: input.byteSize ?? null,
    title: input.title ?? null,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    credit: input.credit ?? null,
    is_public: input.isPublic ?? true,
    created_by: input.createdBy ?? null,
  };
}

/** Upsert authoritative metadata for a Storage object. */
export async function upsertMediaMetadata(input: MediaMetadataInput): Promise<{ id: string }> {
  const row = mediaRowFromUpload(input);
  const { data, error } = await supabase
    .from('media')
    .upsert(row, { onConflict: 'bucket,path' })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('Media metadata was not saved.');
  return { id: data.id };
}

export async function recordMediaUsage(mediaId: string, contentId: string): Promise<void> {
  const { error } = await supabase.from('media_usages').upsert(
    { media_id: mediaId, content_id: contentId },
    { onConflict: 'media_id,content_id' },
  );
  if (error) throw error;
}

export async function countMediaUsages(mediaId: string): Promise<number> {
  const { count, error } = await supabase
    .from('media_usages')
    .select('*', { count: 'exact', head: true })
    .eq('media_id', mediaId);
  if (error) throw error;
  return count ?? 0;
}

export async function assertMediaSafeToDelete(mediaId: string): Promise<void> {
  const usages = await countMediaUsages(mediaId);
  if (usages > 0) {
    throw new Error(`This file is used by ${usages} content record(s). Remove those references first.`);
  }
}

export async function findMediaIdByPath(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('media')
    .select('id')
    .eq('bucket', bucket)
    .eq('path', path)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export { LANDING_MEDIA_BUCKET };
