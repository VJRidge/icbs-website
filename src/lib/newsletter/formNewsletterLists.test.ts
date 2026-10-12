import { describe, expect, it } from 'vitest';
import { normalizeNewsletterListIds, toggleNewsletterListId } from './formNewsletterLists';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('formNewsletterLists', () => {
  it('keeps only unique UUID list ids', () => {
    expect(normalizeNewsletterListIds([A, 'nope', A, B, 3])).toEqual([A, B]);
    expect(normalizeNewsletterListIds(null)).toEqual([]);
  });

  it('toggles a list id on and off', () => {
    expect(toggleNewsletterListId([], A)).toEqual([A]);
    expect(toggleNewsletterListId([A, B], A)).toEqual([B]);
    expect(toggleNewsletterListId([A], 'bad')).toEqual([A]);
  });
});
