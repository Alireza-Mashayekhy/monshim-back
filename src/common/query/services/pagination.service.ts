import { Injectable } from '@nestjs/common';

@Injectable()
export class PaginationService {
  build<T>(data: T[], total: number, page: number, limit: number) {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
