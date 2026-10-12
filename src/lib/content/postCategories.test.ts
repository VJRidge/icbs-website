import { describe, expect, it } from 'vitest';
import {
  normalizeCategoryLinks,
  toggleAdditionalCategory,
  withPrimaryCategory,
} from './postCategories';

describe('postCategories', () => {
  it('keeps a single primary and promotes first when none set', () => {
    expect(
      normalizeCategoryLinks([
        { taxonomyId: 'a', isPrimary: false },
        { taxonomyId: 'b', isPrimary: false },
      ]),
    ).toEqual([
      { taxonomyId: 'a', isPrimary: true },
      { taxonomyId: 'b', isPrimary: false },
    ]);
    expect(
      normalizeCategoryLinks([
        { taxonomyId: 'a', isPrimary: true },
        { taxonomyId: 'b', isPrimary: true },
      ]),
    ).toEqual([
      { taxonomyId: 'a', isPrimary: true },
      { taxonomyId: 'b', isPrimary: false },
    ]);
  });

  it('sets primary and adds the category when missing', () => {
    expect(withPrimaryCategory([{ taxonomyId: 'a', isPrimary: true }], 'b')).toEqual([
      { taxonomyId: 'b', isPrimary: true },
      { taxonomyId: 'a', isPrimary: false },
    ]);
  });

  it('toggles additional categories without clearing primary', () => {
    const base = [
      { taxonomyId: 'a', isPrimary: true },
      { taxonomyId: 'b', isPrimary: false },
    ];
    expect(toggleAdditionalCategory(base, 'c', true)).toEqual([
      { taxonomyId: 'a', isPrimary: true },
      { taxonomyId: 'b', isPrimary: false },
      { taxonomyId: 'c', isPrimary: false },
    ]);
    expect(toggleAdditionalCategory(base, 'b', false)).toEqual([
      { taxonomyId: 'a', isPrimary: true },
    ]);
  });
});
