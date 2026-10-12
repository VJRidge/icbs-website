/** Pure CSV → contact-list membership planner. No DB I/O. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ROWS = 2000;

export type ContactListCsvParsedRow = {
  email: string | null;
  firstName: string | null;
  line: number;
};

export type ContactForListImport = {
  id: string;
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
};

export type ContactListCsvAction = 'create' | 'update' | 'add_member' | 'skip';

export type ContactListCsvPlan = {
  email: string | null;
  action: ContactListCsvAction;
  reason: string;
  firstName: string | null;
  marketingOk: boolean;
  addToList: boolean;
  existingContactId: string | null;
  contactPatch: { firstName: string | null; marketingOk: boolean } | null;
  line: number;
};

export type ContactListCsvSummary = {
  total: number;
  create: number;
  update: number;
  add_member: number;
  skip: number;
  wouldWrite: number;
};

export function normalizeListEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200);
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

function trimName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim().slice(0, 80);
  return next || null;
}

/** Minimal CSV line split (supports quoted commas). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function headerIndex(headers: string[], names: string[]): number {
  const lowered = headers.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = lowered.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseContactListCsv(text: string): ContactListCsvParsedRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!lines.length) return [];

  let start = 0;
  let emailIdx = 0;
  let nameIdx = -1;

  const firstCells = splitCsvLine(lines[0] || '');
  const looksLikeHeader =
    firstCells.some((c) => /^(e-?mail|email_address)$/i.test(c.trim())) ||
    firstCells.some((c) => /^(first[_\s-]?name|fname|name)$/i.test(c.trim()));

  if (looksLikeHeader) {
    emailIdx = headerIndex(firstCells, ['email', 'e-mail', 'email_address']);
    if (emailIdx < 0) emailIdx = 0;
    nameIdx = headerIndex(firstCells, ['first_name', 'first name', 'firstname', 'fname', 'name']);
    start = 1;
  } else if (firstCells[0] && !normalizeListEmail(firstCells[0])) {
    // Unknown header — still skip first line if first cell isn't an email.
    start = 1;
    emailIdx = 0;
    nameIdx = firstCells.length > 1 ? 1 : -1;
  }

  const rows: ContactListCsvParsedRow[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    const cells = splitCsvLine(raw);
    if (!cells.length || cells.every((c) => !c.trim())) continue;
    if (rows.length >= MAX_ROWS) {
      throw new Error(`CSV exceeds ${MAX_ROWS} data rows. Split the file and import in batches.`);
    }
    const email = normalizeListEmail(cells[emailIdx] || '');
    const firstName = nameIdx >= 0 ? trimName(cells[nameIdx]) : null;
    rows.push({ email, firstName, line: i + 1 });
  }
  return rows;
}

/** Keep the last occurrence of each email (stable for re-uploads). */
export function dedupeContactListCsvRows(
  rows: ContactListCsvParsedRow[],
): ContactListCsvParsedRow[] {
  const byEmail = new Map<string, ContactListCsvParsedRow>();
  const invalid: ContactListCsvParsedRow[] = [];
  for (const row of rows) {
    if (!row.email) {
      invalid.push(row);
      continue;
    }
    byEmail.set(row.email, row);
  }
  return [...invalid, ...byEmail.values()].sort((a, b) => a.line - b.line);
}

export function planContactListCsvRow(
  row: ContactListCsvParsedRow,
  opts: {
    existing: ContactForListImport | null;
    alreadyMember: boolean;
    confirmMarketingConsent: boolean;
  },
): ContactListCsvPlan {
  const email = row.email;
  const firstName = trimName(row.firstName);

  if (!email) {
    return {
      email: null,
      action: 'skip',
      reason: 'Invalid email',
      firstName,
      marketingOk: false,
      addToList: false,
      existingContactId: null,
      contactPatch: null,
      line: row.line,
    };
  }

  if (!opts.existing) {
    if (!opts.confirmMarketingConsent) {
      return {
        email,
        action: 'skip',
        reason: 'Marketing consent confirmation required for new contacts',
        firstName,
        marketingOk: false,
        addToList: false,
        existingContactId: null,
        contactPatch: null,
        line: row.line,
      };
    }
    return {
      email,
      action: 'create',
      reason: 'New contact + list membership',
      firstName,
      marketingOk: true,
      addToList: true,
      existingContactId: null,
      contactPatch: { firstName, marketingOk: true },
      line: row.line,
    };
  }

  const suppressed = Boolean(opts.existing.suppressed_at) || !opts.existing.marketing_ok;
  if (suppressed) {
    if (opts.alreadyMember) {
      return {
        email,
        action: 'skip',
        reason: 'Already on list (suppressed; not re-opted-in)',
        firstName: opts.existing.first_name,
        marketingOk: false,
        addToList: false,
        existingContactId: opts.existing.id,
        contactPatch: null,
        line: row.line,
      };
    }
    return {
      email,
      action: 'add_member',
      reason: 'Add to list only (suppressed; not re-opted-in)',
      firstName: opts.existing.first_name,
      marketingOk: false,
      addToList: true,
      existingContactId: opts.existing.id,
      contactPatch: null,
      line: row.line,
    };
  }

  const nameNeedsUpdate = Boolean(firstName) && firstName !== (opts.existing.first_name || null);
  if (opts.alreadyMember && !nameNeedsUpdate) {
    return {
      email,
      action: 'skip',
      reason: 'Already on list',
      firstName: opts.existing.first_name,
      marketingOk: true,
      addToList: false,
      existingContactId: opts.existing.id,
      contactPatch: null,
      line: row.line,
    };
  }

  if (nameNeedsUpdate) {
    return {
      email,
      action: 'update',
      reason: opts.alreadyMember ? 'Update name' : 'Update name + list membership',
      firstName,
      marketingOk: true,
      addToList: !opts.alreadyMember,
      existingContactId: opts.existing.id,
      contactPatch: { firstName, marketingOk: true },
      line: row.line,
    };
  }

  return {
    email,
    action: 'add_member',
    reason: 'Add to list',
    firstName: opts.existing.first_name,
    marketingOk: true,
    addToList: true,
    existingContactId: opts.existing.id,
    contactPatch: null,
    line: row.line,
  };
}

export function summarizeContactListCsvPlans(plans: ContactListCsvPlan[]): ContactListCsvSummary {
  const summary: ContactListCsvSummary = {
    total: plans.length,
    create: 0,
    update: 0,
    add_member: 0,
    skip: 0,
    wouldWrite: 0,
  };
  for (const p of plans) {
    summary[p.action] += 1;
    if (p.action !== 'skip') summary.wouldWrite += 1;
  }
  return summary;
}
