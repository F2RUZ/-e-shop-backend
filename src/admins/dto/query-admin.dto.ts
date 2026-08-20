import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SortOrder } from '../../common/dto/sort-order.enum';

export enum AdminSortBy {
  ID = 'id',
  LOGIN = 'login',
  FULL_NAME = 'fullName',
  CREATED_AT = 'createdAt',
}

export class QueryAdminDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Login yoki ism bo‘yicha qidirish (katta-kichik harf farqi yo‘q)',
    example: 'sardor',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'search matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(100, { message: 'Qidiruv matni 100 belgidan oshmasligi kerak.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Nima bo‘yicha saralash',
    enum: AdminSortBy,
    default: AdminSortBy.ID,
  })
  @IsOptional()
  @IsEnum(AdminSortBy, {
    message: 'sortBy faqat quyidagilardan biri: id, login, fullName, createdAt.',
  })
  sortBy?: AdminSortBy = AdminSortBy.ID;

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
