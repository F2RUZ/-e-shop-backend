import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/dto/sort-order.enum';
import { ToBoolean } from '../../common/transformers/to-boolean.transformer';

export enum PickupPointSortBy {
  ID = 'id',
  NAME = 'name',
  CITY = 'city',
  CREATED_AT = 'createdAt',
}

export class QueryPickupPointDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Nom, manzil yoki telefon bo‘yicha qidirish (katta-kichik harf farqi yo‘q)',
    example: 'chilonzor',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'search matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(100, { message: 'Qidiruv matni 100 belgidan oshmasligi kerak.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Faqat shu shahardagi salonlar',
    example: 'Toshkent',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'city matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(100, { message: 'Shahar nomi 100 belgidan oshmasligi kerak.' })
  city?: string;

  @ApiPropertyOptional({
    description: 'true — faqat ochiqlari, false — faqat yopiqlari, yubormasangiz — hammasi',
    example: true,
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive faqat true yoki false bo‘lishi mumkin.' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Nima bo‘yicha saralash',
    enum: PickupPointSortBy,
    default: PickupPointSortBy.ID,
  })
  @IsOptional()
  @IsEnum(PickupPointSortBy, {
    message: 'sortBy faqat quyidagilardan biri: id, name, city, createdAt.',
  })
  sortBy?: PickupPointSortBy = PickupPointSortBy.ID;

  @ApiPropertyOptional({
    description: 'Saralash yo‘nalishi: ASC — o‘sish, DESC — kamayish',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(SortOrder, { message: 'order faqat ASC yoki DESC bo‘lishi mumkin.' })
  order?: SortOrder = SortOrder.ASC;
}
