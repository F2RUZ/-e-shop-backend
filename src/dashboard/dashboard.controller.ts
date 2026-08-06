import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { DashboardService } from './dashboard.service';
import { ThresholdQueryDto } from './dto/threshold-query.dto';

@ApiTags('4. Dashboard — umumiy statistika')
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

- \`products\` — jami / faol / nofaol / omborda tugagan / kam qolgan
- \`categories\` — jami / faol / nofaol / bo'sh (mashinasi yo'q)
- \`stock\` — ombordagi jami dona, umumiy pul qiymati, o'rtacha narx
- \`latestProducts\` — oxirgi qo'shilgan 5 ta mashina

\`?threshold=3\` — "kam qolgan" chegarasini o'zgartiradi.`,
  })
  getStats(@Query() query: ThresholdQueryDto) {
    return this.dashboardService.getStats(query.threshold);
  }

  @Get('category-stats')
  @ResponseMessage('Kategoriyalar kesimidagi statistika')
  @ApiOperation({
    summary: 'Har bir kategoriya bo‘yicha statistika',
    description: `Har bir kategoriyada nechta mashina borligini, shundan nechtasi faolligini, jami necha dona va qancha pullik tovar borligini qaytaradi.

Admin paneldagi diagramma yoki jadval uchun. Eng ko'p mashinali kategoriya birinchi keladi.

\`productsCount = 0\` bo'lgan kategoriyani bemalol o'chirsa bo'ladi.`,
  })
  getCategoryStats() {
    return this.dashboardService.getCategoryBreakdown();
  }

  @Get('low-stock')
  @ResponseMessage('Omborda kam qolgan mahsulotlar')
  @ApiOperation({
    summary: 'Omborda kam qolgan mashinalar',
    description: `Ombordagi soni chegaradan kam bo'lgan mashinalarni qaytaradi (eng avval tugab qolganlari). Ko'pi bilan 50 ta.

- \`/dashboard/low-stock\` — 5 ta va undan kam qolganlar
- \`/dashboard/low-stock?threshold=10\` — 10 ta va undan kam qolganlar

"Omborni to'ldirish kerak" ogohlantirish ro'yxati uchun.`,
  })
  getLowStock(@Query() query: ThresholdQueryDto) {
    return this.dashboardService.getLowStockProducts(query.threshold);
  }
}
