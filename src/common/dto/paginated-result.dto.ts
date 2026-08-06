import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Jami nechta element bor', example: 42 })
  total: number;

  @ApiProperty({ description: 'Hozirgi sahifa', example: 1 })
  page: number;

  @ApiProperty({ description: 'Bitta sahifadagi element soni', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Jami nechta sahifa', example: 5 })
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMetaDto;
}

/** Ro'yxat + sahifalash ma'lumotini bir xil ko'rinishda yig'ib beradi. */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: { total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
  };
}
