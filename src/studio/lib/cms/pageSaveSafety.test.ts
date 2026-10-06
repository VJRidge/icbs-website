import { describe, expect, it } from 'vitest';
import { mergeSaveCompletion, wouldEraseStructuredSections } from './pageSaveSafety';

describe('wouldEraseStructuredSections', () => {
  const structured = [
    { id: 'hero', type: 'columns', data: { section: 'hero', columns: [] } },
  ];

  it('protects HomeV2 when an empty editor tree would replace saved sections', () => {
    expect(wouldEraseStructuredSections(structured, [])).toBe(true);
  });

  it('allows normal edits that retain a structured section', () => {
    expect(wouldEraseStructuredSections(structured, structured)).toBe(false);
  });

  it('continues to protect legacy brand and kit section blocks', () => {
    expect(wouldEraseStructuredSections([{ type: 'brand_hero' }], [])).toBe(true);
    expect(wouldEraseStructuredSections([{ type: 'kit_text' }], [])).toBe(true);
  });

  it('does not block an ordinary unskinned page', () => {
    expect(
      wouldEraseStructuredSections(
        [{ id: 'copy', type: 'paragraph', data: { text: 'Saved' } }],
        [],
      ),
    ).toBe(false);
  });
});

describe('mergeSaveCompletion', () => {
  const submitted = { id: 'page-1', slug: 'old-slug', status: 'draft', title: 'Saved title' };

  it('preserves edits made while the request was in flight', () => {
    const current = { ...submitted, slug: 'newer-slug', title: 'Newer title' };
    expect(mergeSaveCompletion(current, submitted, { id: 'page-1', slug: 'old-slug', status: 'draft' })).toEqual(
      current,
    );
  });

  it('applies server identity fields when the submitted form is still current', () => {
    expect(mergeSaveCompletion(submitted, submitted, { id: 'page-2', slug: 'saved-slug', status: 'published' })).toEqual({
      ...submitted,
      id: 'page-2',
      slug: 'saved-slug',
      status: 'published',
    });
  });
});
