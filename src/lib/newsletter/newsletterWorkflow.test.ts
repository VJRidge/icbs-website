import { describe, expect, it } from 'vitest';
import {
  ISSUE_WORKFLOW_STEPS,
  UNTITLED_NEWSLETTER,
  issueEditionTitle,
  isIssueWorkflowStep,
  matchesIssueStatusTab,
  newsletterHeaderSubtitle,
  stepLabel,
} from './newsletterWorkflow';

describe('newsletterWorkflow', () => {
  it('keeps the newsletter steps in order without a Schedule tab', () => {
    expect(ISSUE_WORKFLOW_STEPS).toEqual(['details', 'audience', 'design', 'review']);
    expect(isIssueWorkflowStep('design')).toBe(true);
    expect(isIssueWorkflowStep('schedule')).toBe(false);
    expect(stepLabel('audience')).toBe('Audience');
  });

  it('filters newsletter statuses including all', () => {
    expect(matchesIssueStatusTab('draft', 'all')).toBe(true);
    expect(matchesIssueStatusTab('draft', 'draft')).toBe(true);
    expect(matchesIssueStatusTab('sent', 'draft')).toBe(false);
    expect(matchesIssueStatusTab('cancelled', 'cancelled')).toBe(true);
  });

  it('uses newsletter name as title, not a placeholder publication name', () => {
    expect(issueEditionTitle('AI Tools Worth Your Attention', '')).toBe('AI Tools Worth Your Attention');
    expect(issueEditionTitle('New Name', 'Weekly AI digest')).toBe('Weekly AI digest');
    expect(issueEditionTitle('', '')).toBe(UNTITLED_NEWSLETTER);
  });

  it('shows the selected publication as the header subtitle', () => {
    expect(newsletterHeaderSubtitle('AI Updates')).toBe('AI Updates');
    expect(newsletterHeaderSubtitle('  ')).toBe('Select a newsletter');
  });
});
