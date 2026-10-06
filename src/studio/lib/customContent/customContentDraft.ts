import { slugifyTitle } from '../slugifyTitle';
import { CUSTOM_CONTENT_TYPE_KEYS, validateCustomContentFields, type CustomContentTypeKey } from '../customContentTypes';

export const CUSTOM_STORAGE_KIND = 'custom';

type DraftInput = {
  typeKey: string;
  typeId: string;
  schemaVersion: number;
  title: string;
  slug?: string;
  authorId: string;
  fields?: unknown;
};

export type CustomContentDraftRow = {
  kind: typeof CUSTOM_STORAGE_KIND;
  content_type_id: string;
  structured_schema_version: number;
  title: string;
  slug: string;
  author_id: string;
  status: 'draft';
  structured_fields: Record<string, unknown>;
  content_blocks: [];
  body: string;
};

export function buildCustomContentDraft(input: DraftInput): CustomContentDraftRow {
  if (!CUSTOM_CONTENT_TYPE_KEYS.includes(input.typeKey as CustomContentTypeKey)) {
    throw new Error('Unknown custom content type.');
  }
  const parsed = validateCustomContentFields(input.typeKey, input.fields ?? {}, 'draft');
  if (!parsed.success) {
    throw new Error('Invalid structured fields.');
  }
  const title = input.title.trim() || 'Untitled';
  return {
    kind: CUSTOM_STORAGE_KIND,
    content_type_id: input.typeId,
    structured_schema_version: input.schemaVersion,
    title,
    slug: (input.slug?.trim() || slugifyTitle(title)).toLowerCase(),
    author_id: input.authorId,
    status: 'draft',
    structured_fields: parsed.data as Record<string, unknown>,
    content_blocks: [],
    body: '',
  };
}

export function publicPathForCustomContent(typeKey: string, slug: string): string | null {
  if (typeKey !== 'tool_review') return null;
  const safe = slugifyTitle(slug);
  return `/reviews/${safe}`;
}

export type CustomContentPublishRow = Omit<CustomContentDraftRow, 'status'> & {
  status: 'published';
  published_at: string;
  published_document: {
    format: 'structured-content';
    version: 1;
    title: string;
    blocks: [];
    html: string;
    _structured: {
      typeKey: 'tool_review';
      schemaVersion: number;
      fields: Record<string, unknown>;
      public_path: string;
    };
  };
};

export function buildCustomContentPublish(input: DraftInput): CustomContentPublishRow {
  if (input.typeKey !== 'tool_review') {
    throw new Error('Publication is not enabled for this content type.');
  }
  const parsed = validateCustomContentFields(input.typeKey, input.fields ?? {}, 'publish');
  if (!parsed.success) {
    throw new Error('Invalid structured fields. Required review evidence is missing.');
  }
  const draft = buildCustomContentDraft({ ...input, fields: parsed.data });
  const publicPath = publicPathForCustomContent('tool_review', draft.slug);
  if (!publicPath) {
    throw new Error('Publication is not enabled for this content type.');
  }
  const publishedAt = new Date().toISOString();
  return {
    ...draft,
    status: 'published',
    published_at: publishedAt,
    published_document: {
      format: 'structured-content',
      version: 1,
      title: draft.title,
      blocks: [],
      html: '',
      _structured: {
        typeKey: 'tool_review',
        schemaVersion: draft.structured_schema_version,
        fields: parsed.data as Record<string, unknown>,
        public_path: publicPath,
      },
    },
  };
}

export function isMissingCustomContentSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const message = error.message ?? '';
  if (code === 'PGRST205' || code === '42P01') return true;
  if (code === '22P02' && /content_kind/i.test(message) && /custom/i.test(message)) return true;
  return /could not find the table ['"]?public\.content_types/i.test(message);
}
