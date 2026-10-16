import { describe, expect, it } from 'vitest';
import { TERMS_SECTIONS } from './termsOfUse';

describe('termsOfUse', () => {
  it('covers use of the site, Maryland governing law, and Brooklyn venue', () => {
    const text = TERMS_SECTIONS.map((s) => `${s.heading}\n${s.paragraphs.join('\n')}`).join('\n');
    expect(text).toMatch(/Manifest, Media, Marketing, & Events \(MMME\)/);
    expect(text).toMatch(/\$17/);
    expect(text).toMatch(/\/refunds/);
    expect(text).toMatch(/\/privacy/);
    expect(text).toMatch(/laws of the State of Maryland/);
    expect(text).toMatch(/conflict-of-law/);
    expect(text).toMatch(/exclusively in the state or federal courts located in Kings County, New York/);
    expect(text).toMatch(/personal jurisdiction/);
    expect(text).toMatch(/inconvenient forum/);
    expect(text).not.toMatch(/arbitration/i);
    expect(text).toMatch(/personal use/i);
    expect(text).not.toMatch(/This page is being written/);
    expect(text).not.toMatch(/\[LEGAL ENTITY/);
    expect(text).not.toMatch(/\[STATE\]/);
  });
});
