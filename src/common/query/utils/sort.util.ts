import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applySort<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  sort?: string,
) {
  if (!sort) return qb;

  const [field, order] = sort.split(':');

  return qb.orderBy(field, (order?.toUpperCase() as any) || 'ASC');
}
