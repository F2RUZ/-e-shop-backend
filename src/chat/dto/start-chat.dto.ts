import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * Mijoz suhbatni boshlaganda yuboradigan ma'lumot.
 *
 * Birinchi marta: faqat `name` yuboriladi -> yangi suhbat va yangi `guestKey`.
 * Keyingi safar:  saqlangan `guestKey` ham yuboriladi -> eski suhbat qaytadi.
 */
export class StartChatDto {
  @ApiProperty({
    description: 'Mijozning ismi. Admin suhbatlar ro‘yxatida shu ismni ko‘radi.',
    example: 'Aziz',
    minLength: 2,
    maxLength: 60,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'name matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Ismingizni kiriting.' })
  @Length(2, 60, { message: 'Ism 2 tadan 60 tagacha belgidan iborat bo‘lishi kerak.' })
  name: string;

  @ApiPropertyOptional({
    description:
      'Avval olingan maxfiy kalit. Yuborsangiz — eski suhbatingiz yozishmalari bilan qaytadi. ' +
      'Yubormasangiz — yangi suhbat ochiladi.',
    example: '6f1c9c1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f',
    maxLength: 64,
  })
  @IsOptional()
  @IsString({ message: 'guestKey matn ko‘rinishida bo‘lishi kerak.' })
  @MaxLength(64, { message: 'guestKey 64 ta belgidan oshmasligi kerak.' })
  guestKey?: string;
}
