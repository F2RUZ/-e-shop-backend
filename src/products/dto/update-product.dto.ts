import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * PATCH uchun — barcha maydonlar ixtiyoriy.
 * Masalan faqat narxni o'zgartirish: { "price": 14500000 }
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
