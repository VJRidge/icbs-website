export type SettingsSnapshot = {
  site_name: string;
  site_description: string;
  timezone: string;
  date_format: string;
  homepage_content_id: string | null;
  kit_content_id: string | null;
};

export type SettingsLiveRow = SettingsSnapshot & {
  draft_document?: SettingsSnapshot | null;
  settings_version?: number | null;
};

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
  site_name: 'I Call BS',
  site_description: '',
  timezone: 'America/New_York',
  date_format: 'MMMM d, yyyy',
  homepage_content_id: null,
  kit_content_id: null,
};

export function normalizeSettingsSnapshot(raw: unknown): SettingsSnapshot {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    site_name: String(o.site_name ?? DEFAULT_SETTINGS_SNAPSHOT.site_name).trim() || DEFAULT_SETTINGS_SNAPSHOT.site_name,
    site_description: String(o.site_description ?? '').trim(),
    timezone: String(o.timezone ?? DEFAULT_SETTINGS_SNAPSHOT.timezone).trim() || DEFAULT_SETTINGS_SNAPSHOT.timezone,
    date_format:
      String(o.date_format ?? DEFAULT_SETTINGS_SNAPSHOT.date_format).trim() || DEFAULT_SETTINGS_SNAPSHOT.date_format,
    homepage_content_id: o.homepage_content_id ? String(o.homepage_content_id) : null,
    kit_content_id: o.kit_content_id ? String(o.kit_content_id) : null,
  };
}

export function liveRowToSnapshot(row: Partial<SettingsLiveRow> | null | undefined): SettingsSnapshot {
  return normalizeSettingsSnapshot({
    site_name: row?.site_name,
    site_description: row?.site_description,
    timezone: row?.timezone,
    date_format: row?.date_format,
    homepage_content_id: row?.homepage_content_id,
    kit_content_id: row?.kit_content_id,
  });
}

export function draftFromRow(row: Partial<SettingsLiveRow> | null | undefined): SettingsSnapshot {
  if (row?.draft_document && typeof row.draft_document === 'object') {
    return normalizeSettingsSnapshot(row.draft_document);
  }
  return liveRowToSnapshot(row);
}

export function settingsSnapshotsEqual(a: SettingsSnapshot, b: SettingsSnapshot): boolean {
  return (
    a.site_name === b.site_name &&
    a.site_description === b.site_description &&
    a.timezone === b.timezone &&
    a.date_format === b.date_format &&
    a.homepage_content_id === b.homepage_content_id &&
    a.kit_content_id === b.kit_content_id
  );
}

export function hasPendingSettingsDraft(live: SettingsSnapshot, draft: SettingsSnapshot): boolean {
  return !settingsSnapshotsEqual(live, draft);
}

export function saveSettingsDraftPatch(args: {
  draft: SettingsSnapshot;
  settingsVersion: number;
}): { draft_document: SettingsSnapshot; settings_version: number; updated_at: string } {
  return {
    draft_document: normalizeSettingsSnapshot(args.draft),
    settings_version: Math.max(1, args.settingsVersion) + 1,
    updated_at: new Date().toISOString(),
  };
}

/** Promote draft into live columns. Public readers only see these after publish. */
export function publishSettingsDraftPatch(args: {
  draft: SettingsSnapshot;
  settingsVersion: number;
}): SettingsSnapshot & {
  draft_document: SettingsSnapshot;
  settings_version: number;
  updated_at: string;
} {
  const next = normalizeSettingsSnapshot(args.draft);
  return {
    ...next,
    draft_document: next,
    settings_version: Math.max(1, args.settingsVersion) + 1,
    updated_at: new Date().toISOString(),
  };
}

export function discardSettingsDraftPatch(args: {
  live: SettingsSnapshot;
  settingsVersion: number;
}): { draft_document: SettingsSnapshot; settings_version: number; updated_at: string } {
  const live = normalizeSettingsSnapshot(args.live);
  return {
    draft_document: live,
    settings_version: Math.max(1, args.settingsVersion) + 1,
    updated_at: new Date().toISOString(),
  };
}

export function settingsPreviewSummary(draft: SettingsSnapshot, pages: Array<{ id: string; title: string; slug: string }>) {
  const home = pages.find((p) => p.id === draft.homepage_content_id);
  const kit = pages.find((p) => p.id === draft.kit_content_id);
  return {
    siteName: draft.site_name,
    siteDescription: draft.site_description || '(none)',
    timezone: draft.timezone,
    dateFormat: draft.date_format,
    homepageLabel: home ? `${home.title} (/ ${home.slug})` : 'Built-in kit fallback',
    kitLabel: kit ? `${kit.title} (/ ${kit.slug})` : 'Built-in kit page',
  };
}
