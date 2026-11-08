import { toEnglishDigits } from 'src/common/utils/digits.util';
import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applySearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search?: string,
  searchableFields: string[] = [],
) {
  const trimmed = search?.trim();
  if (!trimmed || searchableFields.length === 0) return;

  const normalized = toEnglishDigits(trimmed);
  const patterns =
    normalized !== trimmed
      ? [`%${normalized}%`, `%${trimmed}%`]
      : [`%${normalized}%`];

  qb.andWhere(
    new Brackets(subQb => {
      let isFirst = true;
      patterns.forEach((pattern, pIndex) => {
        searchableFields.forEach((field, fIndex) => {
          const paramKey = `search_${pIndex}_${fIndex}`;
          if (isFirst) {
            subQb.where(`${field} LIKE :${paramKey}`, { [paramKey]: pattern });
            isFirst = false;
          } else {
            subQb.orWhere(`${field} LIKE :${paramKey}`, {
              [paramKey]: pattern,
            });
          }
        });
      });
    }),
  );
}
