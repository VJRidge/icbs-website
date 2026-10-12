import { describe, expect, it } from 'vitest';
import {
  compileNewsletterDocument,
  emptyNewsletterDocument,
  parseNewsletterDocument,
} from './newsletterDocument';

describe('newsletterDocument', () => {
  it('parses blocks and compiles email html/text', () => {
    const doc = parseNewsletterDocument({
      format: 'blocks',
      blocks: [
        { id: '1', type: 'heading', data: { level: 2, text: 'Issue Hello' } },
        {
          id: '2',
          type: 'button',
          data: { label: 'Open', href: 'https://example.com/n' },
        },
      ],
    });
    expect(doc.blocks).toHaveLength(2);
    const compiled = compileNewsletterDocument(doc);
    expect(compiled.bodyHtml).toContain('<table');
    expect(compiled.bodyHtml).toContain('Issue Hello');
    expect(compiled.bodyHtml).toContain('https://example.com/n');
    expect(compiled.bodyText).toMatch(/Issue Hello/);
    expect(compiled.bodyText).toMatch(/example\.com/);
  });

  it('defaults empty documents to one paragraph', () => {
    const empty = emptyNewsletterDocument();
    expect(empty.blocks[0]?.type).toBe('paragraph');
    expect(parseNewsletterDocument(null).blocks.length).toBeGreaterThan(0);
  });
});
