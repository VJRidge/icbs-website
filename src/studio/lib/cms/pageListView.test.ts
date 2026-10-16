import { describe, expect, it } from 'vitest';
import { pageListViewIsLive, previewPayloadFromListRow } from './pageListView';
import type { PublisherSitePage } from '../../types';

function row(over: Partial<PublisherSitePage> = {}): PublisherSitePage {
  return {
    id: 'p1',
    slug: 'home',
    title: 'Home',
    body: '<p>Hello</p>',
    status: 'draft',
    published_at: null,
    author_id: 'a1',
    created_at: '2026-10-13T00:00:00.000Z',
    updated_at: '2026-10-13T00:00:00.000Z',
    content_blocks: [{ id: 'b1', type: 'paragraph', data: { text: '<p>Hello</p>' } }],
    layout: 'landing',
    ...over,
  };
}

describe('pageListViewIsLive', () => {
  it('opens the public URL for published or managed pages', () => {
    expect(pageListViewIsLive('published', false)).toBe(true);
    expect(pageListViewIsLive('draft', true)).toBe(true);
  });

  it('uses preview for unpublished CMS pages so View still works from the list', () => {
    expect(pageListViewIsLive('draft', false)).toBe(false);
    expect(pageListViewIsLive('scheduled', false)).toBe(false);
  });
});

describe('previewPayloadFromListRow', () => {
  it('builds a preview document from the list row so View can open unpublished pages', () => {
    const payload = previewPayloadFromListRow(row(), 'page');
    expect(payload.title).toBe('Home');
    expect(payload.document.layout).toBe('landing');
    expect(payload.document.html).toBe('<p>Hello</p>');
    expect(payload.document.blocks).toHaveLength(1);
    expect(payload.post).toBeUndefined();
  });
});
