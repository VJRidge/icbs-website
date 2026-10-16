import type { LegalSection } from './legalOperator';
import { LEGAL_CONTACT_PATH, LEGAL_ORIGIN } from './legalOperator';

export const REFUND_SECTIONS: LegalSection[] = [
  {
    heading: 'All sales are final',
    paragraphs: [
      'I Call BS: AI Vibe Coding Myths Dispelled is a $17 digital PDF. After payment, the file is delivered right away. A download cannot be returned, so all sales are final.',
      'That is why the free starter kit exists. Read it first. If the writing works for you, the book will too. The starter kit is free, so there is nothing to refund on the kit.',
    ],
  },
  {
    heading: 'If the file does not arrive or will not open',
    paragraphs: [
      `All sales final does not mean you are on your own. Use the contact page (${LEGAL_ORIGIN}${LEGAL_CONTACT_PATH}) if the download link does not work, the file will not open, you never received the receipt or download email, or you were charged and did not receive the book.`,
      'These issues will be fixed. Include the email address used at checkout and, if you have it, the order number. We replace a broken or missing download. We do not reverse a completed sale because you changed your mind after the file was delivered.',
    ],
  },
  {
    heading: 'Questions before you buy',
    paragraphs: [
      `Not sure the book is right for you? Ask on the contact page before purchasing: ${LEGAL_ORIGIN}${LEGAL_CONTACT_PATH}.`,
    ],
  },
];
