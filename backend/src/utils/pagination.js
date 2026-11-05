export const PAGE_SIZE = 10;

export function getPage(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  return { page, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}
