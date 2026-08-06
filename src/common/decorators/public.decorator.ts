import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Endpointni "ochiq" qilib belgilaydi — ya'ni token so'ralmaydi.
 * Loyihada BARCHA endpointlar himoyalangan (global JwtAuthGuard),
 * faqat @Public() qo'yilganlari token talab qilmaydi. Masalan: login.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
