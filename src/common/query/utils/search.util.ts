import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applySearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search,
  fields: string[],
) {
  if (!search) return qb;

  fields.forEach(field => {
    qb.orWhere(`${field} LIKE :search`, {
      search: `%${search}%`,
    });
  });

  return qb;
}
