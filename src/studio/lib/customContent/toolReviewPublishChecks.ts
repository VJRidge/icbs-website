import { STALE_TOOL_REVIEW_DAYS } from '../cms/contentHealth';

export type ToolReviewPublishCheck = {
  code: string;
  label: string;
  ok: boolean;
  detail: string;
};

function daysBetween(isoDate: string, now: Date): number {
  const then = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function presentText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Pre-publish checklist for tool reviews — disclosure + verification before shared publish. */
export function collectToolReviewPublishChecks(args: {
  title: string;
  slug: string;
  fields: Record<string, unknown>;
  now?: Date;
  staleAfterDays?: number;
}): ToolReviewPublishCheck[] {
  const now = args.now ?? new Date();
  const staleAfter = args.staleAfterDays ?? STALE_TOOL_REVIEW_DAYS;
  const f = args.fields;

  const checks: ToolReviewPublishCheck[] = [
    {
      code: 'title',
      label: 'Title',
      ok: presentText(args.title),
      detail: 'Add a public title.',
    },
    {
      code: 'pricing_checked_date',
      label: 'Pricing checked date',
      ok: presentText(f.pricing_checked_date),
      detail: 'Record when pricing was last verified (YYYY-MM-DD).',
    },
    {
      code: 'platform_tested',
      label: 'Platform tested',
      ok: presentText(f.platform_tested),
      detail: 'Say what platform or environment you tested.',
    },
    {
      code: 'what_was_tried',
      label: 'What was tried',
      ok: presentText(f.what_was_tried),
      detail: 'Describe the concrete work performed during the review.',
    },
    {
      code: 'limitations',
      label: 'Limitations',
      ok: presentText(f.limitations),
      detail: 'Document limits found during testing.',
    },
    {
      code: 'verdict',
      label: 'Verdict',
      ok: presentText(f.verdict),
      detail: 'Write a clear verdict for readers.',
    },
    {
      code: 'affiliate_disclosure',
      label: 'Affiliate disclosure',
      ok: f.affiliate_disclosure === true,
      detail: 'Confirm affiliate disclosure before publish (must be checked).',
    },
  ];

  const checked = typeof f.pricing_checked_date === 'string' ? f.pricing_checked_date : '';
  if (checked) {
    const age = daysBetween(checked, now);
    checks.push({
      code: 'stale_verification',
      label: 'Verification freshness',
      ok: age < staleAfter,
      detail:
        age >= staleAfter
          ? `Pricing was checked ${checked} (${age} days ago). Re-verify before publish.`
          : `Pricing checked ${checked} is within ${staleAfter} days.`,
    });
  }

  return checks;
}

export function toolReviewPublishBlocked(checks: ToolReviewPublishCheck[]): boolean {
  return checks.some((c) => !c.ok);
}
