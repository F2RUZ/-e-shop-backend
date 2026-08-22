import { PartialType } from '@nestjs/swagger';
import { CreatePickupPointDto } from './create-pickup-point.dto';

/**
 * PATCH uchun — barcha maydonlar ixtiyoriy.
 * Masalan faqat telefonni almashtirish: { "phone": "+998907776655" }
 */
export class UpdatePickupPointDto extends PartialType(CreatePickupPointDto) {}
