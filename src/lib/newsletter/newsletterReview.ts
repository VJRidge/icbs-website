/** Review-step readiness for scheduling a newsletter send. */

export type NewsletterReviewInput = {
  listId: string | null | undefined;
  subject: string | null | undefined;
  bodyHtml: string | null | undefined;
  eligibleCount: number | null | undefined;
  scheduleLocal: string | null | undefined;
};

export type NewsletterReviewItem = {
  id: 'newsletter' | 'subject' | 'body' | 'audience' | 'schedule';
  label: string;
  ok: boolean;
  detail: string;
};

export function buildNewsletterReviewChecklist(input: NewsletterReviewInput): NewsletterReviewItem[] {
  const listOk = Boolean((input.listId ?? '').trim());
  const subjectOk = Boolean((input.subject ?? '').trim());
  const bodyOk = Boolean((input.bodyHtml ?? '').trim());
  const audienceOk = typeof input.eligibleCount === 'number' && input.eligibleCount > 0;
  const scheduleOk = Boolean((input.scheduleLocal ?? '').trim());

  return [
    {
      id: 'newsletter',
      label: 'Newsletter selected',
      ok: listOk,
      detail: listOk ? 'Audience is the selected newsletter subscribers.' : 'Pick a newsletter on Details.',
    },
    {
      id: 'subject',
      label: 'Email subject',
      ok: subjectOk,
      detail: subjectOk ? 'Subject is set.' : 'Add an email subject on Details.',
    },
    {
      id: 'body',
      label: 'Email body',
      ok: bodyOk,
      detail: bodyOk ? 'Compiled body is ready.' : 'Add content on Design and Save.',
    },
    {
      id: 'audience',
      label: 'Eligible recipients',
      ok: audienceOk,
      detail: audienceOk
        ? `${input.eligibleCount} eligible now.`
        : 'Nobody is eligible yet — check Preferences subscriptions.',
    },
    {
      id: 'schedule',
      label: 'Schedule time',
      ok: scheduleOk,
      detail: scheduleOk ? 'Send time is set.' : 'Pick a date and time before Schedule.',
    },
  ];
}

export function canScheduleNewsletter(input: NewsletterReviewInput): boolean {
  return buildNewsletterReviewChecklist(input).every((item) => item.ok);
}
