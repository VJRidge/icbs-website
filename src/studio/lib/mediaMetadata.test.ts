import { describe, expect, it } from 'vitest';
import { mediaRowFromUpload } from './mediaMetadata';

describe('mediaRowFromUpload', () => {
  it('maps upload fields onto the authoritative media table shape', () => {
    expect(
      mediaRowFromUpload({
        bucket: 'media-public',
        path: 'user/a.png',
        mime: 'image/png',
        byteSize: 12,
        title: 'Cover',
        alt: 'Book cover',
        credit: 'Studio',
        createdBy: 'user-1',
      }),
    ).toEqual({
      bucket: 'media-public',
      path: 'user/a.png',
      mime: 'image/png',
      byte_size: 12,
      title: 'Cover',
      alt: 'Book cover',
      caption: null,
      credit: 'Studio',
      is_public: true,
      created_by: 'user-1',
    });
  });
});
