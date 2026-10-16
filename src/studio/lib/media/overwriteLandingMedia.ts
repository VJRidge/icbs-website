import { supabase } from '../supabase';
import { LANDING_MEDIA_BUCKET } from '../landingPageConfig';
import { upsertMediaMetadata } from '../mediaMetadata';

/** Replace an existing library file in place so published URLs keep working. */
export async function overwriteLandingMedia(
  userId: string,
  storagePath: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error('This file cannot be overwritten from the media library.');
  }
  const { error } = await supabase.storage.from(LANDING_MEDIA_BUCKET).upload(storagePath, blob, {
    upsert: true,
    contentType,
  });
  if (error) throw error;
  try {
    await upsertMediaMetadata({
      bucket: LANDING_MEDIA_BUCKET,
      path: storagePath,
      mime: contentType,
      byteSize: blob.size,
      createdBy: userId,
      isPublic: true,
    });
  } catch {
    /* Metadata table may be unavailable before migrations; Storage object still succeeds. */
  }
  const { data } = supabase.storage.from(LANDING_MEDIA_BUCKET).getPublicUrl(storagePath);
  return `${data.publicUrl}?v=${Date.now()}`;
}
