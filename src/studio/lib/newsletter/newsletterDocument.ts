/** Parse / normalize newsletter issue block documents. */

import { nanoid } from 'nanoid';
import { parseBlogBlocks } from '../blog/useBlogEditorStore';
import type { BlogBlock } from '../blog/blogBlockTypes';
import { serializeNewsletterEmail } from '../../../lib/newsletter/serializeNewsletterEmail';

export type NewsletterDocument = {
  format: 'blocks';
  blocks: BlogBlock[];
};

export function emptyNewsletterDocument(): NewsletterDocument {
  return {
    format: 'blocks',
    blocks: [{ id: nanoid(), type: 'paragraph', data: { text: '<p></p>' } }],
  };
}

export function parseNewsletterDocument(raw: unknown): NewsletterDocument {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyNewsletterDocument();
  }
  const o = raw as Record<string, unknown>;
  const blocks = parseBlogBlocks(o.blocks);
  if (!blocks.length) return emptyNewsletterDocument();
  return { format: 'blocks', blocks };
}

export function compileNewsletterDocument(doc: NewsletterDocument): {
  document: NewsletterDocument;
  bodyHtml: string;
  bodyText: string;
} {
  const normalized = parseNewsletterDocument(doc);
  const { html, text } = serializeNewsletterEmail(normalized.blocks);
  return {
    document: normalized,
    bodyHtml: html,
    bodyText: text,
  };
}

export function documentFromBlocks(blocks: BlogBlock[]): NewsletterDocument {
  return parseNewsletterDocument({ format: 'blocks', blocks });
}
