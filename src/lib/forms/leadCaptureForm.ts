/** Lead-capture form field validation. No delivery / subscribers side effects. */

export type FormFieldType = 'text' | 'email' | 'consent';

export type FormFieldDef = {
  key: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  maxLength?: number;
};

export type FormSettings = {
  successMessage?: string;
  honeypotKey?: string;
  consentText?: string;
  /** Optional published lead magnet to enqueue after consent. */
  leadMagnetId?: string;
};

export const LEAD_CAPTURE_DEFAULT_FIELDS: FormFieldDef[] = [
  { key: 'firstName', type: 'text', label: 'First name', required: true, maxLength: 80 },
  { key: 'email', type: 'email', label: 'Email', required: true, maxLength: 200 },
  {
    key: 'marketingConsent',
    type: 'consent',
    label: 'I agree to receive occasional updates about free resources and the book.',
    required: true,
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asBool(value: unknown): boolean {
  return value === true || value === 'true' || value === 'yes' || value === 'on' || value === 1;
}

export function normalizeFormFields(raw: unknown): FormFieldDef[] {
  if (!Array.isArray(raw)) return [...LEAD_CAPTURE_DEFAULT_FIELDS];
  const out: FormFieldDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const key = clip(row.key, 64);
    const type = row.type;
    if (!key) continue;
    if (type !== 'text' && type !== 'email' && type !== 'consent') continue;
    out.push({
      key,
      type,
      label: clip(row.label, 300) || key,
      required: row.required !== false,
      maxLength: typeof row.maxLength === 'number' ? Math.min(Math.max(1, row.maxLength), 4000) : undefined,
    });
  }
  return out.length ? out : [...LEAD_CAPTURE_DEFAULT_FIELDS];
}

export type LeadCaptureParseOk = {
  ok: true;
  payload: Record<string, string>;
  consent: { marketing: boolean; text: string; at: string };
  honeypotTriggered: boolean;
  formVersion: number;
};

export type LeadCaptureParseErr = { ok: false; error: string };

export function parseLeadCaptureSubmission(
  body: Record<string, unknown>,
  opts: {
    fields: FormFieldDef[];
    settings: FormSettings;
    formVersion: number;
  },
): LeadCaptureParseOk | LeadCaptureParseErr {
  const honeypotKey = clip(opts.settings.honeypotKey || 'company', 64) || 'company';
  const honeypotTriggered = Boolean(clip(body[honeypotKey], 200));

  const payload: Record<string, string> = {};
  let marketing = false;
  const consentText =
    clip(opts.settings.consentText, 500) ||
    opts.fields.find((f) => f.type === 'consent')?.label ||
    'I agree to receive updates.';

  for (const field of opts.fields) {
    const raw = body[field.key];
    if (field.type === 'consent') {
      marketing = asBool(raw);
      if (field.required && !marketing) {
        return { ok: false, error: 'Please confirm you agree to receive updates.' };
      }
      continue;
    }
    const max = field.maxLength ?? (field.type === 'email' ? 200 : 120);
    const value = field.type === 'email' ? clip(raw, max).toLowerCase() : clip(raw, max);
    if (field.required && !value) {
      return { ok: false, error: `Please enter your ${field.label.toLowerCase()}.` };
    }
    if (field.type === 'email' && value && !EMAIL_RE.test(value)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (value) payload[field.key] = value;
  }

  if (!marketing) {
    return { ok: false, error: 'Please confirm you agree to receive updates.' };
  }

  return {
    ok: true,
    payload,
    consent: {
      marketing: true,
      text: consentText,
      at: new Date().toISOString(),
    },
    honeypotTriggered,
    formVersion: Math.max(1, Math.floor(opts.formVersion || 1)),
  };
}
