import { z } from 'zod';

export const CUSTOM_CONTENT_TYPE_KEYS = [
  'resource',
  'tool_review',
  'event',
  'interview',
  'sponsor_profile',
] as const;

export type CustomContentTypeKey = (typeof CUSTOM_CONTENT_TYPE_KEYS)[number];

type CustomContentTypeDefinition = {
  singular: string;
  plural: string;
  description: string;
  schemaVersion: number;
  fields: z.ZodType;
};

const requiredText = z.string().trim().min(1);
const httpUrl = z.url().refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP(S) URL.');
const optionalUrl = z.union([httpUrl, z.literal('')]).optional();
const optionalDate = z.union([z.iso.date(), z.literal('')]).optional();

export const CUSTOM_CONTENT_TYPES = {
  resource: {
    singular: 'Resource',
    plural: 'Resources',
    description: 'A reusable guide, download, template, or reference.',
    schemaVersion: 1,
    fields: z
      .object({
        resource_type: z.enum(['guide', 'download', 'template', 'reference', 'other']),
        download_url: httpUrl,
        description: z.string().optional(),
        version: z.string().optional(),
        last_reviewed_date: optionalDate,
      })
      .strict(),
  },
  tool_review: {
    singular: 'Review',
    plural: 'Reviews',
    description: 'A structured, evidence-backed review of a product or service.',
    schemaVersion: 1,
    fields: z
      .object({
        pricing_checked_date: z.iso.date(),
        platform_tested: requiredText,
        what_was_tried: requiredText,
        limitations: requiredText,
        affiliate_disclosure: z.literal(true, {
          error: 'Confirm affiliate disclosure before publish.',
        }),
        verdict: requiredText,
        product_url: optionalUrl,
        pricing_summary: z.string().optional(),
        sources: z.array(httpUrl).optional(),
        review_date: optionalDate,
        update_date: optionalDate,
      })
      .strict(),
  },
  event: {
    singular: 'Event',
    plural: 'Events',
    description: 'A dated appearance, workshop, launch, or gathering.',
    schemaVersion: 1,
    fields: z
      .object({
        starts_at: z.iso.datetime({ offset: true }),
        ends_at: z.iso.datetime({ offset: true }).optional(),
        timezone: requiredText,
        location: z.string().optional(),
        registration_url: optionalUrl,
        is_virtual: z.boolean().optional(),
      })
      .strict()
      .refine(
        (value) =>
          !value.ends_at || new Date(value.ends_at).getTime() > new Date(value.starts_at).getTime(),
        { message: 'Event end must be after its start', path: ['ends_at'] },
      ),
  },
  interview: {
    singular: 'Interview',
    plural: 'Interviews',
    description: 'A structured interview record connected to people and publications.',
    schemaVersion: 1,
    fields: z
      .object({
        interviewee_name: requiredText,
        interview_date: z.iso.date(),
        publication_url: optionalUrl,
        transcript: z.string().optional(),
      })
      .strict(),
  },
  sponsor_profile: {
    singular: 'Sponsor profile',
    plural: 'Sponsor profiles',
    description: 'A reusable sponsor identity and disclosure record.',
    schemaVersion: 1,
    fields: z
      .object({
        organization_name: requiredText,
        website_url: httpUrl,
        contact_name: z.string().optional(),
        contact_email: z.email().optional(),
        disclosure_text: requiredText,
      })
      .strict(),
  },
} as const satisfies Record<CustomContentTypeKey, CustomContentTypeDefinition>;

export function validateCustomContentFields(
  kind: string,
  fields: unknown,
  mode: 'draft' | 'publish' = 'publish',
) {
  if (!CUSTOM_CONTENT_TYPE_KEYS.includes(kind as CustomContentTypeKey)) {
    return z.never().safeParse(fields);
  }
  const schema = CUSTOM_CONTENT_TYPES[kind as CustomContentTypeKey].fields;
  return (mode === 'draft' ? schema.partial() : schema).safeParse(fields);
}
