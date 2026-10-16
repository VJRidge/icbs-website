export type PostGridOrderFields = {
  list_order?: number | null;
  published_at?: string | null;
  title?: string | null;
};

export function readListOrder(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Lower rank is earlier on the public blog grid. Ties use newest publish date. */
export function comparePostGridOrder(a: PostGridOrderFields, b: PostGridOrderFields): number {
  const ao = readListOrder(a.list_order);
  const bo = readListOrder(b.list_order);
  if (ao !== bo) return ao - bo;
  const at = a.published_at ? Date.parse(a.published_at) : 0;
  const bt = b.published_at ? Date.parse(b.published_at) : 0;
  if (at !== bt) return bt - at;
  return (a.title || '').localeCompare(b.title || '');
}

/** Row under the pointer during HTML5 reorder (table cells, links, and buttons included). */
export function dropTargetPostId(target: EventTarget | null): string | null {
  if (!target || typeof (target as Element).closest !== 'function') return null;
  return (target as Element).closest('[data-post-id]')?.getAttribute('data-post-id') ?? null;
}

export function moveIdAt(ids: string[], from: number, to: number): string[] {
  if (from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return [...ids];
  const next = [...ids];
  const [item] = next.splice(from, 1);
  if (!item) return [...ids];
  next.splice(to, 0, item);
  return next;
}

export function ranksFromIds(ids: string[]): { id: string; list_order: number }[] {
  return ids.map((id, list_order) => ({ id, list_order }));
}

export function pinListOrder(existing: Iterable<number>): number {
  let min = 0;
  for (const value of existing) {
    if (value < min) min = value;
  }
  return min - 1;
}

/** Keep date order until someone drags; then new posts go to the end. */
export function newPostListOrder(existing: Iterable<number>): number {
  let max = 0;
  let custom = false;
  for (const value of existing) {
    if (value !== 0) custom = true;
    if (value > max) max = value;
  }
  return custom ? max + 1 : 0;
}
