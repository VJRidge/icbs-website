/** Pure kit `subscribers` → `contacts` import planner. No DB I/O. */

export const IMPORT_SOURCE_KIT_SUBSCRIBERS = 'kit_subscribers' as const;

export type ImportSource = typeof IMPORT_SOURCE_KIT_SUBSCRIBERS;

export type KitSubscriberSource = {
  id: string;
  email: string;
  first_name: string | null;
  consent_at: string;
  unsubscribed_at: string | null;
};

export type ContactForImport = {
  id: string;
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
  first_consented_at: string | null;
  last_consented_at: string | null;
};

export type ImportRowAction = 'create' | 'update' | 'skip' | 'suppress';

export type ImportRowPlan = {
  source: ImportSource;
  sourceKey: string;
  email: string | null;
  action: ImportRowAction;
  reason: string;
  contactPatch: {
    firstName: string | null;
    marketingOk: boolean;
    suppressedAt: string | null;
    firstConsentedAt: string | null;
    lastConsentedAt: string | null;
  } | null;
  consentEvent: {
    eventType: 'granted' | 'suppressed';
    consentText: string;
    at: string;
  } | null;
  existingContactId: string | null;
  idempotencyKey: string;
};

export type ImportPlanSummary = {
  total: number;
  create: number;
  update: number;
  suppress: number;
  skip: number;
  /** Rows that would mutate contacts on commit. */
  wouldWrite: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeImportEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().slice(0, 200);
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

function trimName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim().slice(0, 80);
  return next || null;
}

export function planKitSubscriberImportRow(
  source: KitSubscriberSource,
  opts: { existing: ContactForImport | null; alreadyApplied: boolean },
): ImportRowPlan {
  const idempotencyKey = `${IMPORT_SOURCE_KIT_SUBSCRIBERS}:${source.id}`;
  const email = normalizeImportEmail(source.email);

  if (!email) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email: null,
      action: 'skip',
      reason: 'Invalid email.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing?.id ?? null,
      idempotencyKey,
    };
  }

  if (opts.alreadyApplied) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'skip',
      reason: 'Already applied for this source key.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing?.id ?? null,
      idempotencyKey,
    };
  }

  const firstName = trimName(source.first_name) ?? opts.existing?.first_name ?? null;
  const kitUnsubscribed = Boolean(source.unsubscribed_at);
  const contactSuppressed = Boolean(opts.existing?.suppressed_at) || opts.existing?.marketing_ok === false;

  if (kitUnsubscribed) {
    const suppressedAt = source.unsubscribed_at || new Date().toISOString();
    if (opts.existing && contactSuppressed) {
      return {
        source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
        sourceKey: source.id,
        email,
        action: 'skip',
        reason: 'Contact already suppressed; suppression preserved.',
        contactPatch: null,
        consentEvent: null,
        existingContactId: opts.existing.id,
        idempotencyKey,
      };
    }
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'suppress',
      reason: opts.existing
        ? 'Kit unsubscribe; suppress existing contact.'
        : 'Kit unsubscribe; create suppressed contact.',
      contactPatch: {
        firstName,
        marketingOk: false,
        suppressedAt,
        firstConsentedAt: opts.existing?.first_consented_at ?? source.consent_at ?? suppressedAt,
        lastConsentedAt: opts.existing?.last_consented_at ?? source.consent_at ?? suppressedAt,
      },
      consentEvent: {
        eventType: 'suppressed',
        consentText: 'Imported from kit subscribers (unsubscribed).',
        at: suppressedAt,
      },
      existingContactId: opts.existing?.id ?? null,
      idempotencyKey,
    };
  }

  // Active kit subscriber — never clear an existing suppression.
  if (opts.existing && contactSuppressed) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'skip',
      reason: 'Suppression preserved; import will not re-opt-in.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing.id,
      idempotencyKey,
    };
  }

  if (!opts.existing) {
    const at = source.consent_at || new Date().toISOString();
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'create',
      reason: 'New contact from kit subscriber.',
      contactPatch: {
        firstName,
        marketingOk: true,
        suppressedAt: null,
        firstConsentedAt: at,
        lastConsentedAt: at,
      },
      consentEvent: {
        eventType: 'granted',
        consentText: 'Imported from kit subscribers (active).',
        at,
      },
      existingContactId: null,
      idempotencyKey,
    };
  }

  const nameChanged = firstName !== (opts.existing.first_name ?? null);
  if (!nameChanged && opts.existing.marketing_ok) {
    return {
      source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
      sourceKey: source.id,
      email,
      action: 'skip',
      reason: 'No change.',
      contactPatch: null,
      consentEvent: null,
      existingContactId: opts.existing.id,
      idempotencyKey,
    };
  }

  const at = source.consent_at || opts.existing.last_consented_at || new Date().toISOString();
  return {
    source: IMPORT_SOURCE_KIT_SUBSCRIBERS,
    sourceKey: source.id,
    email,
    action: 'update',
    reason: nameChanged ? 'Update contact fields from kit subscriber.' : 'Refresh marketing contact from kit.',
    contactPatch: {
      firstName,
      marketingOk: true,
      suppressedAt: null,
      firstConsentedAt: opts.existing.first_consented_at ?? at,
      lastConsentedAt: opts.existing.last_consented_at ?? at,
    },
    consentEvent: null,
    existingContactId: opts.existing.id,
    idempotencyKey,
  };
}

export function summarizeImportPlans(plans: ImportRowPlan[]): ImportPlanSummary {
  const summary: ImportPlanSummary = {
    total: plans.length,
    create: 0,
    update: 0,
    suppress: 0,
    skip: 0,
    wouldWrite: 0,
  };
  for (const plan of plans) {
    summary[plan.action] += 1;
    if (plan.action === 'create' || plan.action === 'update' || plan.action === 'suppress') {
      summary.wouldWrite += 1;
    }
  }
  return summary;
}

/** Guardrail: commit path must not delete or mutate kit subscribers. */
export function importModuleMutatesSubscribers(): boolean {
  return false;
}
