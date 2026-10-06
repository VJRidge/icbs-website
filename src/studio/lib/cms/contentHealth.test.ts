import { describe, expect, it } from 'vitest';
import { editorHrefForRecord, evaluateContentHealth } from './contentHealth';

describe('editorHrefForRecord', () => {
  it('routes pages, posts, and custom types', () => {
    expect(editorHrefForRecord({ id: '1', kind: 'page' })).toBe('/admin/pages/1');
    expect(editorHrefForRecord({ id: '2', kind: 'post' })).toBe('/admin/posts/2');
    expect(editorHrefForRecord({ id: '3', kind: 'custom', content_type_key: 'tool_review' })).toBe(
      '/admin/content/tool_review/3',
    );
  });
});

describe('evaluateContentHealth', () => {
  const now = new Date('2026-10-05T12:00:00Z');

  it('flags missing alt text and stale tool-review verification', () => {
    const alerts = evaluateContentHealth({
      now,
      records: [
        {
          id: 'p1',
          kind: 'page',
          title: 'Landing',
          slug: 'home',
          status: 'draft',
          content_blocks: [{ id: 'i1', type: 'image', data: { url: 'https://x.test/a.jpg', alt: '' } }],
        },
        {
          id: 'r1',
          kind: 'custom',
          content_type_key: 'tool_review',
          title: 'Cursor',
          slug: 'cursor',
          status: 'published',
          structured_fields: { pricing_checked_date: '2026-01-01' },
        },
      ],
    });
    expect(alerts.some((a) => a.code === 'missing_alt' && a.href === '/admin/pages/p1')).toBe(true);
    expect(alerts.some((a) => a.code === 'stale_verification' && a.href.includes('tool_review'))).toBe(true);
  });

  it('flags unused media and empty drafts without inventing counts', () => {
    const alerts = evaluateContentHealth({
      now,
      records: [{ id: 'd1', kind: 'post', title: '', slug: '', status: 'draft', content_blocks: [] }],
      media: [{ mediaId: 'm1', title: 'orphan.png', usageCount: 0 }],
    });
    expect(alerts.some((a) => a.code === 'empty_draft')).toBe(true);
    expect(alerts.some((a) => a.code === 'unused_media' && a.href === '/admin/media')).toBe(true);
  });
});
