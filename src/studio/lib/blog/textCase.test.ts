import { describe, expect, it } from 'vitest';
import { applyTextCase } from './textCase';

describe('applyTextCase', () => {
  it('makes uppercase, lowercase, title case, and sentence case', () => {
    expect(applyTextCase('Explore Before committing', 'uppercase')).toBe('EXPLORE BEFORE COMMITTING');
    expect(applyTextCase('EXPLORE BEFORE COMMITTING', 'lowercase')).toBe('explore before committing');
    expect(applyTextCase('explore before committing', 'title')).toBe('Explore Before Committing');
    expect(applyTextCase('explore the direction. then commit.', 'sentence')).toBe(
      'Explore the direction. Then commit.',
    );
  });
});
