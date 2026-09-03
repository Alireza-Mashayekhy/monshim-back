export function getPagination(page: number, limit: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Math.min(
    Math.max(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10, 1),
    100,
  );

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}
