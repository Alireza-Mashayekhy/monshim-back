export class QueryDto {
  page?: number = 1;
  limit?: number = 10;

  search?: string;

  sort?: string; // مثلا: "createdAt:DESC"

  // ساده‌ترین حالت filter
  [key: string]: any;
}
