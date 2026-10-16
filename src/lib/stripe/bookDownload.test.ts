import { describe, expect, it } from 'vitest';
import { bookFulfillmentConfigured, bookPrivateObjectPath, resolveBookDownloadSource } from './bookDownload';

describe('bookDownload', () => {
  it('prefers a media-private object path over a public URL', () => {
    expect(
      resolveBookDownloadSource({
        privatePath: 'books/i-call-bs.pdf',
        publicUrl: 'https://cdn.example/book.pdf',
      }),
    ).toEqual({ kind: 'private', path: 'books/i-call-bs.pdf' });
  });

  it('falls back to an https public URL when no private path is set', () => {
    expect(resolveBookDownloadSource({ publicUrl: 'https://cdn.example/book.pdf' })).toEqual({
      kind: 'public',
      url: 'https://cdn.example/book.pdf',
    });
    expect(bookFulfillmentConfigured({ publicUrl: 'https://cdn.example/book.pdf' })).toBe(true);
  });

  it('rejects path traversal and missing sources', () => {
    expect(bookPrivateObjectPath('../secret.pdf')).toBeNull();
    expect(resolveBookDownloadSource({})).toEqual({ kind: 'missing' });
    expect(bookFulfillmentConfigured({})).toBe(false);
  });
});
