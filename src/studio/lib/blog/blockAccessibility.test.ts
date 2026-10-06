import { describe, expect, it } from 'vitest';
import { a11yContractFor, missingAltTextIssues } from './blockAccessibility';

describe('blockAccessibility', () => {
  it('requires alt text for images with a URL', () => {
    expect(a11yContractFor('image')?.requiresAltText).toBe(true);
    expect(
      missingAltTextIssues([
        { type: 'image', data: { url: 'https://example.com/a.jpg', alt: '' } },
        { type: 'paragraph', data: { text: 'ok' } },
      ]),
    ).toEqual([{ type: 'image', message: 'Image is missing alt text.' }]);
  });

  it('allows empty alt when there is no image URL yet', () => {
    expect(missingAltTextIssues([{ type: 'image', data: { url: '', alt: '' } }])).toEqual([]);
  });
});
