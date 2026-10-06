import { describe, expect, it } from 'vitest';
import {
  buildSecurePreviewCreateBody,
  isPreviewExpired,
  previewExpiresAt,
  securePreviewPath,
} from './securePreview';

describe('securePreview', () => {
  it('builds a create body without leaking working DB columns', () => {
    const body = buildSecurePreviewCreateBody({
      title: 'Draft title',
      document: { format: 'blocks', blocks: [], html: '<p>x</p>' },
      contentId: 'abc',
    });
    expect(body.contentId).toBe('abc');
    expect(body).not.toHaveProperty('body');
    expect(body).not.toHaveProperty('content_blocks');
  });

  it('encodes token URLs and detects expiry', () => {
    expect(securePreviewPath('tok/1')).toBe('/preview?token=tok%2F1');
    const expires = previewExpiresAt(1_000);
    expect(isPreviewExpired(expires, 1_000)).toBe(false);
    expect(isPreviewExpired(expires, Date.parse(expires) + 1)).toBe(true);
  });
});
