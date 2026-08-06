import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * PATCH uchun — barcha maydonlar ixtiyoriy.
 * Faqat o'zgartirmoqchi bo'lgan maydonni yuborsangiz kifoya.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
