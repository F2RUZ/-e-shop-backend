import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('4. Products — avtomobillar')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Yangi avtomobil qo‘shish',
    description: `Yangi avtomobil yaratadi va uni darhol **faol** holatda saqlaydi.

**Qoidalar:**

- \`name\`, \`price\`, \`categoryId\` — majburiy
- \`price\` 0 dan katta bo'lishi kerak
- \`categoryId\` mavjud va **faol** bo'lishi kerak — nofaol kategoriyaga avtomobil qo'shilmaydi
- \`stock\` yuborilmasa — 0 bo'ladi`,
  })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ResponseMessage('Avtomobillar ro‘yxati')
  @ApiOperation({
    summary: 'Avtomobillar ro‘yxati',
    description: `Avtomobillarni kategoriyasi bilan birga ro'yxat qilib qaytaradi.

**Misollar:**

- \`/products\` — barchasi
- \`/products?search=toyota\` — nomida "toyota" bor
- \`/products?categoryId=1\` — faqat 1-kategoriyadagilar
- \`/products?isActive=false\` — faqat nofaollari
- \`/products?inStock=false\` — omborda tugaganlari
- \`/products?minPrice=200000000&maxPrice=500000000\` — narx oralig'i
- \`/products?sortBy=price&order=DESC\` — qimmatidan arzoniga

Kategoriyani o'chirolmayotgan bo'lsangiz, \`?categoryId=\` bilan undagi avtomobillarni toping.`,
  })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Avtomobil ma’lumotlari')
  @ApiOperation({
    summary: 'Bitta avtomobilni ko‘rish',
    description: `Bitta avtomobilning to'liq ma'lumotini, kategoriyasi bilan birga qaytaradi.`,
  })
  @ApiParam({ name: 'id', description: 'Avtomobil ID raqami', example: 1 })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Avtomobilni TO‘LIQ yangilash (PUT)',
    description: `Avtomobil ma'lumotini butunlay almashtiradi.

**PUT va PATCH farqi:**

- **PUT** — barcha maydonni yuborasiz. Yubormaganingiz tozalanadi (\`description\` va \`image\` → \`null\`, \`stock\` → \`0\`)
- **PATCH** — faqat o'zgartirmoqchi bo'lganingizni yuborasiz

Kundalik ishda odatda **PATCH** qulayroq.`,
  })
  @ApiParam({ name: 'id', description: 'Avtomobil ID raqami', example: 1 })
  replace(@Param('id', ParseIdPipe) id: number, @Body() dto: CreateProductDto) {
    return this.productsService.replace(id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Avtomobilni QISMAN yangilash (PATCH)',
    description: `Faqat yuborilgan maydonlarni o'zgartiradi.

**Misollar:**

- \`{ "price": 145000000 }\` — faqat narxni o'zgartirish
- \`{ "stock": 5 }\` — ombordagi sonini yangilash
- \`{ "categoryId": 2 }\` — boshqa kategoriyaga ko'chirish

Faol avtomobilni nofaol kategoriyaga ko'chirib bo'lmaydi.`,
  })
  @ApiParam({ name: 'id', description: 'Avtomobil ID raqami', example: 1 })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Avtomobilni FAOL / NOFAOL qilish',
    description: `Avtomobilni sotuvga chiqaradi yoki sotuvdan olib qo'yadi. Avtomobil bazadan o'chmaydi — shunchaki ko'rinmay turadi.

**\`{ "isActive": false }\`** — har doim ishlaydi.

**\`{ "isActive": true }\`** — faqat kategoriyasi faol bo'lsa ishlaydi. Aks holda aniq tushuntirish qaytadi:

> «Toyota Camry» avtomobilini faollashtira olmaysiz, chunki uning «Sedan» kategoriyasi nofaol. Avval kategoriyani faollashtiring.`,
  })
  @ApiParam({ name: 'id', description: 'Avtomobil ID raqami', example: 1 })
  changeStatus(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.productsService.changeStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Avtomobilni o‘chirish',
    description: `Avtomobilni bazadan butunlay o'chiradi. Bu amalni qaytarib bo'lmaydi.

Avtomobil vaqtincha sotuvda bo'lmasligi kerak bo'lsa — o'chirmang, \`PATCH /products/{id}/status\` bilan nofaol qiling.`,
  })
  @ApiParam({ name: 'id', description: 'Avtomobil ID raqami', example: 1 })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.productsService.remove(id);
  }
}
