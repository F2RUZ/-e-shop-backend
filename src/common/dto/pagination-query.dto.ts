import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Ro'yxat qaytaradigan barcha endpointlar shu 2 ta parametrni qo'llab-quvvatlaydi.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Nechanchi sahifa (1 dan boshlanadi)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page butun son bo‘lishi kerak.' })
  @Min(1, { message: 'page kamida 1 bo‘lishi kerak.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Bitta sahifada nechta element (maksimum 100)',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit butun son bo‘lishi kerak.' })
  @Min(1, { message: 'limit kamida 1 bo‘lishi kerak.' })
  @Max(100, { message: 'limit ko‘pi bilan 100 bo‘lishi mumkin.' })
  limit?: number = 10;
}
