import { LEAD_CAPTURE_DEFAULT_FIELDS, type FormFieldDef, type FormSettings } from '../../../lib/forms/leadCaptureForm';

export type StudioFormRow = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  version: number;
  fields: FormFieldDef[];
  settings: FormSettings;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

export function defaultLeadCaptureSettings(): FormSettings {
  return {
    successMessage: 'Thanks — you are on the list.',
    honeypotKey: 'company',
    consentText: 'I agree to receive occasional updates about free resources and the book.',
  };
}

export function emptyFormDraft(): Omit<StudioFormRow, 'id' | 'created_at' | 'updated_at' | 'published_at'> {
  return {
    title: 'Lead capture',
    slug: 'lead-capture',
    status: 'draft',
    version: 1,
    fields: [...LEAD_CAPTURE_DEFAULT_FIELDS],
    settings: defaultLeadCaptureSettings(),
  };
}

export function slugifyFormTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'form';
}
