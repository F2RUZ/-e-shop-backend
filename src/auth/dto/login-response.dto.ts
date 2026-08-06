import { ApiProperty } from '@nestjs/swagger';
import { Admin } from '../entities/admin.entity';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT token. Har bir so‘rovda "Authorization: Bearer <token>" sarlavhasida yuboriladi.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ description: 'Token qancha vaqt amal qiladi', example: '7d' })
  expiresIn: string;

  @ApiProperty({ description: 'Tizimga kirgan admin ma’lumotlari', type: Admin })
  admin: Admin;
}
