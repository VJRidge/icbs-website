import type { LegalSection } from './legalOperator';
import {
  LEGAL_ADDRESS,
  LEGAL_OPERATOR,
  LEGAL_ORIGIN,
  LEGAL_PRIVACY_EMAIL,
  LEGAL_SITE,
} from './legalOperator';

export const COPYRIGHT_SECTIONS: LegalSection[] = [
  {
    heading: 'Site content',
    paragraphs: [
      `Everything on ${LEGAL_SITE}, including the book I Call BS: AI Vibe Coding Myths Dispelled, the free starter kit, written pages, graphics, and logo, belongs to ${LEGAL_OPERATOR} unless otherwise noted.`,
      'What you can do: read it, keep your copy, use what you learn, and quote short passages with credit and a link back.',
      'What you cannot do: resell it, share the full book or kit publicly, post it on file-sharing sites, or present it as your own.',
      `For any use not covered here, send a request to ${LEGAL_PRIVACY_EMAIL} with the subject Copyright.`,
    ],
  },
  {
    heading: 'Reporting copyright infringement',
    paragraphs: [
      'If you believe content on this site uses your work without permission, send a written notice. Every complete notice is reviewed.',
      'The notice must include: your name, mailing address, phone number, and email address; a description of the copyrighted work you believe was copied; the exact page or link on this site where the material appears; a statement that you believe, in good faith, that the use is not authorized by you, your agent, or the law; a statement that the information in your notice is accurate and, under penalty of perjury, that you own the work or are authorized to act on the owner’s behalf; and your physical or electronic signature.',
      `Send notices to the designated copyright agent for this site: Vetta Jimale, ${LEGAL_OPERATOR}, ${LEGAL_ADDRESS}, ${LEGAL_PRIVACY_EMAIL}.`,
      'Once a complete notice is received, the material will be removed or disabled where appropriate, and you will be told what was done.',
    ],
  },
  {
    heading: 'Counter-notice',
    paragraphs: [
      'If material you posted was removed and you believe it was removed by mistake, send a counter-notice to the same address. It must include: your name, mailing address, phone number, and email address; a description of the material removed and where it appeared; a statement, under penalty of perjury, that you believe in good faith the material was removed by mistake or misidentification; a statement that you consent to the jurisdiction of the federal court in your district (or, if you are outside the U.S., any district where this operator can be found), and that you will accept service from the person who filed the original notice; and your physical or electronic signature.',
    ],
  },
  {
    heading: 'False claims',
    paragraphs: [
      'Under U.S. law, knowingly making a false claim in a notice or counter-notice can make you liable for damages. Be certain before sending one.',
      `Contact: ${LEGAL_ORIGIN}/contact or ${LEGAL_PRIVACY_EMAIL}.`,
    ],
  },
];
