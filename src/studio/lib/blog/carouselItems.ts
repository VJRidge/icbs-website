export function moveCarouselItem<T>(items: T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return items;
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = items.slice();
  const [row] = next.splice(from, 1);
  if (row === undefined) return items;
  next.splice(to, 0, row);
  return next;
}

export function followMovedIndex(open: number, from: number, to: number): number {
  if (open < 0) return open;
  if (open === from) return to;
  if (from < open && to >= open) return open - 1;
  if (from > open && to <= open) return open + 1;
  return open;
}
