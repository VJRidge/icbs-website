/** Catalog of public-facing surfaces that are not ordinary CMS Pages rows. */

export type PublicSurfaceKind =
  | 'resource_page'
  | 'interactive'
  | 'funnel'
  | 'legal'
  | 'download'
  | 'brand_page';

export type PublicSurface = {
  id: string;
  title: string;
  path: string;
  kind: PublicSurfaceKind;
  /** How staff edit this surface today. */
  editVia: 'admin_editor' | 'cms_pages' | 'cms_or_code' | 'code' | 'templates_admin' | 'media' | 'brand_draft';  adminPath?: string;
  notes?: string;
};

/** Replaceable file slots (URL map in site_managed_content). */
export type PublicFileSlot = {
  key: string;
  label: string;
  defaultPath: string;
  usedOn: string[];
  accept: string;
};

/** Editable starters for /resources/templates — not PDFs. */
export const TEMPLATE_FILE_SLOTS: PublicFileSlot[] = [
  {
    key: 'roadmap_starter_md',
    label: 'ROADMAP starter',
    defaultPath: '/downloads/resources/ROADMAP-starter.md',
    usedOn: ['/resources/templates'],
    accept: '.md,.markdown,text/markdown,text/plain',
  },
  {
    key: 'roadmap_example_md',
    label: 'ROADMAP example (fictional)',
    defaultPath: '/downloads/resources/examples/ROADMAP-example.md',
    usedOn: ['/resources/templates'],
    accept: '.md,.markdown,text/markdown,text/plain',
  },
  {
    key: 'project_rules_starter_md',
    label: 'Project Rules starter',
    defaultPath: '/downloads/resources/PROJECT-RULES-starter.md',
    usedOn: ['/resources/templates'],
    accept: '.md,.markdown,text/markdown,text/plain',
  },
  {
    key: 'project_rules_example_md',
    label: 'Project Rules example (fictional)',
    defaultPath: '/downloads/resources/examples/PROJECT-RULES-example.md',
    usedOn: ['/resources/templates'],
    accept: '.md,.markdown,text/markdown,text/plain',
  },
  {
    key: 'before_you_accept_done_md',
    label: 'Before You Accept Done (Markdown)',
    defaultPath: '/downloads/resources/BEFORE-YOU-ACCEPT-DONE.md',
    usedOn: ['/resources/templates'],
    accept: '.md,.markdown,text/markdown,text/plain',
  },
];

/** PDF / document slots — managed under Media. */
export const SITE_DOCUMENT_SLOTS: PublicFileSlot[] = [
  {
    key: 'builder_quick_reference_pdf',
    label: 'Builder Quick Reference (PDF)',
    defaultPath: '/downloads/resources/Builder_Quick_Reference.pdf',
    usedOn: ['/resources/builder-quick-reference'],
    accept: '.pdf,application/pdf',
  },
  {
    key: 'before_you_accept_done_pdf',
    label: 'Before You Accept Done (PDF)',
    defaultPath: '/downloads/resources/Before_You_Accept_Done.pdf',
    usedOn: ['/resources/templates', '/resources/builder-quick-reference'],
    accept: '.pdf,application/pdf',
  },
  {
    key: 'starter_kit_pdf',
    label: 'Free Starter Kit (PDF)',
    defaultPath: '/downloads/I-Call-BS-Free-Starter-Kit.pdf',
    usedOn: ['/free/thanks', '/free-kit'],
    accept: '.pdf,application/pdf',
  },
];

/** @deprecated Use TEMPLATE_FILE_SLOTS + SITE_DOCUMENT_SLOTS. */
export type PublicDownloadSlot = PublicFileSlot;
export const PUBLIC_DOWNLOAD_SLOTS: PublicFileSlot[] = [...TEMPLATE_FILE_SLOTS, ...SITE_DOCUMENT_SLOTS];

