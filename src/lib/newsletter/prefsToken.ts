const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPrefsToken(raw: string): boolean {
  return UUID_RE.test(raw.trim());
}

export type PrefsListAction = 'subscribe' | 'unsubscribe';

export function normalizePrefsAction(raw: unknown): PrefsListAction | null {
  if (raw === 'subscribe' || raw === 'unsubscribe') return raw;
  return null;
}
