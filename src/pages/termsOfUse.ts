import type { LegalSection } from './legalOperator';
import {
  LEGAL_ADDRESS,
  LEGAL_CONTACT_PATH,
  LEGAL_FORMATION_STATE,
  LEGAL_OPERATOR,
  LEGAL_ORIGIN,
  LEGAL_SITE,
  LEGAL_VENUE_COUNTY,
  LEGAL_VENUE_STATE,
} from './legalOperator';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      `These terms cover ${LEGAL_SITE} (${LEGAL_ORIGIN}), operated by ${LEGAL_OPERATOR}, ${LEGAL_ADDRESS}. By using the site, downloading the starter kit, or buying the book, you agree to them.`,
      `Privacy is described separately at ${LEGAL_ORIGIN}/privacy. Refunds for the digital book are described at ${LEGAL_ORIGIN}/refunds.`,
    ],
  },
  {
    heading: 'The site',
    paragraphs: [
      'You may read the public pages for your own use. Do not try to break the site, scrape it in a way that harms other visitors, or use it to send spam.',
      'Studio and admin tools are for approved staff only. Public visitors have no right to those accounts.',
    ],
  },
  {
    heading: 'The kit and the book',
    paragraphs: [
      'The starter kit is a free PDF. The complete book is a $17 digital PDF sold through Stripe when checkout is configured. There is no EPUB in this edition, and there is no physical copy.',
      'Your purchase or kit download is a personal use license. You may keep your copy and use what you learn. You may not resell the files, share the full book or kit publicly, post them on file-sharing sites, or present them as your own work.',
      `If a download fails, see the Refunds page. Sales of the book are otherwise final: ${LEGAL_ORIGIN}/refunds.`,
    ],
  },
  {
    heading: 'Email',
    paragraphs: [
      'Kit signup includes a few emails about building with AI and the complete book. You can unsubscribe with the link in those emails. Purchase receipts and download messages are transactional and can still arrive after you leave a marketing list.',
    ],
  },
  {
    heading: 'No professional advice',
    paragraphs: [
      'The book, kit, and site are educational. They are not legal, financial, medical, or professional advice. Tools and examples change. Check results before you rely on them.',
    ],
  },
  {
    heading: 'Availability',
    paragraphs: [
      'We try to keep the site and download links working. We do not promise uninterrupted access, and we may update or remove pages.',
    ],
  },
  {
    heading: 'Liability',
    paragraphs: [
      `To the extent the law allows, ${LEGAL_OPERATOR} is not liable for indirect, incidental, or consequential damages, or for lost profits, arising from use of the site, the kit, or the book. For a paid purchase, any liability that cannot be disclaimed is limited to the amount you paid for that purchase.`,
    ],
  },
  {
    heading: 'Governing law',
    paragraphs: [
      `These Terms are governed by the laws of the State of ${LEGAL_FORMATION_STATE}, without regard to its conflict-of-law rules.`,
    ],
  },
  {
    heading: 'Venue',
    paragraphs: [
      `Any lawsuit or legal proceeding arising out of or relating to these Terms or your use of VettaJimale.tech must be brought exclusively in the state or federal courts located in ${LEGAL_VENUE_COUNTY}, ${LEGAL_VENUE_STATE}. You and ${LEGAL_OPERATOR} consent to the personal jurisdiction of those courts and waive any objection that those courts are an inconvenient forum.`,
    ],
  },
  {
    heading: 'Changes and contact',
    paragraphs: [
      `If these terms change in a material way, this page will be updated. Questions: ${LEGAL_ORIGIN}${LEGAL_CONTACT_PATH}.`,
    ],
  },
];
