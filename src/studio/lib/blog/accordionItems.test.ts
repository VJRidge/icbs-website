import { describe, expect, it } from 'vitest';
import {
  ACCORDION_COLOR_DEFAULTS,
  HOW_I_USE_AI_ITEMS,
  accordionRowNumber,
  readAccordionColors,
  readAccordionItems,
} from './accordionItems';

describe('accordionItems', () => {
  it('numbers rows with a leading zero and keeps the How I Use AI copy', () => {
    expect(accordionRowNumber(0)).toBe('01');
    expect(accordionRowNumber(5)).toBe('06');
    expect(HOW_I_USE_AI_ITEMS).toHaveLength(6);
    expect(HOW_I_USE_AI_ITEMS[0]?.title).toBe('Websites');
    expect(HOW_I_USE_AI_ITEMS[0]?.bullets).toHaveLength(4);
    expect(HOW_I_USE_AI_ITEMS[0]?.open).toBe(true);
  });

  it('reads title, intro, and bullets, and falls back to html as intro', () => {
    const items = readAccordionItems({
      items: [
        { title: 'Video', intro: 'Short-form.', bullets: ['Captions', ''] },
        { title: 'Legacy', html: '<p>Old body</p>' },
      ],
    });
    expect(items[0]).toMatchObject({ title: 'Video', intro: 'Short-form.', bullets: ['Captions'] });
    expect(items[1]?.intro).toBe('Old body');
    expect(readAccordionItems({ items: [] })[0]?.title).toBe('Websites');
    expect(readAccordionColors({}).toggleColor).toBe(ACCORDION_COLOR_DEFAULTS.toggleColor);
    expect(readAccordionColors({ chipColor: '#2d4a3a' }).chipColor).toBe('#2d4a3a');
  });
});
