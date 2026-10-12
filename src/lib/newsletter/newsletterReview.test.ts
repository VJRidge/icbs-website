import { describe, expect, it } from 'vitest';
import { buildNewsletterReviewChecklist, canScheduleNewsletter } from './newsletterReview';

const ready = {
  listId: 'list-1',
  subject: 'Weekly digest',
  bodyHtml: '<p>Hello</p>',
  eligibleCount: 12,
  scheduleLocal: '2026-10-10T09:00',
};

describe('newsletterReview', () => {
  it('marks every checklist item when ready to schedule', () => {
    const items = buildNewsletterReviewChecklist(ready);
    expect(items.every((i) => i.ok)).toBe(true);
    expect(canScheduleNewsletter(ready)).toBe(true);
  });

  it('blocks schedule when newsletter, subject, body, audience, or time is missing', () => {
    expect(canScheduleNewsletter({ ...ready, listId: null })).toBe(false);
    expect(canScheduleNewsletter({ ...ready, subject: '  ' })).toBe(false);
    expect(canScheduleNewsletter({ ...ready, bodyHtml: '' })).toBe(false);
    expect(canScheduleNewsletter({ ...ready, eligibleCount: 0 })).toBe(false);
    expect(canScheduleNewsletter({ ...ready, scheduleLocal: '' })).toBe(false);
  });

  it('reports audience detail with the eligible count', () => {
    const items = buildNewsletterReviewChecklist(ready);
    expect(items.find((i) => i.id === 'audience')?.detail).toBe('12 eligible now.');
  });
});
