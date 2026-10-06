import { canApprovePendingReview, canSubmitForReview } from '../../lib/cms/authorization';
import { isPendingReviewStatus } from '../../lib/cms/pendingReview';
import { isAnyAdminProfile } from '../../lib/adminPermissions';
import type { UserProfile } from '../../types';

/** Thin submit / return controls for the pending-review queue. */
export default function PendingReviewControls({
  status,
  userProfile,
  disabled,
  onSubmitForReview,
  onReturnToDraft,
}: {
  status: string;
  userProfile: UserProfile | null;
  disabled?: boolean;
  onSubmitForReview: () => void;
  onReturnToDraft: () => void;
}) {
  const opts = { staffApproved: isAnyAdminProfile(userProfile) };
  const canSubmit = canSubmitForReview(userProfile?.role, opts);
  const canApprove = canApprovePendingReview(userProfile?.role, opts);
  const pending = isPendingReviewStatus(status);

  if (!canSubmit && !canApprove) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? (
        <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900">
          Pending review
        </span>
      ) : null}
      {!pending && status !== 'published' && status !== 'scheduled' && canSubmit ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmitForReview}
          className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-900 disabled:opacity-50"
        >
          Submit for review
        </button>
      ) : null}
      {pending && canSubmit ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onReturnToDraft}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
        >
          Return to draft
        </button>
      ) : null}
      {pending && canApprove ? (
        <p className="text-[11px] font-medium text-slate-500">
          Approve by choosing <strong className="text-slate-700">Published</strong> and saving (or Publish).
        </p>
      ) : null}
    </div>
  );
}
