import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Hozirgi parol', example: 'admin123' })
  @IsString({ message: 'oldPassword matn bo‘lishi kerak.' })
  @IsNotEmpty({ message: 'Hozirgi parolni kiriting.' })
  oldPassword: string;

  @ApiProperty({ description: 'Yangi parol (kamida 6 ta belgi)', example: 'yangiParol123' })
  @IsString({ message: 'newPassword matn bo‘lishi kerak.' })
  @MinLength(6, { message: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.' })
  newPassword: string;
}
