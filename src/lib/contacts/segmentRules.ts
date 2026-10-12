/** Pure audience segment evaluation. No DB I/O. */

export type SegmentMatch = 'all' | 'any';

export type SegmentRule =
  | { field: 'marketing_ok'; op: 'eq'; value: boolean }
  | { field: 'suppressed'; op: 'eq'; value: boolean }
  | { field: 'tag'; op: 'has' | 'not_has'; value: string }
  | { field: 'source_form_id'; op: 'eq'; value: string }
  | { field: 'lead_magnet_id'; op: 'requested'; value: string };

export type SegmentDefinition = {
  match: SegmentMatch;
  rules: SegmentRule[];
};

export type ContactForSegment = {
  id: string;
  email: string;
  marketing_ok: boolean;
  suppressed_at: string | null;
  source_form_id: string | null;
  tagSlugs: string[];
  requestedLeadMagnetIds: string[];
};

const EMPTY: SegmentDefinition = { match: 'all', rules: [] };

function slugifyTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function isRule(value: unknown): value is SegmentRule {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.field === 'marketing_ok' && o.op === 'eq' && typeof o.value === 'boolean') return true;
  if (o.field === 'suppressed' && o.op === 'eq' && typeof o.value === 'boolean') return true;
  if (o.field === 'tag' && (o.op === 'has' || o.op === 'not_has') && typeof o.value === 'string') {
    return true;
  }
  if (o.field === 'source_form_id' && o.op === 'eq' && typeof o.value === 'string') return true;
  if (o.field === 'lead_magnet_id' && o.op === 'requested' && typeof o.value === 'string') {
    return true;
  }
  return false;
}

export function normalizeSegmentDefinition(raw: unknown): SegmentDefinition {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, rules: [] };
  const o = raw as Record<string, unknown>;
  const match: SegmentMatch = o.match === 'any' ? 'any' : 'all';
  const rulesIn = Array.isArray(o.rules) ? o.rules : [];
  const rules: SegmentRule[] = [];
  for (const item of rulesIn) {
    if (!isRule(item)) continue;
    if (item.field === 'tag') {
      const value = slugifyTag(item.value);
      if (!value) continue;
      rules.push({ field: 'tag', op: item.op, value });
      continue;
    }
    if (item.field === 'source_form_id' || item.field === 'lead_magnet_id') {
      const value = item.value.trim();
      if (!value) continue;
      rules.push({ ...item, value } as SegmentRule);
      continue;
    }
    rules.push(item);
  }
  return { match, rules };
}

export function parseSegmentDefinition(raw: unknown): SegmentDefinition {
  return normalizeSegmentDefinition(raw);
}

function ruleMatches(contact: ContactForSegment, rule: SegmentRule): boolean {
  switch (rule.field) {
    case 'marketing_ok':
      return contact.marketing_ok === rule.value;
    case 'suppressed':
      return Boolean(contact.suppressed_at) === rule.value;
    case 'tag': {
      const has = contact.tagSlugs.includes(rule.value);
      return rule.op === 'has' ? has : !has;
    }
    case 'source_form_id':
      return contact.source_form_id === rule.value;
    case 'lead_magnet_id':
      return contact.requestedLeadMagnetIds.includes(rule.value);
    default:
      return false;
  }
}

/** Baseline: never include suppressed or non-marketing contacts unless rules explicitly override. */
function passesBaseline(contact: ContactForSegment): boolean {
  return contact.marketing_ok === true && !contact.suppressed_at;
}

export function evaluateSegment(contact: ContactForSegment, definition: SegmentDefinition): boolean {
  if (!passesBaseline(contact)) return false;
  const def = normalizeSegmentDefinition(definition);
  if (def.rules.length === 0) return true;
  if (def.match === 'any') return def.rules.some((r) => ruleMatches(contact, r));
  return def.rules.every((r) => ruleMatches(contact, r));
}

export function countMatchingContacts(
  contacts: ContactForSegment[],
  definition: SegmentDefinition,
): number {
  const def = normalizeSegmentDefinition(definition);
  let n = 0;
  for (const c of contacts) {
    if (evaluateSegment(c, def)) n += 1;
  }
  return n;
}

export function slugifyContactTag(raw: string): string {
  return slugifyTag(raw);
}
