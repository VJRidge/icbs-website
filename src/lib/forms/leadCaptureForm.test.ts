import { describe, expect, it } from 'vitest';
import {
  LEAD_CAPTURE_DEFAULT_FIELDS,
  normalizeFormFields,
  parseLeadCaptureSubmission,
  type FormFieldDef,
} from './leadCaptureForm';

const fields = normalizeFormFields(LEAD_CAPTURE_DEFAULT_FIELDS);

describe('parseLeadCaptureSubmission', () => {
  it('accepts valid name, email, and marketing consent', () => {
    const result = parseLeadCaptureSubmission(
      {
        firstName: 'Ada',
        email: 'ada@example.com',
        marketingConsent: true,
        company: '',
      },
      {
        fields,
        settings: {
          honeypotKey: 'company',
          consentText: 'I agree to receive updates.',
        },
        formVersion: 1,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
    expect(result.consent).toEqual({
      marketing: true,
      text: 'I agree to receive updates.',
      at: expect.any(String),
    });
    expect(result.honeypotTriggered).toBe(false);
  });

  it('rejects missing consent, bad email, and treats honeypot as soft-ok', () => {
    expect(
      parseLeadCaptureSubmission(
        { firstName: 'Ada', email: 'ada@example.com', marketingConsent: false },
        { fields, settings: { consentText: 'Agree' }, formVersion: 1 },
      ).ok,
    ).toBe(false);

    expect(
      parseLeadCaptureSubmission(
        { firstName: 'Ada', email: 'not-an-email', marketingConsent: true },
        { fields, settings: { consentText: 'Agree' }, formVersion: 1 },
      ).ok,
    ).toBe(false);

    const honey = parseLeadCaptureSubmission(
      {
        firstName: 'Ada',
        email: 'ada@example.com',
        marketingConsent: true,
        company: 'bot',
      },
      {
        fields,
        settings: { honeypotKey: 'company', consentText: 'Agree' },
        formVersion: 1,
      },
    );
    expect(honey.ok).toBe(true);
    if (honey.ok) expect(honey.honeypotTriggered).toBe(true);
  });

  it('normalizes field defs and drops unknown keys from payload', () => {
    const custom: FormFieldDef[] = [
      { key: 'firstName', type: 'text', label: 'Name', required: true, maxLength: 80 },
      { key: 'email', type: 'email', label: 'Email', required: true, maxLength: 200 },
      { key: 'marketingConsent', type: 'consent', label: 'Consent', required: true },
    ];
    const result = parseLeadCaptureSubmission(
      {
        firstName: '  Ada  ',
        email: 'Ada@Example.COM',
        marketingConsent: 'yes',
        extra: 'drop-me',
      },
      { fields: custom, settings: { consentText: 'Consent copy' }, formVersion: 2 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({ firstName: 'Ada', email: 'ada@example.com' });
    expect((result.payload as { extra?: string }).extra).toBeUndefined();
    expect(result.formVersion).toBe(2);
  });
});
