/** Pure newsletter email template helpers. No DB I/O. */

import { nanoid } from 'nanoid';

export const NEWSLETTER_TEMPLATE_KIND = 'newsletter' as const;

export type NewsletterTemplateBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

export type NewsletterTemplateDocument = {
  format: 'blocks';
  blocks: NewsletterTemplateBlock[];
  subject?: string;
  preview_text?: string;
  description?: string;
};

export type StarterNewsletterTemplate = {
  /** Stable id for idempotent seeding. */
  id: string;
  title: string;
  description: string;
  document: NewsletterTemplateDocument;
};

function block(
  id: string,
  type: string,
  data: Record<string, unknown>,
): NewsletterTemplateBlock {
  return { id, type, data };
}

/** Remap block ids so each issue gets unique block identities. */
export function cloneNewsletterTemplateDocument(
  raw: unknown,
): NewsletterTemplateDocument {
  const empty: NewsletterTemplateDocument = {
    format: 'blocks',
    blocks: [{ id: nanoid(), type: 'paragraph', data: { text: '<p></p>' } }],
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;
  const blocksIn = Array.isArray(o.blocks) ? o.blocks : [];
  const blocks: NewsletterTemplateBlock[] = [];
  for (const item of blocksIn) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const type = typeof b.type === 'string' ? b.type : '';
    if (!type) continue;
    const data =
      b.data && typeof b.data === 'object' && !Array.isArray(b.data)
        ? { ...(b.data as Record<string, unknown>) }
        : {};
    blocks.push({ id: nanoid(), type, data });
  }
  if (!blocks.length) return empty;
  return {
    format: 'blocks',
    blocks,
    subject: typeof o.subject === 'string' ? o.subject : undefined,
    preview_text: typeof o.preview_text === 'string' ? o.preview_text : undefined,
    description: typeof o.description === 'string' ? o.description : undefined,
  };
}

export function documentFromIssueForTemplate(opts: {
  blocks: Array<{ id: string; type: string; data?: Record<string, unknown> | null }>;
  subject: string;
  previewText: string;
}): NewsletterTemplateDocument {
  return {
    format: 'blocks',
    subject: opts.subject.trim().slice(0, 200) || 'Untitled template',
    preview_text: opts.previewText.trim().slice(0, 300),
    blocks: opts.blocks.map((b) => ({
      id: nanoid(),
      type: b.type,
      data: b.data && typeof b.data === 'object' ? { ...b.data } : {},
    })),
  };
}

/** Built-in starters (Mailchimp-style: welcome, announcement, resource). */
export function starterNewsletterTemplates(): StarterNewsletterTemplate[] {
  return [
    {
      id: 'a1111111-1111-4111-8111-111111111111',
      title: 'Welcome / onboarding',
      description: 'Hello + what to expect + primary CTA.',
      document: {
        format: 'blocks',
        description: 'Hello + what to expect + primary CTA.',
        subject: "Welcome — you're in",
        preview_text: "Here's what to expect next.",
        blocks: [
          block('w1', 'heading', { text: 'Welcome aboard', level: 1 }),
          block('w2', 'paragraph', {
            text: '<p>Thanks for joining. This list is for practical updates — no fluff.</p>',
          }),
          block('w3', 'paragraph', {
            text: '<p>In the next emails you will get tools, checklists, and clear next steps.</p>',
          }),
          block('w4', 'button', {
            label: 'Get started',
            href: 'https://icallbs.com/resources',
          }),
          block('w5', 'divider', {}),
          block('w6', 'paragraph', {
            text: '<p>You are receiving this because you signed up at I Call BS.</p>',
          }),
        ],
      },
    },
    {
      id: 'a2222222-2222-4222-8222-222222222222',
      title: 'Simple announcement',
      description: 'Headline, short body, one button.',
      document: {
        format: 'blocks',
        description: 'Headline, short body, one button.',
        subject: 'Quick update',
        preview_text: 'One thing worth your attention.',
        blocks: [
          block('a1', 'heading', { text: 'One thing this week', level: 1 }),
          block('a2', 'paragraph', {
            text: '<p>Share the news in two short paragraphs. Keep the ask obvious.</p>',
          }),
          block('a3', 'button', {
            label: 'Read more',
            href: 'https://icallbs.com/',
          }),
        ],
      },
    },
    {
      id: 'a3333333-3333-4333-8333-333333333333',
      title: 'Resource / download follow-up',
      description: 'Confirm delivery + next resource link.',
      document: {
        format: 'blocks',
        description: 'Confirm delivery + next resource link.',
        subject: 'Your resource is ready',
        preview_text: 'Download link + what to do next.',
        blocks: [
          block('r1', 'heading', { text: 'Your download is ready', level: 1 }),
          block('r2', 'paragraph', {
            text: '<p>Open the resource, skim the checklist, then try one step today.</p>',
          }),
          block('r3', 'button', {
            label: 'Open resource',
            href: 'https://icallbs.com/resources',
          }),
          block('r4', 'heading', { text: 'Next up', level: 2 }),
          block('r5', 'paragraph', {
            text: '<p>When you are ready, the Literacy Check helps you spot weak spots fast.</p>',
          }),
          block('r6', 'button', {
            label: 'Take the Literacy Check',
            href: 'https://icallbs.com/resources/vibe-coding-literacy-check',
          }),
        ],
      },
    },
  ];
}
