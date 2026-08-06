import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { isMessagePayload } from '../helpers/with-message.helper';

/**
 * Barcha muvaffaqiyatli javoblarni BIR XIL ko'rinishga keltiradi:
 *
 * {
 *   "success": true,
 *   "message": "Mahsulot qo'shildi",
 *   "data": { ... }
 * }
 *
 * Frontend har doim shu 3 ta maydonni kutadi — bu ishni ancha osonlashtiradi.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const defaultMessage =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Muvaffaqiyatli';

    return next.handle().pipe(
      map((payload) => {
        // service withMessage() qaytargan bo'lsa — o'sha dinamik matnni ishlatamiz
        if (isMessagePayload(payload)) {
          return { success: true, message: payload.message, data: payload.data };
        }
        return { success: true, message: defaultMessage, data: payload ?? null };
      }),
    );
  }
}
