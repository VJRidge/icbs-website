import { describe, expect, it } from 'vitest';
import { buildCustomContentDraft, buildCustomContentPublish, isMissingCustomContentSchema, publicPathForCustomContent } from './customContentDraft';

describe('buildCustomContentDraft', () => {
  const base = {
    typeId: '11111111-1111-4111-8111-111111111111',
    schemaVersion: 1,
    title: 'Cursor Composer',
    authorId: '22222222-2222-4222-8222-222222222222',
  };

  it('stores tool reviews as custom records, not pages or posts', () => {
    const row = buildCustomContentDraft({
      ...base,
      typeKey: 'tool_review',
      fields: { verdict: 'Early notes' },
    });
    expect(row.kind).toBe('custom');
    expect(row.status).toBe('draft');
    expect(row.content_type_id).toBe(base.typeId);
    expect(row.structured_fields).toEqual({ verdict: 'Early notes' });
    expect(row.slug).toBe('cursor-composer');
  });

  it('rejects page and post keys so the existing editors stay isolated', () => {
    expect(() => buildCustomContentDraft({ ...base, typeKey: 'page' })).toThrow(/unknown/i);
    expect(() => buildCustomContentDraft({ ...base, typeKey: 'post' })).toThrow(/unknown/i);
  });

  it('rejects unknown structured fields in a draft', () => {
    expect(() =>
      buildCustomContentDraft({
        ...base,
        typeKey: 'tool_review',
        fields: { accidental: true },
      }),
    ).toThrow(/invalid/i);
  });
});

describe('isMissingCustomContentSchema', () => {
  it('detects an unapplied content-type registry', () => {
    expect(isMissingCustomContentSchema({ code: 'PGRST205', message: "Could not find the table 'public.content_types' in the schema cache" })).toBe(true);
    expect(isMissingCustomContentSchema({ code: '22P02', message: 'invalid input value for enum content_kind: "custom"' })).toBe(true);
    expect(isMissingCustomContentSchema({ code: '42501', message: 'permission denied' })).toBe(false);
  });
});

describe('buildCustomContentPublish', () => {
  const completeReview = {
    typeId: '11111111-1111-4111-8111-111111111111',
    schemaVersion: 1,
    title: 'Cursor Composer',
    authorId: '22222222-2222-4222-8222-222222222222',
    typeKey: 'tool_review',
    fields: {
      pricing_checked_date: '2026-10-05',
      platform_tested: 'Web',
      what_was_tried: 'Built a complete test project.',
      limitations: 'No offline mode.',
      affiliate_disclosure: true,
      verdict: 'Useful for rapid prototypes.',
    },
  };

  it('publishes a complete tool review to /reviews/:slug with a frozen snapshot', () => {
    expect(publicPathForCustomContent('tool_review', 'Cursor Composer')).toBe('/reviews/cursor-composer');
    const row = buildCustomContentPublish(completeReview);
    expect(row.status).toBe('published');
    expect(row.published_document.format).toBe('structured-content');
    expect(row.published_document._structured.public_path).toBe('/reviews/cursor-composer');
    expect(row.published_document._structured.fields.verdict).toBe('Useful for rapid prototypes.');
  });

  it('does not publish incomplete reviews or unpublished custom types', () => {
    expect(() => buildCustomContentPublish({ ...completeReview, fields: { verdict: 'Nope' } })).toThrow(/invalid|required/i);
    expect(() => buildCustomContentPublish({ ...completeReview, typeKey: 'event' })).toThrow(/not enabled/i);
    expect(publicPathForCustomContent('page', 'about')).toBeNull();
    expect(publicPathForCustomContent('resource', 'guide')).toBeNull();
  });
});
