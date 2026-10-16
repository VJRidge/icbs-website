/** Helpers for primary + additional post categories. */

export type CategoryLink = {
  taxonomyId: string;
  isPrimary: boolean;
};

/** At most one primary; if none set and links exist, first becomes primary. */
export function normalizeCategoryLinks(links: CategoryLink[]): CategoryLink[] {
  const seen = new Set<string>();
  const unique: CategoryLink[] = [];
  for (const link of links) {
    if (!link.taxonomyId || seen.has(link.taxonomyId)) continue;
    seen.add(link.taxonomyId);
    unique.push({ taxonomyId: link.taxonomyId, isPrimary: Boolean(link.isPrimary) });
  }
  const primaryCount = unique.filter((l) => l.isPrimary).length;
  if (primaryCount === 0 && unique.length > 0) {
    return unique.map((l, i) => ({ ...l, isPrimary: i === 0 }));
  }
  if (primaryCount <= 1) return unique;
  let kept = false;
  return unique.map((l) => {
    if (!l.isPrimary) return l;
    if (kept) return { ...l, isPrimary: false };
    kept = true;
    return l;
  });
}

export function withPrimaryCategory(
  links: CategoryLink[],
  primaryId: string | null,
): CategoryLink[] {
  if (!primaryId) {
    return normalizeCategoryLinks(links.map((l) => ({ ...l, isPrimary: false })));
  }
  const others = links
    .filter((l) => l.taxonomyId !== primaryId)
    .map((l) => ({ taxonomyId: l.taxonomyId, isPrimary: false }));
  return normalizeCategoryLinks([{ taxonomyId: primaryId, isPrimary: true }, ...others]);
}

export function toggleAdditionalCategory(
  links: CategoryLink[],
  taxonomyId: string,
  on: boolean,
): CategoryLink[] {
  if (!taxonomyId) return normalizeCategoryLinks(links);
  if (on) {
    if (links.some((l) => l.taxonomyId === taxonomyId)) return normalizeCategoryLinks(links);
    return normalizeCategoryLinks([...links, { taxonomyId, isPrimary: false }]);
  }
  return normalizeCategoryLinks(links.filter((l) => l.taxonomyId !== taxonomyId));
}

/** Fields for inserting a category from the post editor. Null when the name is blank. */
export function newCategoryInsertPayload(
  name: string,
  existingCount: number,
  slug: string,
): { name: string; slug: string; description: string; sort_order: number } | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const safeSlug = slug.trim().toLowerCase();
  return {
    name: trimmed,
    slug: safeSlug || 'category',
    description: '',
    sort_order: (existingCount + 1) * 10,
  };
}
