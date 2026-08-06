import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Admin logini. Default: admin',
    example: 'admin',
  })
  @IsString({ message: 'login matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'login maydonini to‘ldiring.' })
  login: string;

  @ApiProperty({
    description: 'Admin paroli. Default: admin123',
    example: 'admin123',
  })
  @IsString({ message: 'parol matn ko‘rinishida bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'password maydonini to‘ldiring.' })
  password: string;
}
