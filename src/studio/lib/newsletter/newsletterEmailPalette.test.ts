import { describe, expect, it } from 'vitest';
import { NEWSLETTER_EMAIL_PALETTE } from './newsletterEmailPalette';

describe('NEWSLETTER_EMAIL_PALETTE', () => {
  it('covers the Mailchimp content-block set with unique keys', () => {
    const keys = NEWSLETTER_EMAIL_PALETTE.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const required of [
      'text',
      'boxed_text',
      'divider',
      'image',
      'image_group',
      'image_card',
      'image_caption',
      'social_share',
      'social_follow',
      'button',
      'footer',
      'code',
      'video',
    ]) {
      expect(keys).toContain(required);
    }
  });
});
