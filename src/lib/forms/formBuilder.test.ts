import { describe, expect, it } from 'vitest';
import { LEAD_CAPTURE_DEFAULT_FIELDS } from './leadCaptureForm';
import {
  addFormField,
  formHasRequiredEmailAndConsent,
  moveFormField,
  removeFormField,
  updateFormField,
} from './formBuilder';

describe('formBuilder', () => {
  it('adds a text field before consent', () => {
    const next = addFormField(LEAD_CAPTURE_DEFAULT_FIELDS, 'text', 'Last name');
    expect(next.map((f) => f.key)).toEqual([
      'firstName',
      'email',
      'last_name',
      'marketingConsent',
    ]);
    expect(next.find((f) => f.key === 'last_name')?.type).toBe('text');
  });

  it('updates label and required', () => {
    const next = updateFormField(LEAD_CAPTURE_DEFAULT_FIELDS, 'firstName', {
      label: 'Given name',
      required: false,
    });
    expect(next.find((f) => f.key === 'firstName')).toMatchObject({
      label: 'Given name',
      required: false,
    });
  });

  it('refuses to remove the only email or consent field', () => {
    expect(removeFormField(LEAD_CAPTURE_DEFAULT_FIELDS, 'email')).toEqual(
      LEAD_CAPTURE_DEFAULT_FIELDS,
    );
    expect(removeFormField(LEAD_CAPTURE_DEFAULT_FIELDS, 'marketingConsent')).toEqual(
      LEAD_CAPTURE_DEFAULT_FIELDS,
    );
  });

  it('moves fields and keeps email+consent present', () => {
    const moved = moveFormField(LEAD_CAPTURE_DEFAULT_FIELDS, 'email', 'up');
    expect(moved[0].key).toBe('email');
    expect(formHasRequiredEmailAndConsent(moved)).toBe(true);
  });
});
