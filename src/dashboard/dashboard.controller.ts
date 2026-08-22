import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { DashboardService } from './dashboard.service';
import { ThresholdQueryDto } from './dto/threshold-query.dto';

@ApiTags('7. Dashboard — umumiy statistika')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ResponseMessage('Umumiy statistika')
  @ApiOperation({
    summary: 'Bosh sahifa statistikasi',
    description: `Admin panelning bosh sahifasidagi kartochkalar uchun barcha raqamlarni bitta so'rovda qaytaradi.

**Ichida nima bor:**

- \`products\` — jami / faol / nofaol / salonda tugagan / kam qolgan
- \`categories\` — jami / faol / nofaol / bo'sh (avtomobili yo'q)
- \`pickupPoints\` — jami / ochiq / yopiq / nechta shaharda / bo'sh / videosi bor /
  koordinatasiz / salonga biriktirilmagan avtomobillar
- \`stock\` — salondagi jami avtomobil, umumiy pul qiymati, o'rtacha narx
- \`latestProducts\` — oxirgi qo'shilgan 5 ta avtomobil

\`?threshold=3\` — "kam qolgan" chegarasini o'zgartiradi.`,
  })
  getStats(@Query() query: ThresholdQueryDto) {
    return this.dashboardService.getStats(query.threshold);
  }

  @Get('category-stats')
  @ResponseMessage('Kategoriyalar kesimidagi statistika')
  @ApiOperation({
    summary: 'Har bir kategoriya bo‘yicha statistika',
    description: `Har bir kategoriyada nechta avtomobil borligini, shundan nechtasi faolligini, jami nechta dona va qancha pullik tovar borligini qaytaradi.

Admin paneldagi diagramma yoki jadval uchun. Eng ko'p avtomobilli kategoriya birinchi keladi.

\`productsCount = 0\` bo'lgan kategoriyani bemalol o'chirsa bo'ladi.`,
  })
  getCategoryStats() {
    return this.dashboardService.getCategoryBreakdown();
  }

  @Get('pickup-point-stats')
  @ResponseMessage('Salonlar kesimidagi statistika')
  @ApiOperation({
    summary: 'Har bir salon bo‘yicha statistika',
    description: `Har bir salonda nechta avtomobil borligini, shundan nechtasi faolligini, jami nechta
dona va qancha pullik tovar turganini qaytaradi.

Admin paneldagi jadval yoki diagramma uchun. Eng ko'p avtomobilli salon birinchi keladi.

Qo'shimcha ikkita belgi bor:

- \`city\` — qaysi shaharda
- \`hasVideo\` — tanishtiruv videosi bormi (video havolasi emas, faqat bor/yo'q)

\`productsCount = 0\` bo'lgan salonni bemalol o'chirsa bo'ladi — himoya faqat
avtomobili bor salonlarga ishlaydi.`,
  })
  getPickupPointStats() {
    return this.dashboardService.getPickupPointBreakdown();
  }

  @Get('low-stock')
  @ResponseMessage('Salonda kam qolgan avtomobillar')
  @ApiOperation({
    summary: 'Salonda kam qolgan avtomobillar',
    description: `Salondagi soni chegaradan kam bo'lgan avtomobillarni qaytaradi (eng avval tugab qolganlari). Ko'pi bilan 50 ta.

- \`/dashboard/low-stock\` — 5 ta va undan kam qolganlar
- \`/dashboard/low-stock?threshold=10\` — 10 ta va undan kam qolganlar

"Salonni to'ldirish kerak" ogohlantirish ro'yxati uchun.`,
  })
  getLowStock(@Query() query: ThresholdQueryDto) {
    return this.dashboardService.getLowStockProducts(query.threshold);
  }
}
