import { describe, expect, it } from 'vitest';
import {
  discardSettingsDraftPatch,
  draftFromRow,
  hasPendingSettingsDraft,
  liveRowToSnapshot,
  publishSettingsDraftPatch,
  saveSettingsDraftPatch,
  settingsPreviewSummary,
} from './settingsLifecycle';

const live = {
  site_name: 'Live Site',
  site_description: 'Live desc',
  timezone: 'UTC',
  date_format: 'yyyy-MM-dd',
  homepage_content_id: 'home-1',
  kit_content_id: null,
};

describe('settings draft lifecycle', () => {
  it('loads draft from draft_document when present', () => {
    expect(
      draftFromRow({
        ...live,
        draft_document: { ...live, site_name: 'Pending' },
      }).site_name,
    ).toBe('Pending');
  });

  it('falls back to live columns when draft is missing', () => {
    expect(draftFromRow(live).site_name).toBe('Live Site');
    expect(liveRowToSnapshot(live).homepage_content_id).toBe('home-1');
  });

  it('detects pending drafts without touching live fields', () => {
    const draft = { ...live, site_name: 'Pending' };
    expect(hasPendingSettingsDraft(live, draft)).toBe(true);
    expect(hasPendingSettingsDraft(live, live)).toBe(false);
  });

  it('save draft only writes draft_document and bumps version', () => {
    const patch = saveSettingsDraftPatch({ draft: { ...live, site_name: 'Pending' }, settingsVersion: 2 });
    expect(patch.draft_document.site_name).toBe('Pending');
    expect(patch.settings_version).toBe(3);
    expect(patch).not.toHaveProperty('site_name');
  });

  it('publish copies draft into live columns', () => {
    const patch = publishSettingsDraftPatch({
      draft: { ...live, site_name: 'Published', kit_content_id: 'kit-1' },
      settingsVersion: 4,
    });
    expect(patch.site_name).toBe('Published');
    expect(patch.kit_content_id).toBe('kit-1');
    expect(patch.draft_document.site_name).toBe('Published');
    expect(patch.settings_version).toBe(5);
  });

  it('discard resets draft to the live snapshot', () => {
    const patch = discardSettingsDraftPatch({ live, settingsVersion: 1 });
    expect(patch.draft_document).toEqual(liveRowToSnapshot(live));
  });

  it('builds a preview summary from shared page records', () => {
    const summary = settingsPreviewSummary(
      { ...live, homepage_content_id: 'home-1' },
      [{ id: 'home-1', title: 'Sales', slug: 'book' }],
    );
    expect(summary.homepageLabel).toContain('Sales');
    expect(summary.kitLabel).toBe('Built-in kit page');
  });
});
