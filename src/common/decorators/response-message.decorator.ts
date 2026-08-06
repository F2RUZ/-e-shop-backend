import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';

/**
 * Muvaffaqiyatli javobdagi "message" matnini belgilaydi.
 *
 * Misol:
 *   @ResponseMessage('Mahsulot qo\'shildi')
 *   -> { "success": true, "message": "Mahsulot qo'shildi", "data": {...} }
 *
 * Agar matn dinamik bo'lishi kerak bo'lsa (masalan ichida mahsulot nomi bo'lsa),
 * service'da withMessage() helperidan foydalaning.
 */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);
