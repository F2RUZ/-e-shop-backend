import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * POST (yaratish) va PUT (to'liq almashtirish) uchun ishlatiladi.
 *
 * Diqqat: bu yerda `isActive` yo'q — faol/nofaol qilish uchun
 * alohida endpoint bor: PATCH /api/categories/{id}/status
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Kategoriya nomi. Takrorlanmasligi kerak (katta-kichik harf hisobga olinmaydi).',
    example: 'Telefonlar',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Kategoriya nomini kiriting.' })
  @Length(2, 100, { message: 'Kategoriya nomi 2 tadan 100 tagacha belgidan iborat bo‘lishi kerak.' })
  name: string;

  @ApiPropertyOptional({
    description: 'Kategoriya haqida qisqacha izoh',
    example: 'Smartfonlar va aksessuarlar',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'description matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(500, { message: 'Izoh 500 ta belgidan oshmasligi kerak.' })
  description?: string;
}
