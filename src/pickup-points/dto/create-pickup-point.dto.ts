import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Ish vaqti «soat:daqiqa» ko'rinishida bo'lishi kerak: 09:00, 18:30, 23:59 */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * POST (yaratish) va PUT (to'liq almashtirish) uchun ishlatiladi.
 *
 * Diqqat: bu yerda `isActive` yo'q — salonni ochiq/yopiq qilish uchun
 * alohida endpoint bor: PATCH /api/pickup-points/{id}/status
 */
export class CreatePickupPointDto {
  @ApiProperty({
    description: 'Salon nomi. Takrorlanmasligi kerak (katta-kichik harf hisobga olinmaydi).',
    example: 'Magnate Motors — Chilonzor',
    minLength: 2,
    maxLength: 150,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Salon nomini kiriting.' })
  @Length(2, 150, { message: 'Salon nomi 2 tadan 150 tagacha belgidan iborat bo‘lishi kerak.' })
  name: string;

  @ApiProperty({
    description: 'Shahar yoki viloyat nomi',
    example: 'Toshkent',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'city matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Shaharni kiriting.' })
  @Length(2, 100, { message: 'Shahar nomi 2 tadan 100 tagacha belgidan iborat bo‘lishi kerak.' })
  city: string;

  @ApiProperty({
    description: 'To‘liq manzil: tuman, ko‘cha, uy raqami',
    example: 'Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12-uy',
    minLength: 5,
    maxLength: 300,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'address matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Manzilni kiriting.' })
  @Length(5, 300, { message: 'Manzil 5 tadan 300 tagacha belgidan iborat bo‘lishi kerak.' })
  address: string;

  @ApiProperty({
    description:
      'Telefon raqami. Bo‘sh joy, qavs va chiziqcha bilan yozsangiz ham bo‘ladi — ' +
      'server o‘zi tozalab, +998901234567 ko‘rinishiga keltiradi.',
    example: '+998 90 123 45 67',
  })
  // Avval RAQAMLARNI ajratib olamiz, keyin xalqaro ko'rinishga keltiramiz.
  // Shunda bola «(90) 123-45-67» deb yozsa ham xato chiqmaydi.
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    const digits = value.replace(/\D/g, ''); // faqat raqamlar qoladi

    if (digits.length === 9) return `+998${digits}`; // 901234567
    if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`; // 998901234567

    return value.trim(); // boshqa holatda o'zgarmaydi -> pastdagi @Matches xato beradi
  })
  @IsString({ message: 'phone matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Telefon raqamini kiriting.' })
  @Matches(/^\+998\d{9}$/, {
    message:
      'Telefon raqami noto‘g‘ri. O‘zbekiston raqamini kiriting, masalan: +998901234567 yoki 90 123 45 67.',
  })
  phone: string;

  @ApiPropertyOptional({
    description: 'Salon ochiladigan vaqt (HH:MM). Yubormasangiz 09:00 bo‘ladi.',
    example: '09:00',
    default: '09:00',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'opensAt matn ko‘rinishida bo‘lishi kerak.' })
  @Matches(TIME_PATTERN, { message: 'opensAt «soat:daqiqa» ko‘rinishida bo‘lsin, masalan: 09:00.' })
  opensAt?: string;

  @ApiPropertyOptional({
    description: 'Salon yopiladigan vaqt (HH:MM). Yubormasangiz 19:00 bo‘ladi.',
    example: '19:00',
    default: '19:00',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'closesAt matn ko‘rinishida bo‘lishi kerak.' })
  @Matches(TIME_PATTERN, { message: 'closesAt «soat:daqiqa» ko‘rinishida bo‘lsin, masalan: 19:00.' })
  closesAt?: string;

  @ApiPropertyOptional({
    description: 'Kenglik (latitude). Xaritada ko‘rsatish va «eng yaqin salon» uchun kerak.',
    example: 41.285,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'latitude son bo‘lishi kerak.' })
  @Min(-90, { message: 'latitude -90 dan kichik bo‘lishi mumkin emas.' })
  @Max(90, { message: 'latitude 90 dan katta bo‘lishi mumkin emas.' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Uzunlik (longitude). Xaritada ko‘rsatish va «eng yaqin salon» uchun kerak.',
    example: 69.204,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'longitude son bo‘lishi kerak.' })
  @Min(-180, { message: 'longitude -180 dan kichik bo‘lishi mumkin emas.' })
  @Max(180, { message: 'longitude 180 dan katta bo‘lishi mumkin emas.' })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Salon rasmi (to‘liq havola)',
    example: 'https://backend.magnateshop.uz/images/salons/chilonzor.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'image matn (havola) ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(500, { message: 'Rasm havolasi 500 ta belgidan oshmasligi kerak.' })
  image?: string;
}
