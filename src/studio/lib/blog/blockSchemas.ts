import { z } from 'zod';

/** Incremental schemaVersion for `{ id, type, data }` blocks — do not replace the tree shape. */
export const BLOCK_SCHEMA_VERSION = 1;

const blockBase = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

const paragraphData = z
  .object({
    text: z.string().optional(),
    align: z.enum(['left', 'center', 'right', 'justify']).optional(),
    alt: z.string().optional(),
  })
  .passthrough();

const headingData = z
  .object({
    text: z.string().optional(),
    level: z.number().int().min(1).max(6).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
  })
  .passthrough();

const imageData = z
  .object({
    url: z.string().optional(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    link: z.string().optional(),
  })
  .passthrough();

const columnsData = z
  .object({
    columns: z.array(z.object({ blocks: z.array(z.unknown()).optional() }).passthrough()).optional(),
    layout: z.string().optional(),
    columnWidths: z.array(z.number()).optional(),
  })
  .passthrough();

export const CORE_BLOCK_DATA_SCHEMAS: Record<string, z.ZodType> = {
  paragraph: paragraphData,
  heading: headingData,
  image: imageData,
  columns: columnsData,
};

export type NormalizedBlogBlock = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  schemaVersion: number;
  invalid?: boolean;
};

export function normalizeBlock(raw: unknown): NormalizedBlogBlock {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `invalid-${Math.random().toString(36).slice(2, 9)}`,
      type: 'paragraph',
      data: { text: '' },
      schemaVersion: BLOCK_SCHEMA_VERSION,
      invalid: true,
    };
  }
  const candidate = raw as { id?: unknown; type?: unknown; data?: unknown };
  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : `invalid-${Math.random().toString(36).slice(2, 9)}`;
  const type = typeof candidate.type === 'string' && candidate.type ? candidate.type : 'paragraph';
  const dataIsObject =
    candidate.data && typeof candidate.data === 'object' && !Array.isArray(candidate.data);
  if (!dataIsObject) {
    return {
      id,
      type,
      data: {},
      schemaVersion: BLOCK_SCHEMA_VERSION,
      invalid: true,
    };
  }
  const data = candidate.data as Record<string, unknown>;

  const parsed = blockBase.safeParse({ id, type, data });
  if (!parsed.success) {
    return { id, type, data, schemaVersion: BLOCK_SCHEMA_VERSION, invalid: true };
  }
  const schema = CORE_BLOCK_DATA_SCHEMAS[parsed.data.type];
  if (!schema) {
    return { ...parsed.data, schemaVersion: BLOCK_SCHEMA_VERSION };
  }
  const dataParsed = schema.safeParse(parsed.data.data);
  if (!dataParsed.success) {
    return {
      id: parsed.data.id,
      type: parsed.data.type,
      data: parsed.data.data,
      schemaVersion: BLOCK_SCHEMA_VERSION,
      invalid: true,
    };
  }
  return {
    id: parsed.data.id,
    type: parsed.data.type,
    data: dataParsed.data as Record<string, unknown>,
    schemaVersion: BLOCK_SCHEMA_VERSION,
  };
}

export function normalizeBlocks(raw: unknown): NormalizedBlogBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeBlock);
}

export function countInvalidBlocks(blocks: NormalizedBlogBlock[]): number {
  return blocks.filter((b) => b.invalid).length;
}
