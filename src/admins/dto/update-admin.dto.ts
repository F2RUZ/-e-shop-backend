import { PartialType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';

/**
 * PATCH uchun — barcha maydonlar ixtiyoriy.
 * Faqat ismni o'zgartirish:  { "fullName": "Sardor Aliyev" }
 * Faqat parolni almashtirish: { "password": "yangi123" }
 */
export class UpdateAdminDto extends PartialType(CreateAdminDto) {}
