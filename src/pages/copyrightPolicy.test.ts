import { describe, expect, it } from 'vitest';
import { COPYRIGHT_SECTIONS } from './copyrightPolicy';

describe('copyrightPolicy', () => {
  it('names the owner, allowed use, and a DMCA notice path', () => {
    const text = COPYRIGHT_SECTIONS.map((s) => s.paragraphs.join('\n')).join('\n');
    expect(text).toMatch(/Manifest, Media, Marketing, & Events \(MMME\)/);
    expect(text).toMatch(/20 Adelphi Street/);
    expect(text).toMatch(/hello@vettajimale\.tech/);
    expect(text).toMatch(/resell|file-sharing/i);
    expect(text).toMatch(/penalty of perjury/i);
    expect(text).toMatch(/counter-notice/i);
    expect(text).not.toMatch(/\[LEGAL ENTITY/);
    expect(text).not.toMatch(/\[DATE\]/);
  });
});
