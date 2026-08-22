import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Barcha xatoliklarni BIR XIL ko'rinishda qaytaradi:
 *
 * {
 *   "success": false,
 *   "statusCode": 409,
 *   "message": "«Sedan» kategoriyasini o'chira olmaysiz, unda 17 ta mahsulot bor",
 *   "errors": ["narx 0 dan katta bo'lishi kerak"],   // faqat validatsiyada
 *   "path": "/api/categories/1",
 *   "timestamp": "2026-08-06T12:00:00.000Z"
 * }
 */

// NestJS'ning ichki inglizcha matnlarini o'zbekchaga o'giramiz
const DEFAULT_MESSAGES: Record<string, string> = {
  Unauthorized: 'Token yuborilmadi yoki eskirgan. Iltimos, qaytadan tizimga kiring.',
  'Forbidden resource': 'Bu amalni bajarishga ruxsatingiz yo‘q.',
  'Internal server error': 'Serverda kutilmagan xatolik yuz berdi.',

  // Fayl yuklashda multer chiqaradigan inglizcha matnlar
  'File too large':
    'Fayl juda katta. Video 50 MB, rasm 10 MB dan oshmasligi kerak — ' +
    'qisqaroq video oling (30 soniya yetadi) yoki sifatni pasaytiring.',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Xatolik');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Serverda kutilmagan xatolik yuz berdi.';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const payload = body as { message?: string | string[]; errors?: string[] };
        errors = payload.errors;

        if (Array.isArray(payload.message)) {
          errors = payload.message;
          message = 'Yuborilgan ma‘lumotlar noto‘g‘ri.';
        } else if (typeof payload.message === 'string') {
          message = payload.message;
        }
      }

      message = DEFAULT_MESSAGES[message] ?? message;

      // multer noto'g'ri maydon nomi uchun "Unexpected field - rasm" deb yozadi
      if (message.startsWith('Unexpected field')) {
        message =
          'Fayl noto‘g‘ri maydonda yuborildi. Maydon nomi aynan «video» yoki «image» ' +
          'bo‘lishi kerak: formData.append("video", fayl).';
      }

      // Mavjud bo'lmagan endpoint: "Cannot GET /api/xyz"
      if (statusCode === HttpStatus.NOT_FOUND && /^Cannot (GET|POST|PUT|PATCH|DELETE)/.test(message)) {
        message = `Bunday endpoint mavjud emas: ${request.method} ${request.url}. Barcha endpointlar ro‘yxati: /docs`;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(errors?.length ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
