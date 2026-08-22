import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * «Menga eng yaqin salon qaysi?» degan savol uchun.
 *
 * Bu yerda sahifalash (page/limit) YO'Q — javob har doim qisqa ro'yxat:
 * eng yaqinidan boshlab bir nechta salon.
 */
export class NearbyQueryDto {
  @ApiProperty({
    description: 'Foydalanuvchi turgan joyning kengligi (latitude)',
    example: 41.311081,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'lat son bo‘lishi kerak. Masalan: ?lat=41.311081' })
  @Min(-90, { message: 'lat -90 dan kichik bo‘lishi mumkin emas.' })
  @Max(90, { message: 'lat 90 dan katta bo‘lishi mumkin emas.' })
  lat: number;

  @ApiProperty({
    description: 'Foydalanuvchi turgan joyning uzunligi (longitude)',
    example: 69.240562,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'lng son bo‘lishi kerak. Masalan: ?lng=69.240562' })
  @Min(-180, { message: 'lng -180 dan kichik bo‘lishi mumkin emas.' })
  @Max(180, { message: 'lng 180 dan katta bo‘lishi mumkin emas.' })
  lng: number;

  @ApiPropertyOptional({
    description: 'Necha kilometrgacha qidirilsin. Yubormasangiz — 25 km.',
    example: 25,
    default: 25,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'radiusKm son bo‘lishi kerak.' })
  @Min(1, { message: 'radiusKm kamida 1 bo‘lishi kerak.' })
  @Max(1000, { message: 'radiusKm ko‘pi bilan 1000 bo‘lishi mumkin.' })
  radiusKm?: number = 25;

  @ApiPropertyOptional({
    description: 'Nechta salon qaytarilsin. Yubormasangiz — 5 ta.',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit butun son bo‘lishi kerak.' })
  @Min(1, { message: 'limit kamida 1 bo‘lishi kerak.' })
  @Max(50, { message: 'limit ko‘pi bilan 50 bo‘lishi mumkin.' })
  limit?: number = 5;
}
