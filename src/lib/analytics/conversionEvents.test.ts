import { describe, expect, it } from 'vitest';
import {
  aggregateFunnel,
  analyticsModuleTouchesSubscribers,
  attributeByContent,
  isBotSuspectUserAgent,
  isTrackableEventName,
  normalizeEventPath,
} from './conversionEvents';

describe('trackable events', () => {
  it('accepts known names and safe paths', () => {
    expect(isTrackableEventName('form_start')).toBe(true);
    expect(isTrackableEventName('hack')).toBe(false);
    expect(normalizeEventPath('/updates')).toBe('/updates');
    expect(normalizeEventPath('https://evil.test')).toBeNull();
    expect(isBotSuspectUserAgent('Googlebot/2.1')).toBe(true);
    expect(isBotSuspectUserAgent('Mozilla/5.0')).toBe(false);
  });
});

describe('aggregateFunnel / attribution', () => {
  it('counts non-bot events and attributes by content', () => {
    const events = [
      { name: 'page_view', path: '/updates', occurred_at: '2026-10-05T10:00:00.000Z' },
      { name: 'form_start', path: '/updates', occurred_at: '2026-10-05T10:01:00.000Z' },
      {
        name: 'form_submit',
        path: '/updates',
        utm_content: '/blog/ai-is-not-smarter',
        occurred_at: '2026-10-05T10:02:00.000Z',
      },
      {
        name: 'contact_created',
        path: '/updates',
        utm_content: '/blog/ai-is-not-smarter',
        occurred_at: '2026-10-05T10:02:01.000Z',
      },
      {
        name: 'form_submit',
        path: '/updates',
        bot_suspect: true,
        occurred_at: '2026-10-05T10:03:00.000Z',
      },
      { name: 'kit_subscribe', path: '/free', occurred_at: '2026-10-05T10:04:00.000Z' },
    ];
    const funnel = aggregateFunnel(events);
    expect(funnel).toMatchObject({
      pageViews: 1,
      formStarts: 1,
      formSubmits: 1,
      contactsCreated: 1,
      kitSubscribes: 1,
      bookPurchases: 0,
      botFiltered: 1,
      approximate: true,
    });
    const attrs = attributeByContent(events);
    expect(attrs[0]?.key).toBe('/blog/ai-is-not-smarter');
    expect(attrs[0]?.formSubmits).toBe(1);
    expect(attrs[0]?.contactsCreated).toBe(1);
    expect(analyticsModuleTouchesSubscribers()).toBe(false);
  });
});
