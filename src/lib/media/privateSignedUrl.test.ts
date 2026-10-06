import { describe, expect, it } from 'vitest';
import {
  PRIVATE_MEDIA_BUCKET,
  absoluteSignedStorageUrl,
  clampSignedUrlExpiresIn,
  parsePrivateMediaSignRequest,
} from './privateSignedUrl';

describe('parsePrivateMediaSignRequest', () => {
  it('accepts media-private with a safe relative path', () => {
    expect(
      parsePrivateMediaSignRequest({
        bucket: PRIVATE_MEDIA_BUCKET,
        path: 'user-1/guides/kit.pdf',
        expiresIn: 300,
      }),
    ).toEqual({
      ok: true,
      bucket: PRIVATE_MEDIA_BUCKET,
      path: 'user-1/guides/kit.pdf',
      expiresIn: 300,
    });
  });

  it('rejects public buckets and path traversal', () => {
    expect(parsePrivateMediaSignRequest({ bucket: 'media-public', path: 'a.pdf' }).ok).toBe(false);
    expect(parsePrivateMediaSignRequest({ bucket: PRIVATE_MEDIA_BUCKET, path: '../secret' }).ok).toBe(
      false,
    );
    expect(parsePrivateMediaSignRequest({ bucket: PRIVATE_MEDIA_BUCKET, path: 'a/./b.pdf' }).ok).toBe(
      false,
    );
    expect(parsePrivateMediaSignRequest({ bucket: PRIVATE_MEDIA_BUCKET, path: '' }).ok).toBe(false);
  });

  it('clamps expiresIn into the allowed window', () => {
    expect(clampSignedUrlExpiresIn(10)).toBe(60);
    expect(clampSignedUrlExpiresIn(99999)).toBe(3600);
    expect(clampSignedUrlExpiresIn(120)).toBe(120);
    expect(
      parsePrivateMediaSignRequest({
        bucket: PRIVATE_MEDIA_BUCKET,
        path: 'a/b.pdf',
        expiresIn: 5,
      }),
    ).toMatchObject({ ok: true, expiresIn: 60 });
  });
});

describe('absoluteSignedStorageUrl', () => {
  it('prefixes relative storage signed paths', () => {
    expect(absoluteSignedStorageUrl('https://x.supabase.co', '/object/sign/media-private/a.pdf')).toBe(
      'https://x.supabase.co/storage/v1/object/sign/media-private/a.pdf',
    );
    expect(absoluteSignedStorageUrl('https://x.supabase.co/', 'https://cdn.example/signed')).toBe(
      'https://cdn.example/signed',
    );
  });
});
