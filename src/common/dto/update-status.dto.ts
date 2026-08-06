import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ToBoolean } from '../transformers/to-boolean.transformer';

/**
 * Faol / nofaol qilish uchun umumiy DTO.
 * Kategoriya va mahsulot uchun ham shu ishlatiladi.
 */
export class UpdateStatusDto {
  @ApiProperty({
    description: 'true — faollashtirish, false — nofaol qilish',
    example: false,
  })
  @IsNotEmpty({ message: 'isActive maydoni majburiy (true yoki false).' })
  @ToBoolean()
  @IsBoolean({ message: 'isActive faqat true yoki false bo‘lishi mumkin.' })
  isActive: boolean;
}