export const PUBLIC_SURFACES: PublicSurface[] = [
  {
    id: 'builder-quick-reference',
    title: 'Builder Quick Reference',
    path: '/resources/builder-quick-reference',
    kind: 'resource_page',
    editVia: 'media',
    adminPath: '/admin/media',
    notes: 'Layout in code. PDF lives under Media → Docs.',
  },
  {
    id: 'templates',
    title: 'Templates',
    path: '/resources/templates',
    kind: 'resource_page',
    editVia: 'templates_admin',
    adminPath: '/admin/templates',
    notes: 'Public page /resources/templates. Starter Markdown edited under Content → Templates.',
  },
  {
    id: 'tools-and-updates',
    title: 'Tools & Updates',
    path: '/resources/tools-and-updates',
    kind: 'resource_page',
    editVia: 'code',
    notes: 'Tools by job: content in tools-content.json; studio editor still planned.',
  },
  {
    id: 'book-updates',
    title: 'Book Updates & Corrections',
    path: '/book/updates',
    kind: 'resource_page',
    editVia: 'admin_editor',
    adminPath: '/admin/public-site/book-updates',
    notes: 'Publish real correction entries here. Empty until you add one.',
  },
  {
    id: 'literacy-check',
    title: 'Vibe Coding Literacy Check',
    path: '/resources/vibe-coding-literacy-check',
    kind: 'interactive',
    editVia: 'code',
    notes: 'Quiz copy in src/literacy/quiz-content.json (studio editor planned).',
  },
  {
    id: 'resources-library',
    title: 'Resources library',
    path: '/resources',
    kind: 'brand_page',
    editVia: 'brand_draft',
    notes: 'Brand / CMS library cards.',
  },
  {
    id: 'free-kit',
    title: 'Free Starter Kit',
    path: '/free',
    kind: 'funnel',
    editVia: 'cms_or_code',
    notes: 'Kit landing may be CMS homepage/kit content or hardcoded fallback.',
  },
  {
    id: 'free-thanks',
    title: 'Kit thank-you',
    path: '/free/thanks',
    kind: 'funnel',
    editVia: 'media',
    adminPath: '/admin/media',
    notes: 'Kit PDF under Media → Docs.',
  },
  {
    id: 'buy-thanks',
    title: 'Purchase thank-you',
    path: '/buy/thanks',
    kind: 'funnel',
    editVia: 'code',
  },
  {
    id: 'contact',
    title: 'Contact',
    path: '/contact',
    kind: 'brand_page',
    editVia: 'cms_or_code',
    adminPath: '/admin/pages',
  },
  {
    id: 'faq',
    title: 'FAQ',
    path: '/faq',
    kind: 'brand_page',
    editVia: 'code',
    adminPath: '/admin/public-site',
    notes: 'Listed under Pages. Accordion copy in src/lib/site/faqItems.ts',
  },
  {
    id: 'updates-signup',
    title: 'Updates signup',
    path: '/updates',
    kind: 'funnel',
    editVia: 'code',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    path: '/privacy',
    kind: 'legal',
    editVia: 'code',
    adminPath: '/admin/public-site',
    notes: 'Copy in src/pages/privacyPolicy.ts',
  },
  {
    id: 'terms',
    title: 'Terms',
    path: '/terms',
    kind: 'legal',
    editVia: 'code',
    adminPath: '/admin/public-site',
    notes: 'Copy in src/pages/termsOfUse.ts',
  },
  {
    id: 'refunds',
    title: 'Refunds',
    path: '/refunds',
    kind: 'legal',
    editVia: 'code',
    adminPath: '/admin/public-site',
    notes: 'Copy in src/pages/refundPolicy.ts',
  },
  {
    id: 'copyright',
    title: 'Copyright',
    path: '/copyright',
    kind: 'legal',
    editVia: 'code',
    adminPath: '/admin/public-site',
    notes: 'Copy in src/pages/copyrightPolicy.ts. Listed under Pages.',
  },
];

export function defaultDownloadMap(): Record<string, string> {
  return Object.fromEntries(PUBLIC_DOWNLOAD_SLOTS.map((s) => [s.key, s.defaultPath]));
}
