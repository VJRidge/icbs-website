import { describe, expect, it } from 'vitest';
import {
  emptyDownloadMapDocument,
  parseBookUpdates,
  parseDownloadMap,
  resolveDownloadUrl,
  validateBookUpdateEntry,
} from './siteManagedContent';

describe('siteManagedContent', () => {
  it('merges download map overrides onto defaults', () => {
    const parsed = parseDownloadMap({
      urls: { roadmap_starter_md: 'https://cdn.example/roadmap.md' },
    });
    expect(parsed.urls.roadmap_starter_md).toBe('https://cdn.example/roadmap.md');
    expect(parsed.urls.builder_quick_reference_pdf).toContain('/downloads/resources/');
  });

  it('falls back when override missing', () => {
    expect(resolveDownloadUrl(emptyDownloadMapDocument(), 'missing', '/fallback.pdf')).toBe('/fallback.pdf');
  });

  it('parses valid book updates and drops incomplete rows', () => {
    const parsed = parseBookUpdates({
      entries: [
        {
          id: '1',
          type: 'Correction',
          publishedAt: '2026-10-06',
          title: 'Link fix',
          summary: 'Updated Cursor docs URL.',
        },
        { id: '2', type: 'Correction', title: 'Incomplete' },
      ],
    });
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].title).toBe('Link fix');
  });

  it('validates book update fields', () => {
    expect(validateBookUpdateEntry({ title: 'x', summary: 'y', publishedAt: '2026-01-01', type: 'Correction' })).toBeNull();
    expect(validateBookUpdateEntry({ title: '', summary: 'y', publishedAt: '2026-01-01', type: 'Correction' })).toMatch(
      /Title/,
    );
  });
});
