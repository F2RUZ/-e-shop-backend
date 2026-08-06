import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/dto/sort-order.enum';
import { ToBoolean } from '../../common/transformers/to-boolean.transformer';

export enum ProductSortBy {
  ID = 'id',
  NAME = 'name',
  PRICE = 'price',
  STOCK = 'stock',
  CREATED_AT = 'createdAt',
}

export class QueryProductDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Marka, model yoki tavsif bo‘yicha qidirish (katta-kichik harf farqi yo‘q)',
    example: 'toyota',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'search matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(100, { message: 'Qidiruv matni 100 belgidan oshmasligi kerak.' })
  search?: string;

  @ApiPropertyOptional({ description: 'Faqat shu kategoriyadagi avtomobillar', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'categoryId butun son bo‘lishi kerak.' })
  @Min(1, { message: 'categoryId 1 dan kichik bo‘lishi mumkin emas.' })
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'true — faqat faollar, false — faqat nofaollar, yubormasangiz — hammasi',
    example: true,
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'isActive faqat true yoki false bo‘lishi mumkin.' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Eng kam narx (so‘mda)', example: 200000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'minPrice son bo‘lishi kerak.' })
  @Min(0, { message: 'minPrice manfiy bo‘lishi mumkin emas.' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Eng ko‘p narx (so‘mda)', example: 600000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'maxPrice son bo‘lishi kerak.' })
  @Min(0, { message: 'maxPrice manfiy bo‘lishi mumkin emas.' })
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'true — faqat salonda bori (stock > 0), false — faqat tugaganlari (stock = 0)',
    example: true,
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: 'inStock faqat true yoki false bo‘lishi mumkin.' })
  inStock?: boolean;

  @ApiPropertyOptional({
    description: 'Nima bo‘yicha saralash',
    enum: ProductSortBy,
    default: ProductSortBy.ID,
  })
  @IsOptional()
  @IsEnum(ProductSortBy, {
    message: 'sortBy faqat quyidagilardan biri: id, name, price, stock, createdAt.',
  })
  sortBy?: ProductSortBy = ProductSortBy.ID;

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
