import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applySort<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  sort?: string,
  allowedFields: string[] = ['createdAt', 'id'],
) {
  if (!sort) return qb;

  const [field, order] = sort.split(':');
  if (!field || !allowedFields.includes(field)) {
    return qb;
  }

  const direction = order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return qb.orderBy(field, direction);
}
