import {
  LEGAL_ADDRESS,
  LEGAL_CONTACT_PATH,
  LEGAL_EFFECTIVE,
  LEGAL_FORMATION_STATE,
  LEGAL_OPERATOR,
  LEGAL_ORIGIN,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SITE,
  type LegalSection,
} from './legalOperator';

export type PrivacySection = LegalSection;

export const PRIVACY_EFFECTIVE = LEGAL_EFFECTIVE;

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    heading: 'Who is responsible',
    paragraphs: [
      `${LEGAL_SITE} is operated by ${LEGAL_OPERATOR}, ${LEGAL_ADDRESS}. This policy describes how this website handles information about visitors, kit signups, buyers, and people who write in.`,
      `Questions about this policy, or a request to see, correct, or delete your information, go to ${LEGAL_PRIVACY_EMAIL} with the subject Privacy Request, or through the contact page: ${LEGAL_ORIGIN}${LEGAL_CONTACT_PATH}. We answer those requests as soon as we reasonably can.`,
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: [
      'Free starter kit signup: first name, email address, optional marketing tags from the link you used (UTM fields), the time you consented, and an unsubscribe token. The PDF is also available as a public download on the thank-you page. Signing up is how you ask for the kit emails.',
      'Contact form: name, email address, and your message. That message is emailed to the site operator and stored as a form submission so it is not lost if email delivery fails.',
      'Lead-capture forms (when a published form is live): the fields on that form, plus whether you agreed to marketing email. We do not take a newsletter subscription from a form unless that consent is present.',
      'Purchases of the $17 digital book: email address, payment amount and currency, Stripe checkout identifiers, and fulfillment status. Stripe handles the card. We do not store full card numbers.',
      'Studio / admin accounts (staff only): email, display name, and approval status. Public visitors cannot open the studio.',
    ],
  },
  {
    heading: 'Email',
    paragraphs: [
      'Kit signup includes a few emails about building with AI and the complete book. Every kit email includes an unsubscribe link. One-click unsubscribe is supported where the mail app offers it.',
      'The public newsletter (“Stay curious”) is not open yet. When it opens, it will use a separate contacts list with its own unsubscribe path.',
      'Transactional mail (kit download link, purchase receipt, replies to a contact message) is sent because you asked for that action.',
    ],
  },
  {
    heading: 'Analytics',
    paragraphs: [
      'The site records first-party events such as page views and form starts. Those records can include the page path, referring site, a random session id kept in your browser session storage, UTM parameters, user-agent, and a hashed form of your IP address. The hash is not reversible from this site’s database.',
      'This is not a third-party ad pixel. There is no sale of personal information, and no Google Analytics or Meta Pixel on this codebase.',
    ],
  },
  {
    heading: 'Payments',
    paragraphs: [
      'Checkout for the book uses Stripe when keys are configured. Stripe receives the information needed to take payment. After a successful payment we record the purchase and send a download message to the email Stripe provides. That receipt is transactional. Optional kit or updates email is separate: we only add a buyer to the kit mailing list if they opt in at checkout.',
      'Refunds for the digital book are described on the Refunds page: all sales are final because the file is delivered immediately. A broken or missing download will be replaced.',
    ],
  },
  {
    heading: 'Who processes data for us',
    paragraphs: [
      'Hosting and delivery of the website: Vercel.',
      'Database, authentication, and file storage: Supabase. The ICallBS project is in Canada (ca-central-1).',
      'Transactional and list email: Resend. Delivery events (for example bounced or complained) may be used to stop further mail.',
      'Payments: Stripe.',
      'Studio signup bot checks: Cloudflare Turnstile, when those keys are set.',
      'The public site is not intended to load Google Fonts or other third-party font CDNs. Typefaces fall back to fonts already on your device.',
    ],
  },
  {
    heading: 'Cookies and similar storage',
    paragraphs: [
      'The public site does not set advertising cookies. A random analytics session id is stored in session storage for the length of your browser session.',
      'If you sign in to the studio, Supabase Auth uses cookies or local storage needed to keep that session.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Kit subscribers and marketing contacts stay until you unsubscribe or ask to be deleted, except records we must keep for a completed purchase or a legal obligation.',
      'Contact messages and purchase rows are kept as business records of what was asked and what was sold.',
      'Analytics events are kept to understand the site. They are not used to build a public profile of you.',
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      `You can unsubscribe from kit mail with the link in the email. You can ask for access, correction, or deletion of the information we hold by writing to ${LEGAL_PRIVACY_EMAIL} (subject Privacy Request) or through the contact page. We may need enough detail to find your email in the lists. We answer as soon as we reasonably can.`,
      `${LEGAL_OPERATOR} is a U.S. business formed in ${LEGAL_FORMATION_STATE}. Commercial email includes the Brooklyn mailing address in the footer (CAN-SPAM). If we email people in Canada, Canadian anti-spam rules (CASL) also require consent and a working unsubscribe. Personal information of Canadian residents is treated with PIPEDA-level care even though the operator is not a Canadian company. The database is hosted in Canada (Supabase ca-central-1).`,
      'If you are in the EEA or UK, you may also have rights of access, correction, deletion, restriction, and objection. Use the contact page or the privacy email. We do not operate an EU establishment and have not appointed a GDPR representative.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'This site is written for adults buying or downloading digital materials about building with AI. It is not directed at children under 13, and we do not knowingly collect information from them.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      `This version is dated ${PRIVACY_EFFECTIVE}. If the way the site collects or uses information changes in a material way, this page will be updated and the email list will be notified before the change takes effect.`,
    ],
  },
];
