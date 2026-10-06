import { describe, expect, it } from 'vitest';
import { builderA11ySummary, collectBuilderA11yIssues } from './builderA11yIssues';

describe('collectBuilderA11yIssues', () => {
  it('flags missing image alt text including nested column images', () => {
    const issues = collectBuilderA11yIssues([
      {
        id: 'cols',
        type: 'columns',
        data: {
          layout: '50-50',
          columns: [
            { blocks: [{ id: 'img1', type: 'image', data: { url: 'https://x.test/a.jpg', alt: '' } }] },
            { blocks: [] },
          ],
        },
      },
    ]);
    expect(issues.some((i) => i.code === 'missing_alt' && i.blockId === 'img1')).toBe(true);
  });

  it('flags invalid block payloads and video autoplay', () => {
    const issues = collectBuilderA11yIssues([
      { id: 'bad', type: 'heading', data: 'nope' },
      { id: 'vid', type: 'video', data: { url: 'https://x.test/v.mp4', autoplay: true } },
    ]);
    expect(issues.some((i) => i.code === 'invalid_block')).toBe(true);
    expect(issues.some((i) => i.code === 'autoplay' && i.severity === 'warning')).toBe(true);
    expect(builderA11ySummary(issues).errors).toBeGreaterThan(0);
  });

  it('flags empty button labels, empty hrefs, heading skips, and gallery alts', () => {
    const issues = collectBuilderA11yIssues([
      { id: 'h1', type: 'heading', data: { text: 'Title', level: 1 } },
      { id: 'h3', type: 'heading', data: { text: 'Skipped', level: 3 } },
      { id: 'btn', type: 'button', data: { text: '  ', url: 'https://x.test' } },
      { id: 'btn2', type: 'button', data: { text: 'Go', url: '' } },
      {
        id: 'gal',
        type: 'gallery',
        data: { images: [{ url: 'https://x.test/g.jpg', alt: '' }] },
      },
      {
        id: 'car',
        type: 'carousel',
        data: { autoplay: true, items: [{ url: 'https://x.test/c.jpg', alt: 'ok' }] },
      },
    ]);
    expect(issues.some((i) => i.code === 'heading_skip' && i.blockId === 'h3')).toBe(true);
    expect(issues.some((i) => i.code === 'empty_label' && i.blockId === 'btn')).toBe(true);
    expect(issues.some((i) => i.code === 'empty_link' && i.blockId === 'btn2')).toBe(true);
    expect(issues.some((i) => i.code === 'missing_alt' && i.blockId === 'gal')).toBe(true);
    expect(issues.some((i) => i.code === 'autoplay' && i.blockId === 'car')).toBe(true);
  });
});
