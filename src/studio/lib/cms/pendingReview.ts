/** Pending-review workflow helpers (submit → queue → approve/publish or return). */

export function isPendingReviewStatus(status: string | null | undefined): boolean {
  return status === 'pending_review';
}

export function pendingReviewPatch(): { status: 'pending_review'; scheduled_for: null } {
  return { status: 'pending_review', scheduled_for: null };
}

export function returnFromReviewPatch(): { status: 'draft'; scheduled_for: null } {
  return { status: 'draft', scheduled_for: null };
}
