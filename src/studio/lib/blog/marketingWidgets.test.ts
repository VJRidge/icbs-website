import { describe, expect, it } from 'vitest';
import { readDualButton, readQuoteCards, readSkillItems, readTickerItems } from './marketingWidgets';

describe('marketingWidgets', () => {
  it('keeps ticker copy and drops blank rows', () => {
    expect(readTickerItems({ items: [{ text: 'One' }, { text: '  ' }, { text: 'Two', url: '/blog' }] })).toEqual([
      { text: 'One', url: '' },
      { text: 'Two', url: '/blog' },
    ]);
  });

  it('clamps skill bars between 0 and 100', () => {
    const [first] = readSkillItems({ items: [{ label: 'CSS', value: 140, color: '#111' }] });
    expect(first).toEqual({ label: 'CSS', value: 100, color: '#111' });
  });

  it('reads a dual button pair', () => {
    const pair = readDualButton({ leftText: 'View demo', rightText: 'Order now', divider: 'OR' });
    expect(pair.leftText).toBe('View demo');
    expect(pair.rightText).toBe('Order now');
    expect(pair.divider).toBe('OR');
  });

  it('turns a single testimonial into one card', () => {
    const cards = readQuoteCards({ quote: 'It works.', name: 'Ada', role: 'Editor', rating: 4 });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.name).toBe('Ada');
    expect(cards[0]?.rating).toBe(4);
  });
});
