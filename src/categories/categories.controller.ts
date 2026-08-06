import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('2. Categories — kategoriyalar')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ResponseMessage('Kategoriya qo‘shildi')
  @ApiOperation({
    summary: 'Yangi kategoriya qo‘shish',
    description: `Yangi kategoriya yaratadi va uni darhol **faol** holatda saqlaydi.

**Qoidalar:**

- \`name\` majburiy, 2–100 ta belgi
- Bir xil nomli ikkita kategoriya bo'lmaydi ("Sedan" va "sedan" bir xil hisoblanadi)

Nofaol kategoriya yaratib bo'lmaydi — avval qo'shing, keyin \`PATCH /categories/{id}/status\` orqali nofaol qiling.`,
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ResponseMessage('Kategoriyalar ro‘yxati')
  @ApiOperation({
    summary: 'Kategoriyalar ro‘yxati',
    description: `Kategoriyalarni ro'yxat qilib qaytaradi. Har birida \`productsCount\` — o'sha kategoriyada nechta mashina borligi ko'rsatiladi.

**Misollar:**

- \`/categories\` — barchasi
- \`/categories?search=sedan\` — nomida "sedan" bor
- \`/categories?isActive=false\` — faqat nofaollari
- \`/categories?sortBy=name&order=ASC\` — nomi bo'yicha A→Z
- \`/categories?page=2&limit=20\` — 2-sahifa, 20 tadan`,
  })
  findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Kategoriya ma’lumotlari')
  @ApiOperation({
    summary: 'Bitta kategoriyani ko‘rish',
    description: `Bitta kategoriyaning to'liq ma'lumotini va undagi mashinalar sonini (\`productsCount\`) qaytaradi.`,
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID raqami', example: 1 })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Put(':id')
  @ResponseMessage('Kategoriya to‘liq yangilandi')
  @ApiOperation({
    summary: 'Kategoriyani TO‘LIQ yangilash (PUT)',
    description: `Kategoriya ma'lumotini butunlay almashtiradi.

**PUT va PATCH farqi:**

- **PUT** — hamma maydonni yuborasiz. Yubormaganingiz tozalanadi (\`null\` bo'ladi)
- **PATCH** — faqat o'zgartirmoqchi bo'lganingizni yuborasiz

Masalan \`description\` ni yubormasangiz, PUT uni o'chirib yuboradi.`,
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID raqami', example: 1 })
  replace(@Param('id', ParseIdPipe) id: number, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.replace(id, dto);
  }

  @Patch(':id')
  @ResponseMessage('Kategoriya yangilandi')
  @ApiOperation({
    summary: 'Kategoriyani QISMAN yangilash (PATCH)',
    description: `Faqat yuborilgan maydonlarni o'zgartiradi.

Masalan \`{ "name": "Sedanlar" }\` yuborilsa, \`description\` o'zgarmay qoladi.`,
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID raqami', example: 1 })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Kategoriyani FAOL / NOFAOL qilish',
    description: `Kategoriyani sotuvga chiqaradi yoki sotuvdan olib qo'yadi.

**\`{ "isActive": false }\` — nofaol qilish:**
Kategoriya bilan birga undagi barcha mashinalar ham nofaol bo'ladi. Javobda nechtasi nofaol bo'lgani aniq yoziladi.

**\`{ "isActive": true }\` — faollashtirish:**
Faqat kategoriyaning o'zi yoqiladi. Mashinalar avtomatik yoqilmaydi — qaysi biri sotuvga chiqishini o'zingiz hal qilasiz.

Mashinasi bor kategoriyani o'chirib bo'lmaydi — o'chirish o'rniga shu endpointdan foydalaning.`,
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID raqami', example: 1 })
  changeStatus(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.categoriesService.changeStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Kategoriyani o‘chirish',
    description: `Kategoriyani bazadan butunlay o'chiradi.

**Muhim qoida:** agar kategoriyada bironta mashina bo'lsa, o'chirilmaydi. Bunday holda aniq tushuntirish qaytadi:

> «Sedan» kategoriyasini o'chira olmaysiz, chunki unda 18 ta mahsulot bor. Avval o'sha mahsulotlarni o'chiring yoki boshqa kategoriyaga ko'chiring.

**Nima qilish kerak:**

1. \`GET /products?categoryId={id}\` — mashinalarni ko'ring
2. Ularni o'chiring yoki \`PATCH /products/{id}\` bilan boshqa kategoriyaga o'tkazing
3. Yoki umuman o'chirmasdan, kategoriyani nofaol qiling`,
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID raqami', example: 1 })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
