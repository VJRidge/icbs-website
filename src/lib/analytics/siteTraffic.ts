/** Site traffic aggregates from conversion_events (page_view). */

export type TrafficEventRow = {
  name: string;
  path?: string | null;
  referrer?: string | null;
  session_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  user_agent?: string | null;
  bot_suspect?: boolean | null;
  occurred_at: string;
};

export type DeviceKind = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';

export type TrafficTotals = {
  views: number;
  visitors: number;
  botFiltered: number;
};

export type NamedCount = { key: string; label: string; count: number };

export type DayBucket = { day: string; views: number; visitors: number };

export function classifyDevice(userAgent: string | null | undefined): DeviceKind {
  const ua = (userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/bot|crawl|spider|slurp|headless|wget|curl|python-requests|scrapy/.test(ua)) return 'bot';
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|opera mini/.test(ua)) return 'mobile';
  return 'desktop';
}

export function referrerHost(referrer: string | null | undefined): string {
  const raw = (referrer || '').trim();
  if (!raw) return '(direct)';
  try {
    const url = new URL(raw);
    return url.hostname.replace(/^www\./, '') || '(direct)';
  } catch {
    return '(other)';
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toISOString().slice(0, 10);
}

export function aggregateTrafficTotals(events: TrafficEventRow[]): TrafficTotals {
  let views = 0;
  let botFiltered = 0;
  const sessions = new Set<string>();
  for (const e of events) {
    if (e.name !== 'page_view') continue;
    if (e.bot_suspect) {
      botFiltered += 1;
      continue;
    }
    views += 1;
    const sid = (e.session_id || '').trim();
    if (sid) sessions.add(sid);
  }
  return { views, visitors: sessions.size, botFiltered };
}

export function aggregateViewsByDay(events: TrafficEventRow[]): DayBucket[] {
  const map = new Map<string, { views: number; sessions: Set<string> }>();
  for (const e of events) {
    if (e.name !== 'page_view' || e.bot_suspect) continue;
    const day = dayKey(e.occurred_at);
    const row = map.get(day) ?? { views: 0, sessions: new Set<string>() };
    row.views += 1;
    const sid = (e.session_id || '').trim();
    if (sid) row.sessions.add(sid);
    map.set(day, row);
  }
  return [...map.entries()]
    .map(([day, row]) => ({ day, views: row.views, visitors: row.sessions.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function topCounts(
  events: TrafficEventRow[],
  keyFn: (e: TrafficEventRow) => string | null,
  limit: number,
): NamedCount[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (e.name !== 'page_view' || e.bot_suspect) continue;
    const key = keyFn(e);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function topPaths(events: TrafficEventRow[], limit = 15): NamedCount[] {
  return topCounts(events, (e) => (e.path || '').trim() || null, limit);
}

export function topReferrers(events: TrafficEventRow[], limit = 15): NamedCount[] {
  return topCounts(events, (e) => referrerHost(e.referrer), limit);
}

export function topUtmSources(events: TrafficEventRow[], limit = 15): NamedCount[] {
  return topCounts(events, (e) => {
    const source = (e.utm_source || '').trim();
    if (!source) return null;
    const medium = (e.utm_medium || '').trim();
    return medium ? `${source} / ${medium}` : source;
  }, limit);
}

export function deviceBreakdown(events: TrafficEventRow[]): NamedCount[] {
  const map = new Map<DeviceKind, number>();
  for (const e of events) {
    if (e.name !== 'page_view' || e.bot_suspect) continue;
    const kind = classifyDevice(e.user_agent);
    map.set(kind, (map.get(kind) || 0) + 1);
  }
  return (['desktop', 'mobile', 'tablet', 'bot', 'unknown'] as DeviceKind[])
    .filter((k) => (map.get(k) || 0) > 0)
    .map((k) => ({ key: k, label: k, count: map.get(k) || 0 }));
}

/** Period-over-period delta as percent; null when previous is 0. */
export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
