import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * POST (yaratish) va PUT (to'liq almashtirish) uchun ishlatiladi.
 *
 * Diqqat: bu yerda `isActive` yo'q — adminlar jadvalida bunday ustun yo'q.
 * Admin kerak bo'lmay qolsa, uni butunlay o'chirib yuboriladi.
 */
export class CreateAdminDto {
  @ApiProperty({
    description:
      'Tizimga kirish logini. TAKRORLANMASLIGI kerak. Kichik harfga o‘tkazib saqlanadi, ' +
      'shuning uchun «Sardor» ham «sardor» ham bir xil hisoblanadi.',
    example: 'sardor',
    minLength: 3,
    maxLength: 50,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: 'login matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Login kiriting.' })
  @Length(3, 50, { message: 'Login 3 tadan 50 tagacha belgidan iborat bo‘lishi kerak.' })
  @Matches(/^[a-z0-9._-]+$/, {
    message:
      'Loginda faqat lotin harflari, raqamlar va . _ - belgilari bo‘lishi mumkin. ' +
      'Probel va boshqa belgilar ishlatilmaydi.',
  })
  login: string;

  @ApiProperty({
    description:
      'Parol. Kamida 6 ta belgi bo‘lsa yetarli — katta harf yoki maxsus belgi TALAB QILINMAYDI. ' +
      'Parol bazaga shifrlangan holda yoziladi va hech qachon javobda qaytmaydi.',
    example: 'sardor123',
    minLength: 6,
    maxLength: 72,
  })
  @IsString({ message: 'password matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Parol kiriting.' })
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' })
  @MaxLength(72, { message: 'Parol 72 ta belgidan oshmasligi kerak.' })
  password: string;

  @ApiProperty({
    description: 'Adminning to‘liq ismi — panelda va ro‘yxatda shu ism ko‘rinadi',
    example: 'Sardor Aliyev',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'fullName matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Adminning ismini kiriting.' })
  @Length(2, 100, { message: 'Ism 2 tadan 100 tagacha belgidan iborat bo‘lishi kerak.' })
  fullName: string;
}
