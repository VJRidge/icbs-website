import { describe, expect, it } from 'vitest';
import { serializeNewsletterEmail } from './serializeNewsletterEmail';

describe('serializeNewsletterEmail', () => {
  it('compiles heading, paragraph, CTA, and image with inline styles', () => {
    const { html, text } = serializeNewsletterEmail([
      { type: 'heading', data: { level: 2, text: 'Hello' } },
      { type: 'paragraph', data: { text: '<p>Body copy</p>' } },
      { type: 'button', data: { label: 'Read more', href: 'https://example.com/x' } },
      {
        type: 'image',
        data: { url: 'https://cdn.example.com/a.png', alt: 'Cover', caption: 'Cap' },
      },
    ]);
    expect(html).toContain('<h2');
    expect(html).toContain('Hello');
    expect(html).toContain('Body copy');
    expect(html).toContain('https://example.com/x');
    expect(html).toContain('Read more');
    expect(html).toContain('https://cdn.example.com/a.png');
    expect(html).toContain('style=');
    expect(html).toContain('<table');
    expect(text).toMatch(/Hello/);
    expect(text).toMatch(/Body copy/);
    expect(text).toMatch(/https:\/\/example.com\/x/);
  });

  it('falls back for unsupported interactive blocks', () => {
    const { html, text } = serializeNewsletterEmail([
      {
        type: 'newsletter',
        data: { title: 'Join list', subtitle: 'Weekly notes' },
      },
      { type: 'youtube', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
    ]);
    expect(html).toContain('Join list');
    expect(html).toMatch(/youtube|Watch|video/i);
    expect(text.length).toBeGreaterThan(0);
  });

  it('handles quote, divider, and empty document', () => {
    const empty = serializeNewsletterEmail([]);
    expect(empty.html).toContain('<table');
    expect(empty.text.trim()).toBe('');

    const { html } = serializeNewsletterEmail([
      { type: 'quote', data: { text: 'Keep it honest.', citation: 'VJ' } },
      { type: 'divider', data: {} },
      { type: 'heading', data: { level: 1, text: 'After' } },
    ]);
    expect(html).toContain('Keep it honest.');
    expect(html).toContain('VJ');
    expect(html).toContain('After');
  });
});
