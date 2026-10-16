export type FaqLink = {
  label: string;
  href: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  links?: FaqLink[];
};

export const REQUIRED_FAQ_IDS = [
  'what-will-i-receive',
  'do-i-need-to-buy-the-book',
  'do-i-need-to-be-a-developer',
  'what-if-the-file-does-not-open',
  'will-i-receive-emails',
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-will-i-receive',
    question: 'What will I receive?',
    answer:
      'A downloadable PDF with chapter previews, prompts, checklist resources, selected lessons, and a pocket glossary.',
    links: [{ label: 'Get the free kit', href: '/free-kit' }],
  },
  {
    id: 'do-i-need-to-buy-the-book',
    question: 'Do I need to buy the book?',
    answer: 'No. The kit is free, and you can use it whether or not you purchase the complete book.',
  },
  {
    id: 'do-i-need-to-be-a-developer',
    question: 'Do I need to be a developer?',
    answer:
      'The material is written to make the process more understandable. You will still need to read carefully, adapt the prompts to your situation, and check the results.',
  },
  {
    id: 'what-if-the-file-does-not-open',
    question: 'What if the file doesn’t open?',
    answer:
      'Try downloading it again and opening it in a PDF reader. If you still need help, use the contact page.',
    links: [{ label: 'Contact', href: '/contact' }],
  },
  {
    id: 'will-i-receive-emails',
    question: 'Will I receive emails?',
    answer:
      'The kit PDF is free to download on the thank-you page. Signing up also sends a few emails about building with AI and the complete book. You can unsubscribe anytime.',
  },
  {
    id: 'kit-vs-book',
    question: 'What is the difference between the kit and the complete book?',
    answer:
      'The kit is a free starting PDF: previews, prompts, checklists, selected lessons, and a pocket glossary. The complete book — the full edition of I Call BS — goes further, with thirteen chapters, fifteen prompts, ten selected lessons, and expanded reference material.',
    links: [{ label: 'Explore the complete book', href: '/products/i-call-bs' }],
  },
  {
    id: 'book-format',
    question: 'What format is the complete book?',
    answer: 'A $17 digital PDF. There is no EPUB in this edition.',
  },
  {
    id: 'refunds',
    question: 'Can I get a refund on the book?',
    answer:
      'The book is a digital file delivered after payment. All sales are final. If the file will not open or never arrives, we will replace that download. The starter kit is free, so there is nothing to refund on the kit.',
    links: [{ label: 'Refunds', href: '/refunds' }],
  },
  {
    id: 'how-do-i-get-help',
    question: 'How do I get help?',
    answer: 'Questions about the kit, the book, or a download belong on the contact page. I read those.',
    links: [{ label: 'Contact', href: '/contact' }],
  },
];

export function requiredFaqIds(): string[] {
  return [...REQUIRED_FAQ_IDS];
}

export function faqItemById(id: string): FaqItem | undefined {
  return FAQ_ITEMS.find((item) => item.id === id);
}
