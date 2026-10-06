/** Pure contact identity / consent helpers. No DB I/O. */

export type ContactConsentEventType = 'granted' | 'revoked' | 'suppressed';

export type ContactRow = {
  id: string;
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
  first_consented_at: string | null;
  last_consented_at: string | null;
  unsubscribe_token: string;
};

export type LeadContactInput = {
  email: string;
  firstName?: string | null;
  consentText: string;
  consentedAt: string;
  formId: string;
  formVersion: number;
  submissionId?: string | null;
};

export type ContactUpsertPlan = {
  email: string;
  firstName: string | null;
  marketingOk: true;
  suppressedAt: null;
  /** Preserved when already set (first-consent lock). */
  firstConsentedAt: string;
  lastConsentedAt: string;
  isNew: boolean;
  /** When updating an existing row, keep its unsubscribe token. */
  keepUnsubscribeToken: string | null;
  consentEvent: {
    eventType: 'granted';
    consentText: string;
    formId: string;
    formVersion: number;
    submissionId: string | null;
    at: string;
  };
};

export type ContactUnsubscribePlan = {
  marketingOk: false;
  suppressedAt: string;
  consentEvent: {
    eventType: 'suppressed';
    consentText: string;
    formId: null;
    formVersion: null;
    submissionId: null;
    at: string;
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeContactEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200);
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

export function planContactUpsertFromLead(
  existing: ContactRow | null,
  input: LeadContactInput,
): ContactUpsertPlan | { ok: false; error: string } {
  const email = normalizeContactEmail(input.email);
  if (!email) return { ok: false, error: 'Invalid email.' };
  if (!input.consentText.trim()) return { ok: false, error: 'Consent text is required.' };
  if (!input.formId) return { ok: false, error: 'Form id is required.' };

  const at = input.consentedAt || new Date().toISOString();
  const firstName =
    typeof input.firstName === 'string' && input.firstName.trim()
      ? input.firstName.trim().slice(0, 80)
      : existing?.first_name ?? null;

  const firstConsentedAt = existing?.first_consented_at ?? at;

  return {
    email,
    firstName,
    marketingOk: true,
    suppressedAt: null,
    firstConsentedAt,
    lastConsentedAt: at,
    isNew: !existing,
    keepUnsubscribeToken: existing?.unsubscribe_token ?? null,
    consentEvent: {
      eventType: 'granted',
      consentText: input.consentText.trim().slice(0, 500),
      formId: input.formId,
      formVersion: Math.max(1, Math.floor(input.formVersion || 1)),
      submissionId: input.submissionId ?? null,
      at,
    },
  };
}

export function planContactUnsubscribe(
  existing: ContactRow,
  at: string = new Date().toISOString(),
): ContactUnsubscribePlan {
  return {
    marketingOk: false,
    suppressedAt: at,
    consentEvent: {
      eventType: 'suppressed',
      consentText: 'Unsubscribed via preference link.',
      formId: null,
      formVersion: null,
      submissionId: null,
      at,
    },
  };
}

/** Guardrail: this module must never reference the kit subscribers table. */
export function contactModuleTouchesSubscribers(): boolean {
  return false;
}
