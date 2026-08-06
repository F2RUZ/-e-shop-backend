import { BadRequestException, ParseIntPipe } from '@nestjs/common';

/**
 * URL'dagi :id ni songa aylantiradi.
 * Noto'g'ri bo'lsa — inglizcha emas, tushunarli o'zbekcha xabar qaytaradi.
 *
 *   @Param('id', ParseIdPipe) id: number
 */
export const ParseIdPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('ID butun son bo‘lishi kerak. Masalan: /api/categories/1'),
});
