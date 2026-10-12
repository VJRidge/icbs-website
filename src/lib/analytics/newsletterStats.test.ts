import { describe, expect, it } from 'vitest';
import {
  aggregateNewsletterByIssue,
  aggregateNewsletterDelivery,
  isOpenEvent,
} from './newsletterStats';

describe('newsletterStats', () => {
  it('counts job statuses and provider engagement', () => {
    const totals = aggregateNewsletterDelivery({
      jobs: [
        { issue_id: 'a', status: 'sent' },
        { issue_id: 'a', status: 'sent' },
        { issue_id: 'a', status: 'failed' },
        { issue_id: 'a', status: 'skipped' },
        { issue_id: 'a', status: 'pending' },
      ],
      events: [
        { event_type: 'email.delivered', email: 'a@x.com', occurred_at: '2026-10-01T00:00:00Z' },
        { event_type: 'email.delivered', email: 'b@x.com', occurred_at: '2026-10-01T00:00:00Z' },
        { event_type: 'email.opened', email: 'a@x.com', occurred_at: '2026-10-01T01:00:00Z' },
        { event_type: 'email.opened', email: 'a@x.com', occurred_at: '2026-10-01T02:00:00Z' },
        { event_type: 'email.opened', email: 'b@x.com', occurred_at: '2026-10-01T02:00:00Z' },
        { event_type: 'email.clicked', email: 'a@x.com', occurred_at: '2026-10-01T03:00:00Z' },
        { event_type: 'email.bounced', email: 'c@x.com', occurred_at: '2026-10-01T03:00:00Z' },
      ],
      unsubscribed: 1,
    });
    expect(totals.sent).toBe(2);
    expect(totals.failed).toBe(1);
    expect(totals.skipped).toBe(1);
    expect(totals.pending).toBe(1);
    expect(totals.delivered).toBe(2);
    expect(totals.opened).toBe(3);
    expect(totals.uniqueOpens).toBe(2);
    expect(totals.clicked).toBe(1);
    expect(totals.uniqueClicks).toBe(1);
    expect(totals.bounced).toBe(1);
    expect(totals.unsubscribed).toBe(1);
    expect(totals.openRate).toBe(100);
    expect(totals.clickRate).toBe(50);
    expect(isOpenEvent('email.opened')).toBe(true);
  });

  it('groups stats per newsletter issue', () => {
    const rows = aggregateNewsletterByIssue({
      issues: [
        { id: 'a', name: 'Weekly', subject: 'Sub', status: 'sent', sent_at: '2026-10-02T00:00:00Z', recipient_count: 2 },
        { id: 'b', name: 'Older', subject: '', status: 'sent', sent_at: '2026-10-01T00:00:00Z', recipient_count: 1 },
      ],
      jobs: [
        { issue_id: 'a', status: 'sent' },
        { issue_id: 'a', status: 'sent' },
        { issue_id: 'b', status: 'sent' },
      ],
      events: [
        { event_type: 'email.opened', issue_id: 'a', email: 'a@x.com', occurred_at: '2026-10-02T01:00:00Z' },
      ],
    });
    expect(rows[0]?.issueId).toBe('a');
    expect(rows[0]?.sent).toBe(2);
    expect(rows[0]?.uniqueOpens).toBe(1);
    expect(rows[1]?.issueId).toBe('b');
  });
});
