import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { GuideQueryDto } from './dto/guide-query.dto';
import { GuidesService } from './guides.service';

@ApiTags('0. Guides — qo‘llanmalar (PDF)')
@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  @Public()
  @ResponseMessage('Mavjud qo‘llanmalar')
  @ApiOperation({
    summary: 'Qanaqa qo‘llanmalar bor',
    description: `Yuklab olish mumkin bo'lgan qo'llanmalar ro'yxatini qaytaradi: nomi, izohi,
qaysi tillarda bor, qaysi formatda va **tayyor yuklab olish havolalari**.

Frontend avval shu manzilni chaqiradi, keyin javobdagi havolalarni tugmalarga qo'yadi —
qanaqa qo'llanma borligini oldindan bilishi shart emas. Yangi qo'llanma qo'shilsa,
ro'yxatda o'zi paydo bo'ladi.

**Javob namunasi:**

\`\`\`json
{
  "key": "pickup-points",
  "title": { "uz": "Tarqatuvchi salonlar...", "ru": "Пункты выдачи..." },
  "format": "pdf",
  "languages": ["uz", "ru"],
  "downloads": {
    "uz": "https://backend.magnateshop.uz/api/guides/pickup-points?lang=uz",
    "ru": "https://backend.magnateshop.uz/api/guides/pickup-points?lang=ru"
  }
}
\`\`\`

Bu endpoint **token talab qilmaydi** — sabab pastdagi yuklab olish endpointida yozilgan.`,
  })
  list() {
    return this.guidesService.list();
  }

  @Get(':key')
  @Public()
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Qo‘llanmani PDF qilib yuklab olish',
    description: `Qo'llanmani **PDF** faylga aylantirib qaytaradi. Brauzer uni darhol saqlaydi.

**Til tanlash:** \`?lang=uz\` yoki \`?lang=ru\`. Yubormasangiz — o'zbekcha.
Ikkalasi ham PDF — boshqa format yo'q.

**Hujjat ko'rinishi:** Times New Roman o'lchamidagi shrift, 14 kegl, 1.5 qator oralig'i,
matn qora, fon oq. A4, chetlari: chap 30 mm, o'ng 15 mm.

**Nega token so'ralmaydi:** PDF ni oddiy havola bilan yuklab olish uchun.
\\\`<a href="..." download>\\\` tegi \\\`Authorization\\\` sarlavhasini yubora olmaydi —
xuddi \\\`<img>\\\` va \\\`<video>\\\` kabi. Bu xavfsizlik teshigi emas: qo'llanma matni
allaqachon shu sahifada — \\\`/docs\\\` da — hammaga ochiq turibdi va unda hech qanday
shaxsiy ma'lumot yo'q.

**Frontend uchun:**

\`\`\`html
<a href="https://backend.magnateshop.uz/api/guides/pickup-points?lang=ru" download>
  Скачать PDF
</a>
\`\`\`

Bo'lmagan qo'llanma so'ralsa, javobda mavjudlarining ro'yxati beriladi.`,
  })
  @ApiParam({
    name: 'key',
    description: 'Qo‘llanma nomi — GET /api/guides dan olinadi',
    example: 'pickup-points',
  })
  @ApiQuery({ name: 'lang', required: false, enum: ['uz', 'ru'], example: 'uz' })
  async download(
    @Param('key') key: string,
    @Query() query: GuideQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.guidesService.render(key, query.lang);

    res.setHeader('Content-Type', 'application/pdf');
    // attachment — brauzer ko'rsatmaydi, darhol saqlaydi
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.end(buffer);
  }
}
