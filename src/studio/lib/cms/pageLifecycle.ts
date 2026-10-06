export const STALE_WRITE_MESSAGE =
  'This copy is out of date. Refresh to load the latest saved version, then try again.';

export function staleWriteMessage(): string {
  return STALE_WRITE_MESSAGE;
}

export function trashPatch(nextDocVersion?: number): { status: 'trash'; doc_version?: number } {
  return typeof nextDocVersion === 'number'
    ? { status: 'trash', doc_version: nextDocVersion }
    : { status: 'trash' };
}

export function restoreFromTrashPatch(): { status: 'draft' } {
  return { status: 'draft' };
}

export function nextDocVersion(current: number | null | undefined): number {
  return Math.max(1, Number(current) || 1) + 1;
}

export function assertWriteMatchedRow<T>(row: T | null | undefined): T {
  if (row == null) throw new Error(STALE_WRITE_MESSAGE);
  return row;
}

export function restoreRevisionWorkingCopy(document: {
  format?: unknown;
  blocks?: unknown;
  html?: unknown;
}): {
  content_blocks: unknown[];
  body: string;
} {
  return {
    content_blocks: Array.isArray(document.blocks) ? document.blocks : [],
    body: typeof document.html === 'string' ? document.html : '',
  };
}
