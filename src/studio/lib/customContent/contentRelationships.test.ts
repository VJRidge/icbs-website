import { describe, expect, it } from 'vitest';
import {
  assertValidRelationship,
  canAddRelationship,
  effectiveContentType,
  relationshipAllowList,
  relationshipTypesForSource,
} from './contentRelationships';

describe('contentRelationships', () => {
  it('loads allow-lists for seeded relationship keys', () => {
    expect(relationshipAllowList('related_content')?.allowedTargetTypes).toContain('resource');
    expect(relationshipAllowList('lead_magnet')?.maxTargets).toBe(3);
  });

  it('lists relationship types available for a tool review source', () => {
    const keys = relationshipTypesForSource('tool_review').map((r) => r.key);
    expect(keys).toContain('related_content');
    expect(keys).toContain('sponsored_by');
    expect(keys).not.toContain('campaign');
    expect(keys).not.toContain('replacement_asset');
  });

  it('resolves effective content type from kind + custom key', () => {
    expect(effectiveContentType({ kind: 'page' })).toBe('page');
    expect(effectiveContentType({ kind: 'post' })).toBe('post');
    expect(effectiveContentType({ kind: 'custom', contentTypeKey: 'tool_review' })).toBe('tool_review');
    expect(effectiveContentType({ kind: 'custom' })).toBeNull();
  });

  it('rejects invalid source/target pairs and self-links', () => {
    expect(() =>
      assertValidRelationship({
        relationshipType: 'related_resource',
        sourceType: 'sponsor_profile',
        targetType: 'resource',
        sourceContentId: 'a',
        targetContentId: 'b',
      }),
    ).toThrow(/source type/);

    expect(() =>
      assertValidRelationship({
        relationshipType: 'author_sponsor',
        sourceType: 'post',
        targetType: 'resource',
        sourceContentId: 'a',
        targetContentId: 'b',
      }),
    ).toThrow(/target type/);

    expect(() =>
      assertValidRelationship({
        relationshipType: 'related_resource',
        sourceType: 'post',
        targetType: 'resource',
        sourceContentId: 'a',
        targetContentId: 'a',
      }),
    ).toThrow(/itself/);
  });

  it('enforces maxTargets when provided', () => {
    expect(() =>
      assertValidRelationship({
        relationshipType: 'replacement_asset',
        sourceType: 'resource',
        targetType: 'resource',
        sourceContentId: 'a',
        targetContentId: 'b',
        existingTargetCount: 1,
      }),
    ).toThrow(/at most 1/);
  });

  it('returns ok/reason for picker without throwing', () => {
    expect(
      canAddRelationship({
        relationshipType: 'sponsored_by',
        sourceType: 'tool_review',
        targetType: 'sponsor_profile',
        sourceContentId: 'a',
        targetContentId: 'b',
        existingTargetCount: 0,
      }).ok,
    ).toBe(true);
    expect(
      canAddRelationship({
        relationshipType: 'sponsored_by',
        sourceType: 'tool_review',
        targetType: 'sponsor_profile',
        sourceContentId: 'a',
        targetContentId: 'b',
        existingTargetCount: 1,
      }),
    ).toEqual({ ok: false, reason: expect.stringMatching(/at most 1/) });
  });
});
