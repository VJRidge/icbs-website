/** Helpers for newsletter issue naming, topics, and auto issue numbers. */

export const DEFAULT_NEWSLETTER_NAME = 'New Name';

export type IssueNumberAssignment = {
  taxonomyId: string | null;
  previousTaxonomyId: string | null;
  previousIssueNumber: number | null;
  nextIssueNumber: number;
};

/**
 * When the topic changes, take the next number for that topic.
 * When the topic stays the same, keep the existing number.
 */
export function resolveIssueNumber(args: IssueNumberAssignment): number | null {
  const taxonomyId = args.taxonomyId;
  if (!taxonomyId) return null;
  if (
    taxonomyId === args.previousTaxonomyId &&
    args.previousIssueNumber != null &&
    Number.isFinite(args.previousIssueNumber)
  ) {
    return args.previousIssueNumber;
  }
  return Math.max(1, Math.floor(args.nextIssueNumber));
}

export function formatIssueCreatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
