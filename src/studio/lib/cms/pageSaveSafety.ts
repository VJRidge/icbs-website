type BlockLike = {
  id?: unknown;
  type?: unknown;
  data?: unknown;
};

function keepsStructuredSections(blocks: BlockLike[]): boolean {
  return blocks.some((block) => {
    const type = String(block.type ?? '');
    if (type.startsWith('vj_') || type.startsWith('brand_') || type.startsWith('kit_')) return true;
    const data =
      block.data && typeof block.data === 'object' && !Array.isArray(block.data)
        ? (block.data as Record<string, unknown>)
        : {};
    return typeof data.section === 'string' && data.section.trim().length > 0;
  });
}

/** Prevent a stale/blank editor tree from replacing a saved structured brand page. */
export function wouldEraseStructuredSections(saved: BlockLike[], next: BlockLike[]): boolean {
  return keepsStructuredSections(saved) && !keepsStructuredSections(next);
}

type SaveIdentity = { id: string | null; slug: string; status: string };

/** Apply server identity fields without replacing edits made while a save was in flight. */
export function mergeSaveCompletion<T extends SaveIdentity>(
  current: T,
  submitted: T,
  saved: SaveIdentity,
): T {
  return {
    ...current,
    id: saved.id ?? current.id,
    slug: current.slug === submitted.slug ? saved.slug : current.slug,
    status: current === submitted ? saved.status : current.status,
  };
}
