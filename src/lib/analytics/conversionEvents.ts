/** Pure first-party analytics helpers. No fabricated metrics. */

export const TRACKABLE_EVENTS = [
  'page_view',
  'form_start',
  'form_submit',
  'contact_created',
  'kit_subscribe',
  'book_purchase',
] as const;

export type TrackableEventName = (typeof TRACKABLE_EVENTS)[number];

export type ConversionEventRow = {
  name: string;
  path?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  bot_suspect?: boolean | null;
  occurred_at: string;
};

export type FunnelCounts = {
  pageViews: number;
  formStarts: number;
  formSubmits: number;
  contactsCreated: number;
  kitSubscribes: number;
  bookPurchases: number;
  botFiltered: number;
  approximate: boolean;
};

export function isTrackableEventName(name: unknown): name is TrackableEventName {
  return typeof name === 'string' && (TRACKABLE_EVENTS as readonly string[]).includes(name);
}

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|wget|curl|python-requests|scrapy/i;

export function isBotSuspectUserAgent(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return false;
  return BOT_UA.test(ua);
}

export function normalizeEventPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const path = raw.trim().slice(0, 512);
  if (!path.startsWith('/')) return null;
  if (path.includes('://') || path.includes('\\') || path.includes('..')) return null;
  return path.replace(/\/{2,}/g, '/') || '/';
}

export function clipUtm(raw: unknown, max = 120): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().slice(0, max);
  return v || null;
}

/** Aggregate funnel from stored events. Excludes bot_suspect from primary counts. */
export function aggregateFunnel(events: ConversionEventRow[]): FunnelCounts {
  let pageViews = 0;
  let formStarts = 0;
  let formSubmits = 0;
  let contactsCreated = 0;
  let kitSubscribes = 0;
  let bookPurchases = 0;
  let botFiltered = 0;

  for (const e of events) {
    if (e.bot_suspect) {
      botFiltered += 1;
      continue;
    }
    if (e.name === 'page_view') pageViews += 1;
    else if (e.name === 'form_start') formStarts += 1;
    else if (e.name === 'form_submit') formSubmits += 1;
    else if (e.name === 'contact_created') contactsCreated += 1;
    else if (e.name === 'kit_subscribe') kitSubscribes += 1;
    else if (e.name === 'book_purchase') bookPurchases += 1;
  }

  return {
    pageViews,
    formStarts,
    formSubmits,
    contactsCreated,
    kitSubscribes,
    bookPurchases,
    botFiltered,
    approximate: botFiltered > 0,
  };
}

export type AttributionBucket = { key: string; label: string; formSubmits: number; contactsCreated: number };

/** Attribute submits/contacts by path or UTM content (article slug proxy). */
export function attributeByContent(events: ConversionEventRow[], limit = 20): AttributionBucket[] {
  const map = new Map<string, AttributionBucket>();
  for (const e of events) {
    if (e.bot_suspect) continue;
    if (e.name !== 'form_submit' && e.name !== 'contact_created') continue;
    const key =
      clipUtm(e.utm_content) ||
      (e.path && e.path.startsWith('/blog/') ? e.path : null) ||
      clipUtm(e.utm_campaign) ||
      e.path ||
      '(unknown)';
    const existing = map.get(key) ?? { key, label: key, formSubmits: 0, contactsCreated: 0 };
    if (e.name === 'form_submit') existing.formSubmits += 1;
    if (e.name === 'contact_created') existing.contactsCreated += 1;
    map.set(key, existing);
  }
  return [...map.values()]
    .sort((a, b) => b.formSubmits + b.contactsCreated - (a.formSubmits + a.contactsCreated))
    .slice(0, limit);
}

export function analyticsModuleTouchesSubscribers(): boolean {
  return false;
}
