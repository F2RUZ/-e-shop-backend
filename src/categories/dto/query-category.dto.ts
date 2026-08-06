import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/dto/sort-order.enum';
import { ToBoolean } from '../../common/transformers/to-boolean.transformer';

export enum CategorySortBy {
  ID = 'id',
  NAME = 'name',
  CREATED_AT = 'createdAt',
}

export class QueryCategoryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Nom yoki izoh bo‘yicha qidirish (katta-kichik harf farqi yo‘q)',
    example: 'telefon',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'search matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(100, { message: 'Qidiruv matni 100 belgidan oshmasligi kerak.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Holat bo‘yicha filtr. true — faqat faollar, false — faqat nofaollar, yubormasangiz — hammasi',
    example: true,
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive faqat true yoki false bo‘lishi mumkin.' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Nima bo‘yicha saralash',
    enum: CategorySortBy,
    default: CategorySortBy.ID,
  })
  @IsOptional()
  @IsEnum(CategorySortBy, { message: 'sortBy faqat quyidagilardan biri: id, name, createdAt.' })
  sortBy?: CategorySortBy = CategorySortBy.ID;

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
