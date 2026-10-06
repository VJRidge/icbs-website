import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CUSTOM_CONTENT_TYPES, validateCustomContentFields } from './customContentTypes';

describe('custom content type registry', () => {
  it('keeps core pages and posts outside the schema-driven registry', () => {
    expect(Object.keys(CUSTOM_CONTENT_TYPES)).not.toContain('page');
    expect(Object.keys(CUSTOM_CONTENT_TYPES)).not.toContain('post');
  });

  it('includes the five approved controlled content types', () => {
    expect(Object.keys(CUSTOM_CONTENT_TYPES).sort()).toEqual(
      ['event', 'interview', 'resource', 'sponsor_profile', 'tool_review'].sort(),
    );
  });

  it('keeps TypeScript field keys aligned with the SQL registry seed', () => {
    const sql = readFileSync(new URL('../../../supabase/migrations/20261010_phase3_structured_content.sql', import.meta.url), 'utf8');
    const seeded: Record<string, string[]> = {};
    for (const match of sql.matchAll(/\('(resource|tool_review|event|interview|sponsor_profile)', '([a-z_]+)', '/g)) {
      const kind = match[1];
      const key = match[2];
      seeded[kind] ??= [];
      seeded[kind].push(key);
    }
    for (const kind of Object.keys(CUSTOM_CONTENT_TYPES) as Array<keyof typeof CUSTOM_CONTENT_TYPES>) {
      const schema = z.toJSONSchema(CUSTOM_CONTENT_TYPES[kind].fields);
      const tsKeys = Object.keys(schema.properties ?? {}).sort();
      expect(tsKeys).toEqual([...(seeded[kind] ?? [])].sort());
    }
  });
});

describe('validateCustomContentFields', () => {
  it('accepts a complete tool review editorial record', () => {
    const result = validateCustomContentFields('tool_review', {
      pricing_checked_date: '2026-10-05',
      platform_tested: 'Web',
      what_was_tried: 'Built and exported a complete test project.',
      limitations: 'No offline mode.',
      affiliate_disclosure: true,
      verdict: 'Useful for rapid prototypes.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a tool review without its editorial evidence fields', () => {
    const result = validateCustomContentFields('tool_review', { verdict: 'Good.' });
    expect(result.success).toBe(false);
  });

  it('allows incomplete drafts while still rejecting unknown fields', () => {
    expect(validateCustomContentFields('tool_review', { verdict: 'Early notes' }, 'draft').success).toBe(true);
    expect(validateCustomContentFields('tool_review', { typo_field: 'No' }, 'draft').success).toBe(false);
  });

  it('rejects undeclared fields instead of silently storing an accidental shape', () => {
    const result = validateCustomContentFields('resource', {
      resource_type: 'guide',
      download_url: 'https://example.com/guide.pdf',
      accidental_field: 'typo',
    });
    expect(result.success).toBe(false);
  });

  it('fails closed for unknown runtime type keys and whitespace-only evidence', () => {
    expect(validateCustomContentFields('unknown_type', {}).success).toBe(false);
    expect(
      validateCustomContentFields('tool_review', {
        pricing_checked_date: '2026-10-05',
        platform_tested: ' ',
        what_was_tried: 'Tested',
        limitations: 'None found',
        affiliate_disclosure: true,
        verdict: 'Useful',
      }).success,
    ).toBe(false);
  });

  it('requires affiliate disclosure to be affirmed on publish', () => {
    expect(
      validateCustomContentFields('tool_review', {
        pricing_checked_date: '2026-10-05',
        platform_tested: 'Web',
        what_was_tried: 'Tested',
        limitations: 'None',
        affiliate_disclosure: false,
        verdict: 'Useful',
      }).success,
    ).toBe(false);
  });

  it('rejects events that end before they start', () => {
    expect(
      validateCustomContentFields('event', {
        starts_at: '2026-10-06T15:00:00-04:00',
        ends_at: '2026-10-06T14:00:00-04:00',
        timezone: 'America/New_York',
      }).success,
    ).toBe(false);
  });

  it('rejects non-web URL schemes', () => {
    expect(
      validateCustomContentFields('resource', {
        resource_type: 'guide',
        download_url: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });

  it('accepts the remaining controlled types at publish time', () => {
    expect(
      validateCustomContentFields('event', {
        starts_at: '2026-10-06T15:00:00-04:00',
        timezone: 'America/New_York',
      }).success,
    ).toBe(true);
    expect(
      validateCustomContentFields('interview', {
        interviewee_name: 'Ada Lovelace',
        interview_date: '2026-09-01',
      }).success,
    ).toBe(true);
    expect(
      validateCustomContentFields('sponsor_profile', {
        organization_name: 'CultureTech',
        website_url: 'https://example.com',
        disclosure_text: 'This is a sponsored relationship.',
      }).success,
    ).toBe(true);
  });
});
