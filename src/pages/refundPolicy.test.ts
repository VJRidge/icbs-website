import { describe, expect, it } from 'vitest';
import { REFUND_SECTIONS } from './refundPolicy';

describe('refundPolicy', () => {
  it('keeps sales final and promises to replace a broken download', () => {
    const text = REFUND_SECTIONS.map((s) => s.paragraphs.join('\n')).join('\n');
    expect(text).toMatch(/all sales are final/i);
    expect(text).not.toMatch(/money back/i);
    expect(text).toMatch(/download/i);
    expect(text).toMatch(/will be fixed|replace/i);
    expect(text).toMatch(/\/contact/);
    expect(text).toMatch(/starter kit is free/i);
  });
});
