import { describe, expect, it } from 'vitest';
import {
  aggregateTrafficTotals,
  aggregateViewsByDay,
  classifyDevice,
  deviceBreakdown,
  percentDelta,
  referrerHost,
  topPaths,
  topReferrers,
} from './siteTraffic';

const events = [
  {
    name: 'page_view',
    path: '/',
    referrer: '',
    session_id: 's1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
    occurred_at: '2026-10-01T10:00:00.000Z',
  },
  {
    name: 'page_view',
    path: '/blog/hello',
    referrer: 'https://www.google.com/search?q=x',
    session_id: 's1',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    occurred_at: '2026-10-01T11:00:00.000Z',
  },
  {
    name: 'page_view',
    path: '/blog/hello',
    referrer: 'https://t.co/abc',
    session_id: 's2',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
    occurred_at: '2026-10-02T09:00:00.000Z',
  },
  {
    name: 'page_view',
    path: '/blog/hello',
    bot_suspect: true,
    session_id: 'bot',
    user_agent: 'Googlebot',
    occurred_at: '2026-10-02T09:30:00.000Z',
  },
];

describe('siteTraffic', () => {
  it('counts views and unique visitors excluding bots', () => {
    expect(aggregateTrafficTotals(events)).toEqual({ views: 3, visitors: 2, botFiltered: 1 });
  });

  it('buckets by day and ranks paths/referrers/devices', () => {
    expect(aggregateViewsByDay(events)).toEqual([
      { day: '2026-10-01', views: 2, visitors: 1 },
      { day: '2026-10-02', views: 1, visitors: 1 },
    ]);
    expect(topPaths(events)[0]).toMatchObject({ key: '/blog/hello', count: 2 });
    expect(topReferrers(events).map((r) => r.key)).toContain('google.com');
    expect(referrerHost('')).toBe('(direct)');
    expect(classifyDevice('iPhone')).toBe('mobile');
    expect(deviceBreakdown(events).find((d) => d.key === 'desktop')?.count).toBe(2);
    expect(percentDelta(11, 10)).toBe(10);
  });
});
