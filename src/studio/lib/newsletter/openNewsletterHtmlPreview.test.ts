import { describe, expect, it } from 'vitest';
import { canDeleteNewsletterIssue } from './openNewsletterHtmlPreview';

describe('canDeleteNewsletterIssue', () => {
  it('allows draft and scheduled only', () => {
    expect(canDeleteNewsletterIssue('draft')).toBe(true);
    expect(canDeleteNewsletterIssue('scheduled')).toBe(true);
    expect(canDeleteNewsletterIssue('sending')).toBe(false);
    expect(canDeleteNewsletterIssue('sent')).toBe(false);
  });
});
