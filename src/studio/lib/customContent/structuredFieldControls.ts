import type { CustomContentTypeKey } from '../customContentTypes';

export type StructuredFieldControl = {
  key: string;
  label: string;
  input: 'text' | 'textarea' | 'url' | 'date' | 'datetime' | 'boolean' | 'select' | 'url_list';
  options?: string[];
  requiredOnPublish: boolean;
};

export const STRUCTURED_FIELD_CONTROLS: Record<CustomContentTypeKey, StructuredFieldControl[]> = {
  resource: [
    { key: 'resource_type', label: 'Resource type', input: 'select', options: ['guide', 'download', 'template', 'reference', 'other'], requiredOnPublish: true },
    { key: 'download_url', label: 'Download URL', input: 'url', requiredOnPublish: true },
    { key: 'description', label: 'Description', input: 'textarea', requiredOnPublish: false },
    { key: 'version', label: 'Version', input: 'text', requiredOnPublish: false },
    { key: 'last_reviewed_date', label: 'Last reviewed date', input: 'date', requiredOnPublish: false },
  ],
  tool_review: [
    { key: 'pricing_checked_date', label: 'Pricing checked date', input: 'date', requiredOnPublish: true },
    { key: 'platform_tested', label: 'Platform tested', input: 'text', requiredOnPublish: true },
    { key: 'what_was_tried', label: 'What was tried', input: 'textarea', requiredOnPublish: true },
    { key: 'limitations', label: 'Limitations', input: 'textarea', requiredOnPublish: true },
    { key: 'affiliate_disclosure', label: 'Affiliate disclosure', input: 'boolean', requiredOnPublish: true },
    { key: 'verdict', label: 'Verdict', input: 'textarea', requiredOnPublish: true },
    { key: 'product_url', label: 'Product URL', input: 'url', requiredOnPublish: false },
    { key: 'pricing_summary', label: 'Pricing summary', input: 'text', requiredOnPublish: false },
    { key: 'sources', label: 'Sources', input: 'url_list', requiredOnPublish: false },
    { key: 'review_date', label: 'Review date', input: 'date', requiredOnPublish: false },
    { key: 'update_date', label: 'Update date', input: 'date', requiredOnPublish: false },
  ],
  event: [
    { key: 'starts_at', label: 'Starts at', input: 'datetime', requiredOnPublish: true },
    { key: 'timezone', label: 'Timezone', input: 'text', requiredOnPublish: true },
    { key: 'ends_at', label: 'Ends at', input: 'datetime', requiredOnPublish: false },
    { key: 'location', label: 'Location', input: 'text', requiredOnPublish: false },
    { key: 'registration_url', label: 'Registration URL', input: 'url', requiredOnPublish: false },
    { key: 'is_virtual', label: 'Virtual event', input: 'boolean', requiredOnPublish: false },
  ],
  interview: [
    { key: 'interviewee_name', label: 'Interviewee name', input: 'text', requiredOnPublish: true },
    { key: 'interview_date', label: 'Interview date', input: 'date', requiredOnPublish: true },
    { key: 'publication_url', label: 'Publication URL', input: 'url', requiredOnPublish: false },
    { key: 'transcript', label: 'Transcript', input: 'textarea', requiredOnPublish: false },
  ],
  sponsor_profile: [
    { key: 'organization_name', label: 'Organization name', input: 'text', requiredOnPublish: true },
    { key: 'website_url', label: 'Website URL', input: 'url', requiredOnPublish: true },
    { key: 'disclosure_text', label: 'Disclosure text', input: 'textarea', requiredOnPublish: true },
    { key: 'contact_name', label: 'Contact name', input: 'text', requiredOnPublish: false },
    { key: 'contact_email', label: 'Contact email', input: 'text', requiredOnPublish: false },
  ],
};
