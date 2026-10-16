import { describe, expect, it } from 'vitest';
import { PRIVACY_SECTIONS } from './privacyPolicy';

describe('privacyPolicy', () => {
  it('covers the collections and processors this site actually uses', () => {
    const text = PRIVACY_SECTIONS.map((s) => `${s.heading}\n${s.paragraphs.join('\n')}`).join('\n');
    expect(PRIVACY_SECTIONS.map((s) => s.heading)).toEqual(
      expect.arrayContaining([
        'Who is responsible',
        'What we collect',
        'Email',
        'Analytics',
        'Payments',
        'Who processes data for us',
        'Your choices and rights',
      ]),
    );
    expect(text).toMatch(/Supabase/);
    expect(text).toMatch(/Resend/);
    expect(text).toMatch(/Stripe/);
    expect(text).toMatch(/hashed/);
    expect(text).toMatch(/\/contact/);
    expect(text).toMatch(/Manifest, Media, Marketing, & Events \(MMME\)/);
    expect(text).toMatch(/20 Adelphi Street/);
    expect(text).toMatch(/hello@vettajimale\.tech/);
    expect(text).toMatch(/as soon as (we )?reasonably can|as soon as possible/i);
    expect(text).not.toMatch(/30 days/);
    expect(text).not.toMatch(/U\.S\. business in Brooklyn/);
    expect(text).toMatch(/formed in Maryland/);
    expect(text).not.toMatch(/exclusively in the state or federal courts/);
    expect(text).toMatch(/email list will be notified/i);
    expect(text).not.toMatch(/This page is being written/);
    expect(text).toMatch(/not intended to load Google Fonts/);
  });
});

