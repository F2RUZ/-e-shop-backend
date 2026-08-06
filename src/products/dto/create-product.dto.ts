import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * POST (yaratish) va PUT (to'liq almashtirish) uchun ishlatiladi.
 *
 * Diqqat: bu yerda `isActive` yo'q — faol/nofaol qilish uchun
 * alohida endpoint bor: PATCH /api/products/{id}/status
 */
export class CreateProductDto {
  @ApiProperty({
    description: 'Mahsulot nomi',
    example: 'iPhone 15 Pro 256GB',
    minLength: 2,
    maxLength: 150,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Mahsulot nomini kiriting.' })
  @Length(2, 150, { message: 'Mahsulot nomi 2 tadan 150 tagacha belgidan iborat bo‘lishi kerak.' })
  name: string;

  @ApiPropertyOptional({
    description: 'Mahsulot haqida batafsil',
    example: 'Titan korpus, A17 Pro protsessor, 48MP kamera',
    maxLength: 2000,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'description matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(2000, { message: 'Tavsif 2000 ta belgidan oshmasligi kerak.' })
  description?: string;

  @ApiProperty({
    description: 'Narxi so‘mda. 0 dan katta bo‘lishi kerak.',
    example: 15990000,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'price son bo‘lishi kerak (kasr qismi ko‘pi bilan 2 xona).' },
  )
  @IsPositive({ message: 'Narx 0 dan katta bo‘lishi kerak.' })
  @Max(9999999999, { message: 'Narx juda katta kiritildi.' })
  price: number;

  @ApiPropertyOptional({
    description: 'Omborda nechta bor. Yubormasangiz 0 bo‘ladi.',
    example: 12,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stock butun son bo‘lishi kerak.' })
  @Min(0, { message: 'Ombordagi soni manfiy bo‘lishi mumkin emas.' })
  stock?: number;

  @ApiPropertyOptional({
    description: 'Rasm havolasi (URL)',
    example: 'https://example.com/rasmlar/iphone-15-pro.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'image matn (havola) ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(500, { message: 'Rasm havolasi 500 ta belgidan oshmasligi kerak.' })
  image?: string;

  @ApiProperty({
    description: 'Qaysi kategoriyaga tegishli. Kategoriya mavjud va FAOL bo‘lishi kerak.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'categoryId butun son bo‘lishi kerak.' })
  @Min(1, { message: 'categoryId 1 dan kichik bo‘lishi mumkin emas.' })
  categoryId: number;
}
