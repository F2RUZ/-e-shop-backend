import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Koordinatadan manzil topish uchun */
export class ReverseGeocodeQueryDto {
  @ApiProperty({ description: 'Kenglik (latitude)', example: 41.275, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber({}, { message: 'lat son bo‘lishi kerak.' })
  @Min(-90, { message: 'lat -90 dan kichik bo‘lishi mumkin emas.' })
  @Max(90, { message: 'lat 90 dan katta bo‘lishi mumkin emas.' })
  lat: number;

  @ApiProperty({ description: 'Uzunlik (longitude)', example: 69.204, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber({}, { message: 'lng son bo‘lishi kerak.' })
  @Min(-180, { message: 'lng -180 dan kichik bo‘lishi mumkin emas.' })
  @Max(180, { message: 'lng 180 dan katta bo‘lishi mumkin emas.' })
  lng: number;
}

/** Manzildan koordinata topish uchun */
export class SearchGeocodeQueryDto {
  @ApiProperty({
    description: 'Qidiriladigan manzil',
    example: 'Chilonzor, Bunyodkor shoh ko‘chasi 12',
    minLength: 3,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'q matn ko‘rinishida bo‘lishi kerak.' })
  @MinLength(3, { message: 'Qidiruv matni kamida 3 ta belgidan iborat bo‘lsin.' })
  @MaxLength(200, { message: 'Qidiruv matni 200 belgidan oshmasligi kerak.' })
  q: string;
}

/** Javob ko'rinishi — Swagger uchun */
export class GeocodeResultDto {
  @ApiProperty({ description: 'To‘liq manzil matni', example: '12, Bunyodkor shoh ko‘chasi, Chilonzor, Toshkent' })
  displayName: string;

  @ApiPropertyOptional({ description: 'Salon nomiga taklif (mahalla/tuman)', example: 'Chilonzor', nullable: true })
  suggestedName: string | null;

  @ApiPropertyOptional({ description: 'Shahar', example: 'Toshkent', nullable: true })
  city: string | null;

  @ApiPropertyOptional({ description: 'Ko‘cha va uy raqami', example: 'Bunyodkor shoh ko‘chasi, 12', nullable: true })
  address: string | null;

  @ApiProperty({ description: 'Kenglik', example: 41.275 })
  latitude: number;

  @ApiProperty({ description: 'Uzunlik', example: 69.204 })
  longitude: number;
}
