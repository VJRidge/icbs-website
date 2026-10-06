import { describe, expect, it } from 'vitest';
import {
  campaignModuleRequiresStripe,
  campaignModuleTouchesSubscribers,
  canMarkCampaignReady,
  computeCampaignReadiness,
} from './campaignReadiness';

const lookup = {
  publishedPageIds: new Set(['page-1']),
  publishedFormIds: new Set(['form-1']),
  publishedLeadMagnetIds: new Set(['magnet-1']),
  newsletterIssueIds: new Set(['issue-1']),
};

describe('computeCampaignReadiness', () => {
  it('is ready when form + page + delivery path exist', () => {
    const result = computeCampaignReadiness(
      [
        { stepType: 'page', refId: 'page-1' },
        { stepType: 'form', refId: 'form-1' },
        { stepType: 'lead_magnet', refId: 'magnet-1' },
      ],
      lookup,
    );
    expect(result.ready).toBe(true);
    expect(canMarkCampaignReady('draft', result)).toBe(true);
  });

  it('accepts newsletter issue as delivery path and note instead of page', () => {
    const result = computeCampaignReadiness(
      [
        { stepType: 'note', refId: null, label: 'Organic social only' },
        { stepType: 'form', refId: 'form-1' },
        { stepType: 'newsletter_issue', refId: 'issue-1' },
      ],
      lookup,
    );
    expect(result.ready).toBe(true);
  });

  it('fails without form or delivery', () => {
    const result = computeCampaignReadiness([{ stepType: 'page', refId: 'page-1' }], lookup);
    expect(result.ready).toBe(false);
    expect(result.checks.find((c) => c.code === 'published_form')?.ok).toBe(false);
    expect(canMarkCampaignReady('archived', result)).toBe(false);
    expect(campaignModuleTouchesSubscribers()).toBe(false);
    expect(campaignModuleRequiresStripe()).toBe(false);
  });
});
