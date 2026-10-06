import { describe, expect, it } from 'vitest';
import {
  canCreateMedia,
  canCreateShortLinks,
  canLinkMediaUsage,
  canManageContacts,
  canManageForms,
  canManageLeadMagnets,
  canManageMedia,
  canManageCampaigns,
  canManageNewsletter,
  canReadAnalytics,
  canManageShortLinks,
  canManageSiteChrome,
  canManageTaxonomies,
  canManageTemplates,
  canReadAdminActivity,
  canReadTemplates,
  canSetPublishStatus,
  canUnlinkMediaUsage,
  canUpdateContent,
  canUpdateProfiles,
  capabilitiesForRole,
  hasStaffCapability,
} from './authorization';

describe('capabilitiesForRole', () => {
  it('gives owners the full content and users matrix', () => {
    expect(capabilitiesForRole('owner')).toContain('users.manage');
    expect(capabilitiesForRole('owner')).toContain('content.delete');
  });

  it('denies authors publish and delete', () => {
    expect(hasStaffCapability('author', 'content.publish', { staffApproved: true })).toBe(false);
    expect(hasStaffCapability('author', 'content.delete', { staffApproved: true })).toBe(false);
    expect(hasStaffCapability('author', 'content.update_own', { staffApproved: true })).toBe(true);
  });

  it('fails closed when approval is missing or false', () => {
    expect(hasStaffCapability('owner', 'content.read')).toBe(false);
    expect(hasStaffCapability('owner', 'content.read', { staffApproved: false })).toBe(false);
    expect(hasStaffCapability('admin', 'content.read', { staffApproved: true, disabled: true })).toBe(false);
  });
});

describe('canUpdateContent', () => {
  it('lets editors update any row', () => {
    expect(
      canUpdateContent({
        role: 'editor',
        staffApproved: true,
        authorId: 'a',
        actorId: 'b',
      }),
    ).toBe(true);
  });

  it('lets authors update only their own rows', () => {
    expect(
      canUpdateContent({
        role: 'author',
        staffApproved: true,
        authorId: 'a',
        actorId: 'a',
      }),
    ).toBe(true);
    expect(
      canUpdateContent({
        role: 'author',
        staffApproved: true,
        authorId: 'a',
        actorId: 'b',
      }),
    ).toBe(false);
  });
});

describe('canSetPublishStatus', () => {
  it('allows authors to keep drafts but not publish or schedule', () => {
    expect(canSetPublishStatus({ role: 'author', staffApproved: true, nextStatus: 'draft' })).toBe(true);
    expect(canSetPublishStatus({ role: 'author', staffApproved: true, nextStatus: 'pending_review' })).toBe(true);
    expect(canSetPublishStatus({ role: 'author', staffApproved: true, nextStatus: 'published' })).toBe(false);
    expect(canSetPublishStatus({ role: 'author', staffApproved: true, nextStatus: 'scheduled' })).toBe(false);
  });

  it('allows editors to publish', () => {
    expect(canSetPublishStatus({ role: 'editor', staffApproved: true, nextStatus: 'published' })).toBe(true);
  });

  it('denies draft changes when approval is missing', () => {
    expect(canSetPublishStatus({ role: 'editor', nextStatus: 'draft' })).toBe(false);
  });
});

describe('canUpdateProfiles', () => {
  it('is owner-only', () => {
    expect(canUpdateProfiles('owner', { staffApproved: true })).toBe(true);
    expect(canUpdateProfiles('admin', { staffApproved: true })).toBe(false);
  });
});

describe('non-content admin capabilities', () => {
  const approved = { staffApproved: true as const };

  it('restricts site chrome (menus, redirects, settings) to publish capability', () => {
    expect(canManageSiteChrome('editor', approved)).toBe(true);
    expect(canManageSiteChrome('author', approved)).toBe(false);
    expect(canManageSiteChrome('editor')).toBe(false);
  });

  it('lets authors create media and update only their own rows', () => {
    expect(canCreateMedia('author', approved)).toBe(true);
    expect(
      canManageMedia({
        role: 'author',
        ...approved,
        createdBy: 'a',
        actorId: 'a',
      }),
    ).toBe(true);
    expect(
      canManageMedia({
        role: 'author',
        ...approved,
        createdBy: 'a',
        actorId: 'b',
      }),
    ).toBe(false);
    expect(
      canManageMedia({
        role: 'editor',
        ...approved,
        createdBy: 'a',
        actorId: 'b',
      }),
    ).toBe(true);
  });

  it('keeps templates, taxonomies, forms, and contacts mutations on update_any', () => {
    expect(canReadTemplates('author', approved)).toBe(true);
    expect(canManageTemplates('editor', approved)).toBe(true);
    expect(canManageTemplates('author', approved)).toBe(false);
    expect(canManageTaxonomies('editor', approved)).toBe(true);
    expect(canManageTaxonomies('author', approved)).toBe(false);
    expect(canManageForms('admin', approved)).toBe(true);
    expect(canManageForms('author', approved)).toBe(false);
    expect(canManageContacts('admin', approved)).toBe(true);
    expect(canManageContacts('author', approved)).toBe(false);
    expect(canManageLeadMagnets('admin', approved)).toBe(true);
    expect(canManageLeadMagnets('author', approved)).toBe(false);
    expect(canManageNewsletter('admin', approved)).toBe(true);
    expect(canManageNewsletter('author', approved)).toBe(false);
    expect(canReadAnalytics('author', approved)).toBe(true);
    expect(canReadAnalytics('author')).toBe(false);
    expect(canManageCampaigns('admin', approved)).toBe(true);
    expect(canManageCampaigns('author', approved)).toBe(false);
  });

  it('lets authors create short links but not retarget them', () => {
    expect(canCreateShortLinks('author', approved)).toBe(true);
    expect(canManageShortLinks('author', approved)).toBe(false);
    expect(canManageShortLinks('editor', approved)).toBe(true);
  });

  it('lets authors link media usages but not unlink them', () => {
    expect(canLinkMediaUsage('author', approved)).toBe(true);
    expect(canUnlinkMediaUsage('author', approved)).toBe(false);
    expect(canUnlinkMediaUsage('editor', approved)).toBe(true);
  });

  it('allows activity read for content.read', () => {
    expect(canReadAdminActivity('author', approved)).toBe(true);
    expect(canReadAdminActivity('author')).toBe(false);
  });
});
