export const PAGE_SIZE = 10;

// Reads ?page= (and ?pageSize= where a list allows larger pages). Lists that pass no
// maximum always use PAGE_SIZE, so pageSize has no effect on them.
export function getPage(query, maxPageSize = PAGE_SIZE) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.pageSize, 10);
  const pageSize = maxPageSize > PAGE_SIZE && requested > 0 ? Math.min(requested, maxPageSize) : PAGE_SIZE;
  return { page, skip: (page - 1) * pageSize, take: pageSize, pageSize };
}
