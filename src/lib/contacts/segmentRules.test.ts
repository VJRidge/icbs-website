import { describe, expect, it } from 'vitest';
import {
  countMatchingContacts,
  evaluateSegment,
  normalizeSegmentDefinition,
  parseSegmentDefinition,
  type ContactForSegment,
  type SegmentDefinition,
} from './segmentRules';

const base: ContactForSegment = {
  id: 'c1',
  email: 'a@example.com',
  marketing_ok: true,
  suppressed_at: null,
  source_form_id: 'form-1',
  tagSlugs: ['newsletter', 'kit'],
  requestedLeadMagnetIds: ['lm-1'],
};

describe('normalizeSegmentDefinition / parseSegmentDefinition', () => {
  it('defaults empty rules to match all marketing-eligible contacts', () => {
    const def = parseSegmentDefinition(null);
    expect(def.match).toBe('all');
    expect(def.rules).toEqual([]);
  });

  it('normalizes known rules and drops junk', () => {
    const def = normalizeSegmentDefinition({
      match: 'any',
      rules: [
        { field: 'tag', op: 'has', value: ' Newsletter ' },
        { field: 'nope', op: 'eq', value: true },
        { field: 'marketing_ok', op: 'eq', value: true },
      ],
    });
    expect(def.match).toBe('any');
    expect(def.rules).toHaveLength(2);
    expect(def.rules[0]).toEqual({ field: 'tag', op: 'has', value: 'newsletter' });
  });
});

describe('evaluateSegment', () => {
  it('with no rules matches marketing_ok and not suppressed only', () => {
    const def: SegmentDefinition = { match: 'all', rules: [] };
    expect(evaluateSegment(base, def)).toBe(true);
    expect(
      evaluateSegment({ ...base, marketing_ok: false }, def),
    ).toBe(false);
    expect(
      evaluateSegment({ ...base, suppressed_at: '2026-01-01T00:00:00.000Z' }, def),
    ).toBe(false);
  });

  it('requires all tag/form/magnet rules when match=all', () => {
    const def: SegmentDefinition = {
      match: 'all',
      rules: [
        { field: 'tag', op: 'has', value: 'kit' },
        { field: 'lead_magnet_id', op: 'requested', value: 'lm-1' },
        { field: 'source_form_id', op: 'eq', value: 'form-1' },
      ],
    };
    expect(evaluateSegment(base, def)).toBe(true);
    expect(
      evaluateSegment({ ...base, tagSlugs: ['newsletter'] }, def),
    ).toBe(false);
  });

  it('supports not_has tag and match=any', () => {
    const def: SegmentDefinition = {
      match: 'any',
      rules: [
        { field: 'tag', op: 'has', value: 'buyer' },
        { field: 'tag', op: 'not_has', value: 'kit' },
      ],
    };
    expect(evaluateSegment(base, def)).toBe(false);
    expect(
      evaluateSegment({ ...base, tagSlugs: ['newsletter'] }, def),
    ).toBe(true);
  });
});

describe('countMatchingContacts', () => {
  it('counts without inventing rows', () => {
    const def: SegmentDefinition = {
      match: 'all',
      rules: [{ field: 'tag', op: 'has', value: 'kit' }],
    };
    expect(
      countMatchingContacts(
        [base, { ...base, id: 'c2', tagSlugs: [] }, { ...base, id: 'c3', marketing_ok: false }],
        def,
      ),
    ).toBe(1);
  });
});
