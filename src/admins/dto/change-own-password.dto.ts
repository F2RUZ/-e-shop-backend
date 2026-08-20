import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Admin O'ZINING parolini almashtirishi uchun: PATCH /api/admins/me/password
 *
 * Diqqat: bu yerda `login` yo'q — loginni hech kim o'zi o'zgartira olmaydi.
 * Loginni faqat bosh admin (super admin) o'zgartiradi.
 */
export class ChangeOwnPasswordDto {
  @ApiProperty({
    description: 'Hozirgi parolingiz — haqiqatan siz ekaningizni tekshirish uchun',
    example: 'sardor123',
  })
  @IsString({ message: 'currentPassword matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Hozirgi parolingizni kiriting.' })
  currentPassword: string;

  @ApiProperty({
    description: 'Yangi parol. Kamida 6 ta belgi — katta harf yoki maxsus belgi TALAB QILINMAYDI.',
    example: 'yangiparol1',
    minLength: 6,
    maxLength: 72,
  })
  @IsString({ message: 'newPassword matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Yangi parolni kiriting.' })
  @MinLength(6, { message: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.' })
  @MaxLength(72, { message: 'Yangi parol 72 ta belgidan oshmasligi kerak.' })
  newPassword: string;
}
