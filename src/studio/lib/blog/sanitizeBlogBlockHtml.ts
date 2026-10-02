import { sanitizeOpEdHtml } from '../sanitizeOpEdHtml';
import type { BlogBlock } from './blogBlockTypes';

/** Sanitize rich-text HTML stored inside blog/CMS blocks before render or persist. */
export function sanitizeBlogBlockHtml(dirty: string): string {
  if (!dirty) return '';
  return sanitizeOpEdHtml(dirty);
}

/**
 * Walk a block tree and sanitize every HTML-bearing field
 * (paragraph text, tabs/accordion bodies). Safe to call on load and save.
 */
export function sanitizeBlogBlocksDeep(blocks: BlogBlock[]): BlogBlock[] {
  return blocks.map((block) => {
    const data: Record<string, unknown> = { ...block.data };

    if (block.type === 'paragraph' && typeof data.text === 'string') {
      data.text = sanitizeBlogBlockHtml(data.text);
    }

    if (block.type === 'tabs' && Array.isArray(data.tabs)) {
      data.tabs = data.tabs.map((tab) => {
        if (!tab || typeof tab !== 'object') return tab;
        const t = tab as Record<string, unknown>;
        return {
          ...t,
          html: typeof t.html === 'string' ? sanitizeBlogBlockHtml(t.html) : t.html,
        };
      });
    }

    if (block.type === 'accordion' && Array.isArray(data.items)) {
      data.items = data.items.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const it = item as Record<string, unknown>;
        return {
          ...it,
          html: typeof it.html === 'string' ? sanitizeBlogBlockHtml(it.html) : it.html,
        };
      });
    }

    if (block.type === 'columns' && Array.isArray(data.columns)) {
      data.columns = data.columns.map((zone) => {
        if (!zone || typeof zone !== 'object') return zone;
        const z = zone as Record<string, unknown>;
        const nested = Array.isArray(z.blocks) ? (z.blocks as BlogBlock[]) : [];
        return { ...z, blocks: sanitizeBlogBlocksDeep(nested) };
      });
    }

    return { ...block, data };
  });
}
