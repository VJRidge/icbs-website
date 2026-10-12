/** Contacts CSV parse / export helpers. No DB I/O. */

import { normalizeListEmail, splitCsvLine } from './contactListCsv';

export type ContactCsvRow = {
  email: string;
  firstName: string | null;
  line: number;
};

export type ContactExportRow = {
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
  first_consented_at: string | null;
  last_consented_at: string | null;
};

const MAX_IMPORT_ROWS = 2000;

export function parseContactsCsv(text: string): { rows: ContactCsvRow[]; error: string | null } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], error: 'CSV is empty.' };

  const headerCells = splitCsvLine(lines[0]).map((c) => c.trim().toLowerCase());
  const looksLikeHeader =
    headerCells.includes('email') || headerCells.includes('e-mail') || headerCells.includes('first_name');
  let emailIdx = headerCells.findIndex((c) => c === 'email' || c === 'e-mail');
  let nameIdx = headerCells.findIndex((c) => c === 'first_name' || c === 'firstname' || c === 'first name' || c === 'name');
  let start = 1;
  if (!looksLikeHeader || emailIdx < 0) {
    emailIdx = 0;
    nameIdx = 1;
    start = 0;
  }

  const rows: ContactCsvRow[] = [];
  const seen = new Set<string>();
  for (let i = start; i < lines.length; i += 1) {
    if (rows.length >= MAX_IMPORT_ROWS) {
      return { rows, error: `Stopped at ${MAX_IMPORT_ROWS} rows (max per import).` };
    }
    const cells = splitCsvLine(lines[i]);
    const email = normalizeListEmail(cells[emailIdx] || '');
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    const rawName = nameIdx >= 0 ? cells[nameIdx] : '';
    const firstName =
      typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 80) : null;
    rows.push({ email, firstName, line: i + 1 });
  }
  if (!rows.length) return { rows: [], error: 'No valid email rows found.' };
  return { rows, error: null };
}

export function contactsToCsv(rows: ContactExportRow[]): string {
  const header = 'email,first_name,marketing_ok,suppressed_at,first_consented_at,last_consented_at';
  const body = rows.map((r) =>
    [
      csvEscape(r.email),
      csvEscape(r.first_name || ''),
      r.marketing_ok ? 'true' : 'false',
      csvEscape(r.suppressed_at || ''),
      csvEscape(r.first_consented_at || ''),
      csvEscape(r.last_consented_at || ''),
    ].join(','),
  );
  return [header, ...body].join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
