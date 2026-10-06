import { describe, expect, it } from 'vitest';
import {
  canApprovePendingReview,
  canSetPublishStatus,
  canSubmitForReview,
} from './authorization';
import {
  pendingReviewPatch,
  returnFromReviewPatch,
  isPendingReviewStatus,
} from './pendingReview';

describe('pending review auth', () => {
  const approved = { staffApproved: true as const };

  it('lets authors submit for review but not publish', () => {
    expect(canSubmitForReview('author', approved)).toBe(true);
    expect(canSetPublishStatus({ role: 'author', ...approved, nextStatus: 'pending_review' })).toBe(true);
    expect(canSetPublishStatus({ role: 'author', ...approved, nextStatus: 'published' })).toBe(false);
    expect(canApprovePendingReview('author', approved)).toBe(false);
  });

  it('lets editors approve pending review into publish', () => {
    expect(canApprovePendingReview('editor', approved)).toBe(true);
    expect(canSetPublishStatus({ role: 'editor', ...approved, nextStatus: 'published' })).toBe(true);
  });

  it('fails closed without staff approval', () => {
    expect(canSubmitForReview('author')).toBe(false);
    expect(canApprovePendingReview('owner')).toBe(false);
  });
});

describe('pendingReview patches', () => {
  it('builds status patches and recognizes pending_review', () => {
    expect(pendingReviewPatch()).toEqual({ status: 'pending_review', scheduled_for: null });
    expect(returnFromReviewPatch()).toEqual({ status: 'draft', scheduled_for: null });
    expect(isPendingReviewStatus('pending_review')).toBe(true);
    expect(isPendingReviewStatus('draft')).toBe(false);
  });
});
