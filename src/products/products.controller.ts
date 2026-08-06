import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('3. Products — mashinalar')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ResponseMessage('Mahsulot qo‘shildi')
  @ApiOperation({
    summary: 'Yangi mashina qo‘shish',
    description: `Yangi mashina yaratadi va uni darhol **faol** holatda saqlaydi.

**Qoidalar:**

- \`name\`, \`price\`, \`categoryId\` — majburiy
- \`price\` 0 dan katta bo'lishi kerak
- \`categoryId\` mavjud va **faol** bo'lishi kerak — nofaol kategoriyaga mashina qo'shilmaydi
- \`stock\` yuborilmasa — 0 bo'ladi`,
  })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ResponseMessage('Mahsulotlar ro‘yxati')
  @ApiOperation({
    summary: 'Mashinalar ro‘yxati',
    description: `Mashinalarni kategoriyasi bilan birga ro'yxat qilib qaytaradi.

**Misollar:**

- \`/products\` — barchasi
- \`/products?search=toyota\` — nomida "toyota" bor
- \`/products?categoryId=1\` — faqat 1-kategoriyadagilar
- \`/products?isActive=false\` — faqat nofaollari
- \`/products?inStock=false\` — omborda tugaganlari
- \`/products?minPrice=200000000&maxPrice=500000000\` — narx oralig'i
- \`/products?sortBy=price&order=DESC\` — qimmatidan arzoniga

Kategoriyani o'chirolmayotgan bo'lsangiz, \`?categoryId=\` bilan undagi mashinalarni toping.`,
  })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Mahsulot ma’lumotlari')
  @ApiOperation({
    summary: 'Bitta mashinani ko‘rish',
    description: `Bitta mashinaning to'liq ma'lumotini, kategoriyasi bilan birga qaytaradi.`,
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID raqami', example: 1 })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ResponseMessage('Mahsulot to‘liq yangilandi')
  @ApiOperation({
    summary: 'Mashinani TO‘LIQ yangilash (PUT)',
    description: `Mashina ma'lumotini butunlay almashtiradi.

**PUT va PATCH farqi:**

- **PUT** — barcha maydonni yuborasiz. Yubormaganingiz tozalanadi (\`description\` va \`image\` → \`null\`, \`stock\` → \`0\`)
- **PATCH** — faqat o'zgartirmoqchi bo'lganingizni yuborasiz

Kundalik ishda odatda **PATCH** qulayroq.`,
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID raqami', example: 1 })
  replace(@Param('id', ParseIdPipe) id: number, @Body() dto: CreateProductDto) {
    return this.productsService.replace(id, dto);
  }

  @Patch(':id')
  @ResponseMessage('Mahsulot yangilandi')
  @ApiOperation({
    summary: 'Mashinani QISMAN yangilash (PATCH)',
    description: `Faqat yuborilgan maydonlarni o'zgartiradi.

**Misollar:**

- \`{ "price": 145000000 }\` — faqat narxni o'zgartirish
- \`{ "stock": 5 }\` — ombordagi sonini yangilash
- \`{ "categoryId": 2 }\` — boshqa kategoriyaga ko'chirish

Faol mashinani nofaol kategoriyaga ko'chirib bo'lmaydi.`,
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID raqami', example: 1 })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Mashinani FAOL / NOFAOL qilish',
    description: `Mashinani sotuvga chiqaradi yoki sotuvdan olib qo'yadi. Mashina bazadan o'chmaydi — shunchaki ko'rinmay turadi.

**\`{ "isActive": false }\`** — har doim ishlaydi.

**\`{ "isActive": true }\`** — faqat kategoriyasi faol bo'lsa ishlaydi. Aks holda aniq tushuntirish qaytadi:

> «Toyota Camry» mahsulotini faollashtira olmaysiz, chunki uning «Sedan» kategoriyasi nofaol. Avval kategoriyani faollashtiring.`,
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID raqami', example: 1 })
  changeStatus(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.productsService.changeStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Mashinani o‘chirish',
    description: `Mashinani bazadan butunlay o'chiradi. Bu amalni qaytarib bo'lmaydi.

Mashina vaqtincha sotuvda bo'lmasligi kerak bo'lsa — o'chirmang, \`PATCH /products/{id}/status\` bilan nofaol qiling.`,
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID raqami', example: 1 })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.productsService.remove(id);
  }
}
