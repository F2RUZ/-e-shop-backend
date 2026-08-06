/**
 * Dinamik "message" bilan javob qaytarish uchun.
 *
 * Service'da:
 *   return withMessage(`«${product.name}» mahsuloti o'chirildi.`, { id });
 *
 * Natija (ResponseInterceptor buni tanib oladi):
 *   { "success": true, "message": "«Toyota Camry» mahsuloti o'chirildi.", "data": { "id": 3 } }
 */
export interface MessagePayload<T> {
  message: string;
  data: T;
}

export function withMessage<T>(message: string, data: T): MessagePayload<T> {
  return { message, data };
}

export function isMessagePayload(value: unknown): value is MessagePayload<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MessagePayload<unknown>).message === 'string' &&
    'data' in value
  );
}
