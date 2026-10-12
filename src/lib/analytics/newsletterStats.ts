/** Aggregate newsletter delivery/engagement from stored jobs + provider events. */

export type NewsletterJobRow = {
  issue_id: string;
  status: string;
  sent_at?: string | null;
  created_at?: string | null;
};

export type NewsletterIssueRow = {
  id: string;
  name?: string | null;
  subject?: string | null;
  status?: string | null;
  sent_at?: string | null;
  recipient_count?: number | null;
  list_id?: string | null;
};

export type NewsletterProviderEventRow = {
  event_type: string;
  issue_id?: string | null;
  email?: string | null;
  occurred_at: string;
};

export type NewsletterDeliveryTotals = {
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
  delivered: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  unsubscribed: number;
  openRate: number | null;
  clickRate: number | null;
};

export type NewsletterIssueStats = NewsletterDeliveryTotals & {
  issueId: string;
  title: string;
  status: string;
  sentAt: string | null;
  recipientCount: number;
};

function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 10000) / 100;
}

export function normalizeProviderEventType(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isOpenEvent(eventType: string): boolean {
  const t = normalizeProviderEventType(eventType);
  return t === 'email.opened' || t === 'email.open';
}

export function isClickEvent(eventType: string): boolean {
  const t = normalizeProviderEventType(eventType);
  return t === 'email.clicked' || t === 'email.click';
}

export function isDeliveredEvent(eventType: string): boolean {
  const t = normalizeProviderEventType(eventType);
  return t === 'email.delivered' || t === 'email.delivery';
}

export function isBounceEvent(eventType: string): boolean {
  const t = normalizeProviderEventType(eventType);
  return t === 'email.bounced' || t === 'email.bounce' || t === 'email.failed';
}

export function isComplaintEvent(eventType: string): boolean {
  const t = normalizeProviderEventType(eventType);
  return t === 'email.complained' || t === 'email.complaint';
}

export function emptyNewsletterDeliveryTotals(): NewsletterDeliveryTotals {
  return {
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
  };
}

function applyJobStatus(totals: NewsletterDeliveryTotals, status: string): void {
  if (status === 'sent') totals.sent += 1;
  else if (status === 'failed') totals.failed += 1;
  else if (status === 'skipped') totals.skipped += 1;
  else if (status === 'pending' || status === 'processing') totals.pending += 1;
}

function applyProviderEvent(
  totals: NewsletterDeliveryTotals,
  event: NewsletterProviderEventRow,
  openEmails: Set<string>,
  clickEmails: Set<string>,
): void {
  const email = (event.email || '').trim().toLowerCase();
  if (isDeliveredEvent(event.event_type)) totals.delivered += 1;
  else if (isBounceEvent(event.event_type)) totals.bounced += 1;
  else if (isComplaintEvent(event.event_type)) totals.complained += 1;
  else if (isOpenEvent(event.event_type)) {
    totals.opened += 1;
    if (email) openEmails.add(email);
  } else if (isClickEvent(event.event_type)) {
    totals.clicked += 1;
    if (email) clickEmails.add(email);
  }
}

function finalizeRates(totals: NewsletterDeliveryTotals): NewsletterDeliveryTotals {
  const denom = totals.delivered > 0 ? totals.delivered : totals.sent;
  return {
    ...totals,
    uniqueOpens: totals.uniqueOpens,
    uniqueClicks: totals.uniqueClicks,
    openRate: rate(totals.uniqueOpens || totals.opened, denom),
    clickRate: rate(totals.uniqueClicks || totals.clicked, denom),
  };
}

export function aggregateNewsletterDelivery(input: {
  jobs: NewsletterJobRow[];
  events: NewsletterProviderEventRow[];
  unsubscribed?: number;
}): NewsletterDeliveryTotals {
  const totals = emptyNewsletterDeliveryTotals();
  const openEmails = new Set<string>();
  const clickEmails = new Set<string>();
  for (const job of input.jobs) applyJobStatus(totals, job.status);
  for (const event of input.events) applyProviderEvent(totals, event, openEmails, clickEmails);
  totals.uniqueOpens = openEmails.size;
  totals.uniqueClicks = clickEmails.size;
  totals.unsubscribed = Math.max(0, Math.floor(input.unsubscribed ?? 0));
  return finalizeRates(totals);
}

export function issueEditionLabel(issue: NewsletterIssueRow): string {
  const name = (issue.name || '').trim();
  if (name && name !== 'New Name') return name;
  const subject = (issue.subject || '').trim();
  return subject || 'Untitled newsletter';
}

export function aggregateNewsletterByIssue(input: {
  issues: NewsletterIssueRow[];
  jobs: NewsletterJobRow[];
  events: NewsletterProviderEventRow[];
}): NewsletterIssueStats[] {
  const jobsByIssue = new Map<string, NewsletterJobRow[]>();
  for (const job of input.jobs) {
    const list = jobsByIssue.get(job.issue_id) ?? [];
    list.push(job);
    jobsByIssue.set(job.issue_id, list);
  }
  const eventsByIssue = new Map<string, NewsletterProviderEventRow[]>();
  for (const event of input.events) {
    if (!event.issue_id) continue;
    const list = eventsByIssue.get(event.issue_id) ?? [];
    list.push(event);
    eventsByIssue.set(event.issue_id, list);
  }

  return input.issues
    .map((issue) => {
      const totals = aggregateNewsletterDelivery({
        jobs: jobsByIssue.get(issue.id) ?? [],
        events: eventsByIssue.get(issue.id) ?? [],
      });
      return {
        ...totals,
        issueId: issue.id,
        title: issueEditionLabel(issue),
        status: issue.status || 'draft',
        sentAt: issue.sent_at ?? null,
        recipientCount: typeof issue.recipient_count === 'number' ? issue.recipient_count : 0,
      };
    })
    .sort((a, b) => {
      const at = a.sentAt ? Date.parse(a.sentAt) : 0;
      const bt = b.sentAt ? Date.parse(b.sentAt) : 0;
      return bt - at;
    });
}
