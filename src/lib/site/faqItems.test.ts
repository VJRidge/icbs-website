import { describe, expect, it } from 'vitest';
import { FAQ_ITEMS, faqItemById, requiredFaqIds } from './faqItems';

describe('faqItems', () => {
  it('includes the five kit questions in order', () => {
    expect(requiredFaqIds()).toEqual([
      'what-will-i-receive',
      'do-i-need-to-buy-the-book',
      'do-i-need-to-be-a-developer',
      'what-if-the-file-does-not-open',
      'will-i-receive-emails',
    ]);
    expect(FAQ_ITEMS.slice(0, 5).map((item) => item.id)).toEqual(requiredFaqIds());
    expect(faqItemById('what-will-i-receive')?.answer).toMatch(/downloadable PDF/i);
    expect(faqItemById('do-i-need-to-buy-the-book')?.answer).toMatch(/kit is free/i);
    expect(faqItemById('do-i-need-to-be-a-developer')?.answer).toMatch(/read carefully/i);
    expect(faqItemById('will-i-receive-emails')?.answer).toMatch(/unsubscribe/i);
    expect(faqItemById('will-i-receive-emails')?.answer).toMatch(/thank-you page/i);
  });

  it('sends support to the contact page, not a placeholder inbox', () => {
    const stuck = faqItemById('what-if-the-file-does-not-open');
    expect(stuck?.links?.some((link) => link.href === '/contact')).toBe(true);
    expect(FAQ_ITEMS.some((item) => /\[support/i.test(item.answer))).toBe(false);
  });

  it('adds honest extras already true on the site', () => {
    expect(faqItemById('kit-vs-book')?.answer).toMatch(/complete book/i);
    expect(faqItemById('book-format')?.answer).toMatch(/\$17/);
    expect(faqItemById('refunds')?.links?.some((link) => link.href === '/refunds')).toBe(true);
    expect(faqItemById('refunds')?.answer).toMatch(/all sales are final/i);
    expect(faqItemById('refunds')?.answer).toMatch(/fix|replace/i);
    expect(faqItemById('how-do-i-get-help')?.links?.some((link) => link.href === '/contact')).toBe(true);
  });
});
