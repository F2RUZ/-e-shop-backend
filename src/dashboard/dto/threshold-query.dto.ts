import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ThresholdQueryDto {
  @ApiPropertyOptional({
    description: '"Kam qolgan" deb hisoblanadigan chegara. Masalan 5 — omborda 5 ta va undan kam qolganlar.',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'threshold butun son bo‘lishi kerak.' })
  @Min(1, { message: 'threshold kamida 1 bo‘lishi kerak.' })
  @Max(1000, { message: 'threshold ko‘pi bilan 1000 bo‘lishi mumkin.' })
  threshold?: number = 5;
}
