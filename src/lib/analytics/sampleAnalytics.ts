/** Deterministic sample analytics for UI preview when live rows are empty. */

import type { FunnelCounts, AttributionBucket } from './conversionEvents';
import type { NewsletterDeliveryTotals, NewsletterIssueStats } from './newsletterStats';
import type { DayBucket, NamedCount, TrafficTotals } from './siteTraffic';

function dayLabels(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function wave(i: number, period: number, amp: number, base: number): number {
  return Math.max(0, Math.round(base + amp * Math.sin((i / period) * Math.PI * 2) + (i % 5) * 3));
}

export function sampleSiteBundle(days = 30): {
  totals: TrafficTotals;
  previousTotals: TrafficTotals;
  byDay: DayBucket[];
  prevByDay: DayBucket[];
  paths: NamedCount[];
  referrers: NamedCount[];
  utm: NamedCount[];
  devices: NamedCount[];
  locations: NamedCount[];
  campaigns: Array<{ name: string; signups: number }>;
  subscribers: number;
  downloads: number;
  prevSubscribers: number;
  prevDownloads: number;
} {
  const labels = dayLabels(days);
  const byDay: DayBucket[] = labels.map((day, i) => {
    const views = wave(i, 9, 180, 620);
    const visitors = Math.round(views * 0.34);
    return { day, views, visitors };
  });
  const prevByDay: DayBucket[] = labels.map((day, i) => {
    const views = wave(i + 3, 9, 140, 520);
    const visitors = Math.round(views * 0.33);
    return { day, views, visitors };
  });
  const totals = {
    views: byDay.reduce((s, d) => s + d.views, 0),
    visitors: Math.round(byDay.reduce((s, d) => s + d.visitors, 0) * 0.72),
    botFiltered: 128,
  };
  const previousTotals = {
    views: prevByDay.reduce((s, d) => s + d.views, 0),
    visitors: Math.round(prevByDay.reduce((s, d) => s + d.visitors, 0) * 0.72),
    botFiltered: 96,
  };
  return {
    totals,
    previousTotals,
    byDay,
    prevByDay,
    paths: [
      { key: '/', label: 'Home', count: 6420 },
      { key: '/blog/ai-is-not-smarter', label: 'AI Is Not Smarter Than You', count: 4180 },
      { key: '/free-kit', label: 'Starter Kit', count: 2960 },
      { key: '/products/i-call-bs', label: 'I Call BS', count: 2140 },
      { key: '/updates', label: 'Updates signup', count: 1680 },
      { key: '/blog/platforms', label: 'Platforms worth watching', count: 1220 },
    ],
    referrers: [
      { key: '(direct)', label: 'Direct', count: Math.round(totals.views * 0.34) },
      { key: 'google.com', label: 'Google', count: Math.round(totals.views * 0.29) },
      { key: 'instagram.com', label: 'Instagram', count: Math.round(totals.views * 0.21) },
      { key: 'newsletter', label: 'Newsletter', count: Math.round(totals.views * 0.1) },
      { key: 'other', label: 'Other', count: Math.round(totals.views * 0.06) },
    ],
    utm: [
      { key: 'ig / social', label: 'instagram / social', count: 920 },
      { key: 'kit / email', label: 'kit / email', count: 640 },
      { key: 'launch / cpc', label: 'launch / cpc', count: 410 },
    ],
    devices: [
      { key: 'mobile', label: 'Mobile', count: Math.round(totals.views * 0.62) },
      { key: 'desktop', label: 'Desktop', count: Math.round(totals.views * 0.33) },
      { key: 'tablet', label: 'Tablet', count: Math.round(totals.views * 0.05) },
    ],
    locations: [
      { key: 'US', label: 'United States', count: 68 },
      { key: 'UK', label: 'United Kingdom', count: 12 },
      { key: 'CA', label: 'Canada', count: 8 },
      { key: 'Other', label: 'Other', count: 12 },
    ],
    campaigns: [
      { name: 'Starter Kit launch', signups: 142 },
      { name: 'AI newsletter', signups: 98 },
      { name: 'Book preview', signups: 64 },
    ],
    subscribers: 326,
    downloads: 187,
    prevSubscribers: 298,
    prevDownloads: 164,
  };
}

export function sampleNewsletterBundle(): {
  totals: NewsletterDeliveryTotals;
  previous: NewsletterDeliveryTotals;
  rows: NewsletterIssueStats[];
  topicSubs: NamedCount[];
  audienceGrowth: DayBucket[];
  prevAudienceGrowth: DayBucket[];
  upcoming: Array<{ title: string; when: string }>;
  automations: Array<{ name: string; status: string }>;
} {
  const rows: NewsletterIssueStats[] = [
    {
      issueId: 'sample-1',
      title: 'AI Tools Worth Your Attention',
      status: 'sent',
      sentAt: '2026-10-02T14:00:00.000Z',
      recipientCount: 4200,
      sent: 4180,
      failed: 12,
      skipped: 8,
      pending: 0,
      delivered: 4140,
      bounced: 28,
      complained: 1,
      opened: 2100,
      clicked: 280,
      uniqueOpens: 1890,
      uniqueClicks: 246,
      unsubscribed: 6,
      openRate: 45.7,
      clickRate: 5.9,
    },
    {
      issueId: 'sample-2',
      title: 'Crypto Without the Hype',
      status: 'sent',
      sentAt: '2026-09-25T14:00:00.000Z',
      recipientCount: 3900,
      sent: 3880,
      failed: 10,
      skipped: 10,
      pending: 0,
      delivered: 3840,
      bounced: 30,
      complained: 0,
      opened: 1600,
      clicked: 190,
      uniqueOpens: 1480,
      uniqueClicks: 172,
      unsubscribed: 4,
      openRate: 38.5,
      clickRate: 4.5,
    },
    {
      issueId: 'sample-3',
      title: 'Platforms That Matter This Week',
      status: 'scheduled',
      sentAt: null,
      recipientCount: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: 4100,
      delivered: 0,
      bounced: 0,
      complained: 0,
      opened: 0,
      clicked: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      unsubscribed: 0,
      openRate: null,
      clickRate: null,
    },
    {
      issueId: 'sample-4',
      title: 'SaaS Stack Audit',
      status: 'draft',
      sentAt: null,
      recipientCount: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      opened: 0,
      clicked: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      unsubscribed: 0,
      openRate: null,
      clickRate: null,
    },
  ];

  const totals: NewsletterDeliveryTotals = {
    sent: 24860,
    failed: 42,
    skipped: 30,
    pending: 4100,
    delivered: 24640,
    bounced: 220,
    complained: 5,
    opened: 11200,
    clicked: 1480,
    uniqueOpens: 10540,
    uniqueClicks: 1390,
    unsubscribed: 26,
    openRate: 42.8,
    clickRate: 5.6,
  };
  const previous: NewsletterDeliveryTotals = {
    ...totals,
    sent: 22100,
    uniqueOpens: 9000,
    uniqueClicks: 1100,
    openRate: 40.7,
    clickRate: 4.8,
    unsubscribed: 31,
  };

  const labels = dayLabels(30);
  const audienceGrowth = labels.map((day, i) => ({
    day,
    views: 8200 + i * 8 + wave(i, 7, 40, 0),
    visitors: 352 + wave(i, 11, 12, 0),
  }));
  const prevAudienceGrowth = labels.map((day, i) => ({
    day,
    views: 7900 + i * 6 + wave(i + 2, 7, 30, 0),
    visitors: 300 + wave(i + 1, 11, 10, 0),
  }));

  return {
    totals,
    previous,
    rows,
    topicSubs: [
      { key: 'ai', label: 'AI', count: 3120 },
      { key: 'crypto', label: 'Crypto', count: 1840 },
      { key: 'platforms', label: 'Platforms', count: 2210 },
      { key: 'saas', label: 'SaaS', count: 1560 },
      { key: 'tech', label: 'Tech', count: 2680 },
    ],
    audienceGrowth,
    prevAudienceGrowth,
    upcoming: [{ title: 'Platforms That Matter This Week', when: 'Oct 9, 2026 · 9:00 AM' }],
    automations: [
      { name: 'Welcome series', status: 'Active' },
      { name: 'Starter Kit delivery', status: 'Active' },
    ],
  };
}

export function sampleFunnel(): { funnel: FunnelCounts; attribution: AttributionBucket[] } {
  return {
    funnel: {
      pageViews: 24860,
      formStarts: 2140,
      formSubmits: 980,
      contactsCreated: 842,
      kitSubscribes: 326,
      bookPurchases: 187,
      botFiltered: 128,
      approximate: true,
    },
    attribution: [
      { key: '/free-kit', label: '/free-kit', formSubmits: 420, contactsCreated: 380 },
      { key: 'kit-launch', label: 'kit-launch', formSubmits: 210, contactsCreated: 190 },
      { key: '/updates', label: '/updates', formSubmits: 160, contactsCreated: 140 },
      { key: 'ig-story', label: 'ig-story', formSubmits: 90, contactsCreated: 72 },
    ],
  };
}

/** Tiny sparkline series (8–12 points) scaled from a total. */
export function sparkSeries(seed: number, points = 10): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i += 1) {
    out.push(wave(i + seed, 5, 20, 40 + (seed % 7) * 3));
  }
  return out;
}
