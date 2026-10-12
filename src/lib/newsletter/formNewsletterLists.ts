/** Normalize form settings → newsletter list IDs for subscription on submit. */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeNewsletterListIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 20) break;
  }
  return out;
}

export function toggleNewsletterListId(current: string[] | undefined, listId: string): string[] {
  const id = listId.trim();
  if (!UUID_RE.test(id)) return normalizeNewsletterListIds(current);
  const base = normalizeNewsletterListIds(current);
  if (base.includes(id)) return base.filter((x) => x !== id);
  return [...base, id];
}
