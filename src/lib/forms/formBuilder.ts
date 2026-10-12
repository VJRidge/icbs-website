/** Pure helpers for the studio form field builder. No DB I/O. */

import type { FormFieldDef, FormFieldType } from './leadCaptureForm';

export type AddableFieldType = Exclude<FormFieldType, never>;

export const FORM_BUILDER_FIELD_TYPES: Array<{
  type: FormFieldType;
  label: string;
  defaultLabel: string;
}> = [
  { type: 'email', label: 'Email', defaultLabel: 'Email Address' },
  { type: 'text', label: 'Text', defaultLabel: 'Text field' },
  { type: 'consent', label: 'Consent', defaultLabel: 'I agree to receive updates.' },
];

function slugifyKey(raw: string): string {
  const base = raw
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (!base) return 'field';
  return base.charAt(0).toLowerCase() + base.slice(1);
}

export function uniqueFieldKey(label: string, existing: FormFieldDef[]): string {
  let key = slugifyKey(label);
  if (key === 'email') key = 'email';
  if (/^[0-9]/.test(key)) key = `f_${key}`;
  const used = new Set(existing.map((f) => f.key));
  if (!used.has(key)) return key;
  let n = 2;
  while (used.has(`${key}_${n}`)) n += 1;
  return `${key}_${n}`;
}

export function addFormField(
  fields: FormFieldDef[],
  type: FormFieldType,
  label?: string,
): FormFieldDef[] {
  const meta = FORM_BUILDER_FIELD_TYPES.find((t) => t.type === type);
  const fieldLabel = (label || meta?.defaultLabel || type).trim().slice(0, 300) || type;
  let key = uniqueFieldKey(fieldLabel, fields);
  if (type === 'email' && !fields.some((f) => f.type === 'email')) {
    key = 'email';
  }
  if (type === 'consent' && !fields.some((f) => f.type === 'consent')) {
    key = 'marketingConsent';
  }
  const next: FormFieldDef = {
    key,
    type,
    label: fieldLabel,
    required: type === 'email' || type === 'consent' ? true : false,
    maxLength: type === 'email' ? 200 : type === 'text' ? 120 : undefined,
  };
  // Keep a single consent field at the end when possible.
  if (type === 'consent') {
    const withoutConsent = fields.filter((f) => f.type !== 'consent');
    return [...withoutConsent, next];
  }
  const consent = fields.find((f) => f.type === 'consent');
  const body = fields.filter((f) => f.type !== 'consent');
  return consent ? [...body, next, consent] : [...body, next];
}

export function updateFormField(
  fields: FormFieldDef[],
  key: string,
  patch: Partial<Pick<FormFieldDef, 'label' | 'required' | 'maxLength' | 'key'>>,
): FormFieldDef[] {
  return fields.map((f) => {
    if (f.key !== key) return f;
    const nextKey =
      typeof patch.key === 'string' && patch.key.trim()
        ? uniqueFieldKey(patch.key, fields.filter((x) => x.key !== key))
        : f.key;
    return {
      ...f,
      label: typeof patch.label === 'string' ? patch.label.trim().slice(0, 300) || f.label : f.label,
      required: typeof patch.required === 'boolean' ? patch.required : f.required,
      maxLength:
        typeof patch.maxLength === 'number'
          ? Math.min(Math.max(1, patch.maxLength), 4000)
          : f.maxLength,
      key: nextKey,
    };
  });
}

export function removeFormField(fields: FormFieldDef[], key: string): FormFieldDef[] {
  const target = fields.find((f) => f.key === key);
  if (!target) return fields;
  // Never remove the last email or consent field — signup would break.
  if (target.type === 'email' && fields.filter((f) => f.type === 'email').length <= 1) {
    return fields;
  }
  if (target.type === 'consent' && fields.filter((f) => f.type === 'consent').length <= 1) {
    return fields;
  }
  return fields.filter((f) => f.key !== key);
}

export function moveFormField(
  fields: FormFieldDef[],
  key: string,
  direction: 'up' | 'down',
): FormFieldDef[] {
  const index = fields.findIndex((f) => f.key === key);
  if (index < 0) return fields;
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= fields.length) return fields;
  const next = [...fields];
  const tmp = next[index];
  next[index] = next[swapWith];
  next[swapWith] = tmp;
  return next;
}

export function formHasRequiredEmailAndConsent(fields: FormFieldDef[]): boolean {
  return fields.some((f) => f.type === 'email') && fields.some((f) => f.type === 'consent');
}
