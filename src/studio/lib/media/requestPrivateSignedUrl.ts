import { supabase } from '../supabase';
import {
  PRIVATE_MEDIA_BUCKET,
  parsePrivateMediaSignRequest,
  type PrivateMediaSignRequest,
} from '../../../lib/media/privateSignedUrl';

export type PrivateSignedUrlResult = {
  signedUrl: string;
  expiresIn: number;
  bucket: string;
  path: string;
};

/** Mint a short-lived signed URL for a media-private object via the staff API. */
export async function requestPrivateSignedUrl(
  input: PrivateMediaSignRequest,
): Promise<PrivateSignedUrlResult> {
  const parsed = parsePrivateMediaSignRequest({
    bucket: input.bucket || PRIVATE_MEDIA_BUCKET,
    path: input.path,
    expiresIn: input.expiresIn,
  });
  if (!parsed.ok) throw new Error(parsed.error);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in required to open private media.');

  const res = await fetch('/api/cms-media-sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bucket: parsed.bucket,
      path: parsed.path,
      expiresIn: parsed.expiresIn,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    signedUrl?: string;
    expiresIn?: number;
    bucket?: string;
    path?: string;
  };
  if (!res.ok || !payload.signedUrl) {
    throw new Error(payload.error || 'Could not open private media.');
  }

  return {
    signedUrl: payload.signedUrl,
    expiresIn: payload.expiresIn ?? parsed.expiresIn,
    bucket: payload.bucket ?? parsed.bucket,
    path: payload.path ?? parsed.path,
  };
}
