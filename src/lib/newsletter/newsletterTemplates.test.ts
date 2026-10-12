import { describe, expect, it } from 'vitest';
import {
  NEWSLETTER_TEMPLATE_KIND,
  cloneNewsletterTemplateDocument,
  documentFromIssueForTemplate,
  starterNewsletterTemplates,
} from './newsletterTemplates';

describe('starterNewsletterTemplates', () => {
  it('returns three starters with unique ids and blocks', () => {
    const starters = starterNewsletterTemplates();
    expect(NEWSLETTER_TEMPLATE_KIND).toBe('newsletter');
    expect(starters).toHaveLength(3);
    const ids = new Set(starters.map((s) => s.id));
    expect(ids.size).toBe(3);
    for (const s of starters) {
      expect(s.document.format).toBe('blocks');
      expect(s.document.blocks.length).toBeGreaterThan(0);
      expect(s.document.subject).toBeTruthy();
    }
  });
});

describe('cloneNewsletterTemplateDocument', () => {
  it('assigns fresh block ids', () => {
    const starter = starterNewsletterTemplates()[0];
    const cloned = cloneNewsletterTemplateDocument(starter.document);
    expect(cloned.blocks).toHaveLength(starter.document.blocks.length);
    expect(cloned.blocks[0].id).not.toBe(starter.document.blocks[0].id);
    expect(cloned.subject).toBe(starter.document.subject);
  });
});

describe('documentFromIssueForTemplate', () => {
  it('copies blocks and subject', () => {
    const doc = documentFromIssueForTemplate({
      subject: 'Hello',
      previewText: 'Preview',
      blocks: [{ id: 'old', type: 'heading', data: { text: 'Hi', level: 1 } }],
    });
    expect(doc.subject).toBe('Hello');
    expect(doc.preview_text).toBe('Preview');
    expect(doc.blocks[0].type).toBe('heading');
    expect(doc.blocks[0].id).not.toBe('old');
  });
});
