/** Pure campaign blueprint readiness. No send / Stripe side effects. */

export type CampaignStepType = 'page' | 'form' | 'lead_magnet' | 'newsletter_issue' | 'note';

export type CampaignStepInput = {
  stepType: CampaignStepType;
  refId: string | null;
  label?: string;
};

export type CampaignLookup = {
  publishedPageIds: Set<string>;
  publishedFormIds: Set<string>;
  publishedLeadMagnetIds: Set<string>;
  newsletterIssueIds: Set<string>;
};

export type ReadinessCheck = {
  code: string;
  label: string;
  ok: boolean;
};

export type CampaignReadiness = {
  ready: boolean;
  checks: ReadinessCheck[];
};

export const CAMPAIGN_STATUSES = ['draft', 'ready', 'archived'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export function isCampaignStepType(value: unknown): value is CampaignStepType {
  return (
    value === 'page' ||
    value === 'form' ||
    value === 'lead_magnet' ||
    value === 'newsletter_issue' ||
    value === 'note'
  );
}

export function computeCampaignReadiness(
  steps: CampaignStepInput[],
  lookup: CampaignLookup,
): CampaignReadiness {
  const formSteps = steps.filter((s) => s.stepType === 'form' && s.refId);
  const pageSteps = steps.filter((s) => s.stepType === 'page' && s.refId);
  const magnetSteps = steps.filter((s) => s.stepType === 'lead_magnet' && s.refId);
  const issueSteps = steps.filter((s) => s.stepType === 'newsletter_issue' && s.refId);

  const hasPublishedForm = formSteps.some((s) => lookup.publishedFormIds.has(s.refId!));
  const hasPublishedPage = pageSteps.some((s) => lookup.publishedPageIds.has(s.refId!));
  const hasPublishedMagnet = magnetSteps.some((s) => lookup.publishedLeadMagnetIds.has(s.refId!));
  const hasNewsletterIssue = issueSteps.some((s) => lookup.newsletterIssueIds.has(s.refId!));
  const hasDeliveryPath = hasPublishedMagnet || hasNewsletterIssue;

  const checks: ReadinessCheck[] = [
    {
      code: 'has_steps',
      label: 'At least one blueprint step',
      ok: steps.length > 0,
    },
    {
      code: 'published_form',
      label: 'Published lead-capture form linked',
      ok: hasPublishedForm,
    },
    {
      code: 'landing_or_note',
      label: 'Landing page linked (or intentional note-only)',
      ok: hasPublishedPage || steps.some((s) => s.stepType === 'note'),
    },
    {
      code: 'delivery_path',
      label: 'Lead magnet or newsletter issue linked',
      ok: hasDeliveryPath,
    },
  ];

  return {
    ready: checks.every((c) => c.ok),
    checks,
  };
}

export function canMarkCampaignReady(status: CampaignStatus, readiness: CampaignReadiness): boolean {
  if (status === 'archived') return false;
  return readiness.ready;
}

export function campaignModuleTouchesSubscribers(): boolean {
  return false;
}

export function campaignModuleRequiresStripe(): boolean {
  return false;
}
