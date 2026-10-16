import { describe, expect, it } from 'vitest';
import { resolveViewSitePath, viewLivePath, withHomepageSlot } from './viewSite';

describe('resolveViewSitePath', () => {
  it('opens the assigned homepage page URL, not /', () => {
    expect(
      resolveViewSitePath({
        liveHomepageId: 'home-v2',
        pages: [{ id: 'home-v2', slug: 'home-v2', status: 'published' }],
      }),
    ).toBe('/home-v2');
  });

  it('keeps View on the live homepage when a stale settings draft points elsewhere', () => {
    expect(
      resolveViewSitePath({
        liveHomepageId: 'home-v2',
        draftHomepageId: 'book',
        pages: [
          { id: 'book', slug: 'book', status: 'published' },
          { id: 'home-v2', slug: 'home-v2', status: 'published' },
        ],
      }),
    ).toBe('/home-v2');
  });

  it('uses the page slug when the assigned homepage is not live yet', () => {
    expect(
      resolveViewSitePath({
        liveHomepageId: 'home-v2',
        pages: [{ id: 'home-v2', slug: 'home-v2', status: 'draft' }],
      }),
    ).toBe('/home-v2');
  });

  it('falls back to / when no homepage is assigned', () => {
    expect(resolveViewSitePath({ liveHomepageId: null, pages: [] })).toBe('/');
  });
});

describe('viewLivePath', () => {
  it('always uses the page slug so View opens HomeV2 instead of /', () => {
    expect(viewLivePath({ slug: 'home-v2' })).toBe('/home-v2');
    expect(viewLivePath({ slug: 'book' })).toBe('/book');
    expect(viewLivePath({ slug: 'trust-the-process', kind: 'post' })).toBe('/blog/trust-the-process');
  });
});

describe('withHomepageSlot', () => {
  it('writes the slot into the settings draft snapshot', () => {
    expect(withHomepageSlot({ site_name: 'I Call BS', homepage_content_id: 'old' }, 'homepage_content_id', 'new')).toEqual({
      site_name: 'I Call BS',
      homepage_content_id: 'new',
    });
  });
});
