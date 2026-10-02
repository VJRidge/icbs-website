import { supabase } from './supabase';
import { LANDING_MEDIA_BUCKET } from './landingPageConfig';

/** Client uploads originals to `landing-media`. Server-side WebP/resize variants can be added later (e.g. Edge + storage copy). */

export async function uploadLandingMedia(userId: string, file: File): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(LANDING_MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(LANDING_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
