export const CMS_LIST_PAGE_SIZE = 20;

export function paginateList<T>(items: T[], page: number, pageSize = CMS_LIST_PAGE_SIZE): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalListPages(itemCount: number, pageSize = CMS_LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}
