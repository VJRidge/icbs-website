export type TeaserTaxonomy = {
  kind?: string;
  name?: string;
  slug?: string;
  is_primary?: boolean;
};

type ParsedTaxonomy = {
  kind: string;
  name: string;
  slug: string;
  is_primary: boolean;
};

export type CategoryFace = { slug: string; name: string };

function asTaxonomy(raw: unknown): ParsedTaxonomy | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name ?? '').trim();
  if (!name) return null;
  return {
    kind: String(o.kind ?? ''),
    name,
    slug: String(o.slug ?? '').trim(),
    is_primary: Boolean(o.is_primary),
  };
}

function isCategory(row: ParsedTaxonomy): boolean {
  return !row.kind || row.kind === 'category';
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Every selected category name, primary first. */
export function teaserCategoryNames(taxonomies: unknown): string[] {
  if (!Array.isArray(taxonomies)) return [];
  const cats = taxonomies.map(asTaxonomy).filter((row): row is ParsedTaxonomy => Boolean(row && isCategory(row)));
  if (!cats.length) return [];
  const hasPrimary = cats.some((row) => row.is_primary);
  const ordered = hasPrimary ? [...cats.filter((row) => row.is_primary), ...cats.filter((row) => !row.is_primary)] : cats;
  return uniqueNames(ordered.map((row) => row.name));
}

function uniqueFaces(faces: CategoryFace[]): CategoryFace[] {
  const seen = new Set<string>();
  const out: CategoryFace[] = [];
  for (const face of faces) {
    const key = (face.slug || face.name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(face);
  }
  return out;
}

/** Live content_taxonomies rows for one post → all category faces, primary first. */
export function categoryFacesFromLinks(rows: TeaserCategoryLink[]): CategoryFace[] {
  const primary: CategoryFace[] = [];
  const rest: CategoryFace[] = [];
  for (const row of rows) {
    const nested = Array.isArray(row.taxonomies) ? row.taxonomies[0] : row.taxonomies;
    const tax = asTaxonomy(nested);
    if (!tax || !isCategory(tax)) continue;
    const face = { slug: tax.slug || tax.name.toLowerCase().replace(/\s+/g, '-'), name: tax.name };
    if (row.is_primary) primary.push(face);
    else rest.push(face);
  }
  return uniqueFaces([...primary, ...rest]);
}

/** Orange kicker on post cards: all selected categories, primary first. */
export function teaserCategoryLabel(taxonomies: unknown): string {
  return teaserCategoryNames(taxonomies).join(' · ');
}

export type TeaserCategoryLink = {
  content_id?: string;
  is_primary?: boolean;
  taxonomies?: unknown;
};

/** Live content_taxonomies rows → all category names per post id, primary first. */
export function teaserCategoryByContentId(rows: TeaserCategoryLink[]): Record<string, string> {
  const buckets: Record<string, { primary: string[]; rest: string[] }> = {};
  for (const row of rows) {
    const id = String(row.content_id ?? '').trim();
    const nested = Array.isArray(row.taxonomies) ? row.taxonomies[0] : row.taxonomies;
    const tax = asTaxonomy(nested);
    if (!id || !tax || !isCategory(tax)) continue;
    const bucket = buckets[id] ?? { primary: [], rest: [] };
    if (row.is_primary) bucket.primary.push(tax.name);
    else bucket.rest.push(tax.name);
    buckets[id] = bucket;
  }
  const map: Record<string, string> = {};
  for (const [id, bucket] of Object.entries(buckets)) {
    map[id] = uniqueNames([...bucket.primary, ...bucket.rest]).join(' · ');
  }
  return map;
}
