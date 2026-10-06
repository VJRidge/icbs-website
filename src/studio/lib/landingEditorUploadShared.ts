import { supabase } from './supabase';
import { LANDING_MEDIA_BUCKET } from './landingPageConfig';
import { upsertMediaMetadata } from './mediaMetadata';

/** Client uploads originals to `media-public` and records authoritative metadata. */

export async function uploadLandingMedia(userId: string, file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(LANDING_MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  try {
    await upsertMediaMetadata({
      bucket: LANDING_MEDIA_BUCKET,
      path,
      mime: file.type || null,
      byteSize: file.size,
      title: file.name,
      alt: '',
      createdBy: userId,
      isPublic: true,
    });
  } catch {
    /* Metadata table may be unavailable before migrations; Storage object still succeeds. */
  }

  const { data } = supabase.storage.from(LANDING_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
