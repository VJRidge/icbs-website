/** Mailchimp-style newsletter workflow: publication first, then send steps. */

export const ISSUE_WORKFLOW_STEPS = ['details', 'audience', 'design', 'review'] as const;

export type IssueWorkflowStep = (typeof ISSUE_WORKFLOW_STEPS)[number];

export const ISSUE_STATUS_TABS = ['all', 'draft', 'scheduled', 'sending', 'sent', 'cancelled'] as const;

export type IssueStatusTab = (typeof ISSUE_STATUS_TABS)[number];

export const UNTITLED_NEWSLETTER = 'Untitled newsletter';
/** @deprecated Use UNTITLED_NEWSLETTER */
export const UNTITLED_ISSUE = UNTITLED_NEWSLETTER;

export function isIssueWorkflowStep(raw: string | null | undefined): raw is IssueWorkflowStep {
  return ISSUE_WORKFLOW_STEPS.includes(raw as IssueWorkflowStep);
}

export function isIssueStatusTab(raw: string | null | undefined): raw is IssueStatusTab {
  return ISSUE_STATUS_TABS.includes(raw as IssueStatusTab);
}

export function matchesIssueStatusTab(status: string, tab: IssueStatusTab): boolean {
  if (tab === 'all') return true;
  return status === tab;
}

/** Display title for a newsletter send — not the publication (list) name. */
export function issueEditionTitle(name: string | null | undefined, subject: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (n && n !== 'New Name') return n;
  const s = (subject ?? '').trim();
  if (s && s !== UNTITLED_NEWSLETTER && s !== 'Untitled issue') return s;
  return UNTITLED_NEWSLETTER;
}

export function newsletterHeaderSubtitle(newsletterName: string | null | undefined): string {
  const n = (newsletterName ?? '').trim();
  return n || 'Select a newsletter';
}

export function stepLabel(step: IssueWorkflowStep): string {
  switch (step) {
    case 'details':
      return 'Details';
    case 'audience':
      return 'Audience';
    case 'design':
      return 'Design';
    case 'review':
      return 'Review';
  }
}
