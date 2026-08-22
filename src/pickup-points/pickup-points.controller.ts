import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import {
  ReverseGeocodeQueryDto,
  SearchGeocodeQueryDto,
} from './dto/geocode-query.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { QueryPickupPointDto } from './dto/query-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { PICKUP_POINTS_TAG } from './pickup-points.docs';
import {
  MAX_IMAGE_MB,
  MAX_UPLOAD_MB,
  MAX_VIDEO_SECONDS,
  imageUploadOptions,
  videoUploadOptions,
} from './upload.config';
import { GeocodingService } from './geocoding.service';
import { PickupPointsService } from './pickup-points.service';

@ApiTags(PICKUP_POINTS_TAG)
@ApiBearerAuth()
@Controller('pickup-points')
export class PickupPointsController {
  constructor(
    private readonly pickupPointsService: PickupPointsService,
    private readonly geocodingService: GeocodingService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Yangi salon qo‘shish',
    description: `Yangi tarqatuvchi salon yaratadi va uni darhol **ochiq** holatda saqlaydi.

**Majburiy maydonlar:** \`name\`, \`city\`, \`address\`, \`phone\`

**Qoidalar:**

- \`name\` takrorlanmaydi ("Chilonzor" va "chilonzor" bir xil hisoblanadi)
- \`phone\` ni xohlagan ko'rinishda yozing — \`+998 90 123 45 67\`, \`(90) 123-45-67\`, \`901234567\`.
  Server o'zi tozalab \`+998901234567\` ko'rinishida saqlaydi
- \`opensAt\` / \`closesAt\` — \`"09:00"\` ko'rinishida. Yubormasangiz 09:00 va 19:00 bo'ladi.
  Yopilish vaqti ochilishdan keyin bo'lishi shart
- \`latitude\` / \`longitude\` — ixtiyoriy, lekin ularsiz salon \`/nearby\` ro'yxatiga tushmaydi

Yopiq salon yaratib bo'lmaydi — avval qo'shing, keyin \`PATCH /pickup-points/{id}/status\` bilan yoping.`,
  })
  create(@Body() dto: CreatePickupPointDto) {
    return this.pickupPointsService.create(dto);
  }

  @Get()
  @ResponseMessage('Salonlar ro‘yxati')
  @ApiOperation({
    summary: 'Salonlar ro‘yxati',
    description: `Salonlarni ro'yxat qilib qaytaradi.

Har birida ikkita **hisoblangan** maydon bor (bazada bunday ustun yo'q):

- \`productsCount\` — shu salonda nechta avtomobil bor
- \`isOpenNow\` — hozir ochiqmi (Toshkent vaqti bilan)

**Misollar:**

- \`/pickup-points\` — barchasi
- \`/pickup-points?search=chilonzor\` — nomi, manzili yoki telefonida "chilonzor" bor
- \`/pickup-points?city=Samarqand\` — faqat Samarqanddagilar
- \`/pickup-points?isActive=true\` — faqat ochiqlari
- \`/pickup-points?sortBy=city&order=ASC\` — shahar bo'yicha A→Z

\`isOpenNow\` bo'yicha filtr **yo'q** — u bazada saqlanmaydi, shuning uchun SQL uni ko'rmaydi.`,
  })
  findAll(@Query() query: QueryPickupPointDto) {
    return this.pickupPointsService.findAll(query);
  }

  // DIQQAT: bu manzil `/:id` dan OLDIN turishi SHART.
  // Aks holda NestJS "nearby" so'zini ID deb o'qishga urinadi va xato beradi.
  @Get('nearby')
  @ApiOperation({
    summary: 'Eng yaqin salonlar',
    description: `Berilgan nuqtaga eng yaqin **ochiq** salonlarni topadi va masofasi bilan qaytaradi.

**Majburiy:** \`lat\` va \`lng\` — foydalanuvchi turgan joyning koordinatasi.
Brauzerda uni \`navigator.geolocation.getCurrentPosition()\` beradi.

**Misol:** \`/pickup-points/nearby?lat=41.311081&lng=69.240562&radiusKm=25&limit=5\`

Javobdagi har bir salonda \`distanceKm\` maydoni bo'ladi va ro'yxat eng yaqinidan
boshlab saralangan bo'ladi.

**Kim ro'yxatga tushmaydi:**

- yopiq salonlar (\`isActive: false\`)
- koordinatasi yozilmagan salonlar — masofasini hisoblab bo'lmaydi
- \`radiusKm\` dan uzoqdagilar

Hech kim topilmasa, xato emas — bo'sh ro'yxat va kengroq qidirish maslahati qaytadi.

Masofa **Haversine** formulasi bilan hisoblanadi (Yer shar shaklida bo'lgani uchun
oddiy Pifagor teoremasi bu yerda ishlamaydi).`,
  })
  findNearby(@Query() query: NearbyQueryDto) {
    return this.pickupPointsService.findNearby(query);
  }

  // Bu ikkisi ham `/:id` dan OLDIN turishi SHART.
  @Get('geocode')
  @ResponseMessage('Koordinata bo‘yicha manzil')
  @ApiOperation({
    summary: 'Koordinatadan manzilni aniqlash',
    description: `Xaritada belgilangan nuqtaning **manzilini** qaytaradi — shahar, ko'cha,
uy raqami va salon nomiga taklif.

**Nima uchun kerak:** hech kim koordinatasini yoddan bilmaydi. Foydalanuvchi
xaritadan joyni bosadi, panel esa shu endpoint orqali manzilni o'zi to'ldiradi.

**Misol:** \`/pickup-points/geocode?lat=41.275&lng=69.204\`

\`\`\`json
{
  "displayName": "12, Bunyodkor shoh ko'chasi, Chilonzor, Toshkent",
  "suggestedName": "Chilonzor",
  "city": "Toshkent",
  "address": "Bunyodkor shoh ko'chasi, 12",
  "latitude": 41.275,
  "longitude": 69.204
}
\`\`\`

Ma'lumot **OpenStreetMap** (Nominatim) dan olinadi — bepul, API kaliti kerak emas.

**Nega brauzerdan emas, backend orqali:** Nominatim sekundiga bitta so'rovga
ruxsat beradi. Har bir o'quvchining brauzeri alohida urilsa, xizmat butun
sinfni bloklab qo'yadi. Bu yerda so'rovlar navbatga solinadi va javob
keshlanadi — bir xil nuqta qayta so'ralsa tashqariga umuman chiqilmaydi.

Xizmat javob bermasa **503** qaytadi — bunda koordinatani qo'lda belgilash kerak.`,
  })
  geocode(@Query() query: ReverseGeocodeQueryDto) {
    return this.geocodingService.reverse(query.lat, query.lng);
  }

  @Get('geocode/search')
  @ResponseMessage('Manzil bo‘yicha koordinata')
  @ApiOperation({
    summary: 'Manzildan koordinatani topish',
    description: `Yozilgan manzil bo'yicha **koordinatani** qaytaradi — xaritani o'sha joyga
olib boradi.

**Misol:** \`/pickup-points/geocode/search?q=Chilonzor Bunyodkor 12\`

Javob \`/geocode\` bilan bir xil ko'rinishda.

Qidiruv **O'zbekiston bilan chegaralangan** — «Chilonzor» degan joy dunyoda
bitta emas, aks holda xarita boshqa mamlakatga uchib ketardi.

Topilmasa **400**, xizmat ishlamasa **503** qaytadi.`,
  })
  geocodeSearch(@Query() query: SearchGeocodeQueryDto) {
    return this.geocodingService.search(query.q);
  }

  @Get('cities')
  @ApiOperation({
    summary: 'Salon bor shaharlar (joylashuv aniqlanmaganda)',
    description: `Salon bor shaharlar ro'yxatini qaytaradi. Har biri bilan birga o'sha shaharda
nechta ochiq salon borligi va shaharning taxminiy markazi (\`latitude\`, \`longitude\`).

**Bu nima uchun kerak:** \`/nearby\` brauzerdan koordinata oladi, lekin u har doim ham
ishlamaydi:

- foydalanuvchi «ruxsat bermayman» deydi
- qurilmada GPS yo'q yoki xona ichida signal yetmaydi
- sahifa HTTPS emas — brauzer joylashuvni umuman bermaydi

Shunday paytda foydalanuvchidan **«qaysi shaharda turibsiz?»** deb so'rash kerak.
Shu endpoint aynan o'sha ro'yxatni beradi — hech qanday tashqi xizmat, xarita yoki
API kaliti kerak emas.

**Keyin nima qilinadi — ikki yo'l:**

1. \`GET /pickup-points?city=Toshkent\` — o'sha shahardagi salonlar
2. Yoki qaytgan \`latitude\`/\`longitude\` ni \`/nearby\` ga yuborasiz — shunda ro'yxat
   masofasi bilan, eng yaqinidan boshlab keladi

Faqat **ochiq** salonlar hisobga olinadi. Hamma saloni yopiq shahar ro'yxatda ko'rinmaydi.`,
  })
  @ResponseMessage('Salon bor shaharlar')
  findCities() {
    return this.pickupPointsService.findCities();
  }

  @Get(':id')
  @ResponseMessage('Salon ma’lumotlari')
  @ApiOperation({
    summary: 'Bitta salonni ko‘rish',
    description: `Bitta salonning to'liq ma'lumotini, undagi avtomobillar soni (\`productsCount\`) va
hozir ochiqligi (\`isOpenNow\`) bilan birga qaytaradi.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.pickupPointsService.findOne(id);
  }

  @Get(':id/products')
  @ResponseMessage('Salondagi avtomobillar')
  @ApiOperation({
    summary: 'Salondagi avtomobillar ro‘yxati',
    description: `Shu salonda turgan avtomobillarni kategoriyasi bilan birga qaytaradi.

**Misol:** \`/pickup-points/3/products?page=1&limit=20\`

Bu yerda faqat sahifalash bor. Qidiruv, narx oralig'i va boshqa filtrlar kerak bo'lsa
avtomobillar ro'yxatidan foydalaning: \`GET /api/products?pickupPointId=3\`

Salonni o'chirolmayotgan bo'lsangiz — avval shu ro'yxatni ko'ring.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  findProducts(@Param('id', ParseIdPipe) id: number, @Query() query: PaginationQueryDto) {
    return this.pickupPointsService.findProducts(id, query);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Salonni TO‘LIQ yangilash (PUT)',
    description: `Salon ma'lumotini butunlay almashtiradi.

**PUT va PATCH farqi:**

- **PUT** — hamma maydonni yuborasiz. Yubormaganingiz tozalanadi:
  \`latitude\`, \`longitude\`, \`image\` → \`null\`, \`opensAt\` → \`09:00\`, \`closesAt\` → \`19:00\`
- **PATCH** — faqat o'zgartirmoqchi bo'lganingizni yuborasiz

Masalan koordinatani yubormasangiz, PUT uni o'chirib yuboradi va salon
\`/nearby\` ro'yxatidan tushib qoladi. Kundalik ishda **PATCH** xavfsizroq.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  replace(@Param('id', ParseIdPipe) id: number, @Body() dto: CreatePickupPointDto) {
    return this.pickupPointsService.replace(id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Salonni QISMAN yangilash (PATCH)',
    description: `Faqat yuborilgan maydonlarni o'zgartiradi.

**Misollar:**

- \`{ "phone": "+998907776655" }\` — faqat telefonni almashtirish
- \`{ "opensAt": "10:00", "closesAt": "20:00" }\` — ish vaqtini o'zgartirish
- \`{ "latitude": 41.285, "longitude": 69.204 }\` — xaritadagi joyini belgilash
- \`{ "image": null }\` — rasmni olib tashlash

**\`null\` haqida:** \`latitude\`, \`longitude\` va \`image\` ga \`null\` yuborsa bo'ladi —
bu «tozalab tashla» degani. Qolgan maydonlarga (\`name\`, \`city\`, \`address\`, \`phone\`,
\`opensAt\`, \`closesAt\`) \`null\` yuborilsa aniq xato qaytadi, chunki ular bo'sh qola olmaydi.

Bo'sh \`{}\` yuborsangiz ham xato qaytadi — o'zgartiradigan narsa yo'q.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdatePickupPointDto) {
    return this.pickupPointsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Salonni OCHIQ / YOPIQ qilish',
    description: `Salonni vaqtincha yopadi yoki qaytadan ochadi.

**\`{ "isActive": false }\` — yopish:**
Salondagi avtomobillar **sotuvda qolaveradi**. Bu kategoriyadan asosiy farqi:
kategoriya nofaol qilinsa undagi avtomobillar ham nofaol bo'lardi.

Nega bunday? Kategoriya avtomobilning **o'z xususiyati** (bu — sedan), salon esa
shunchaki **turgan joyi**. Salon ta'mirga yopilgani avtomobilni sotuvdan chiqarmaydi —
uni boshqa salonga ko'chirish kifoya.

**\`{ "isActive": true }\` — qayta ochish:** salon yana \`/nearby\` ro'yxatida ko'rinadi.

Yopiq salon \`isOpenNow: false\` bo'ladi — ish vaqti nima bo'lishidan qat'i nazar.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  changeStatus(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.pickupPointsService.changeStatus(id, dto);
  }

  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: `Rasm fayl (jpg, png, webp). ${MAX_IMAGE_MB} MB gacha.`,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiOperation({
    summary: 'Salonga rasm yuklash',
    description: `Salon rasmini yuklaydi. **Har bir salonda bitta rasm** — yangisini yuklasangiz
eskisi avtomatik o'chadi.

**Yuborish qoidasi:** \`multipart/form-data\`, fayl maydonining nomi — \`image\`.

| | |
|---|---|
| Formatlar | \`jpg\`, \`png\`, \`webp\` |
| Hajmi | **${MAX_IMAGE_MB} MB** gacha |

Server rasmni o'zi kichiklashtiradi (kengligi 1280px) va JPEG qilib saqlaydi —
telefondagi 6 MB lik surat ~150 KB bo'lib qoladi.

**Rasm ikki xil bo'lishi mumkin:**

- \`image\` — tashqi havola (\`PATCH\` orqali qo'yiladi)
- \`imagePath\` — shu yerga yuklangan fayl

Ikkalasi BIRGA turmaydi: rasm yuklansa tashqi havola tozalanadi, tashqi havola
qo'yilsa yuklangan rasm o'chadi. Frontend ikkalasini ham bilmaydi — u tayyor
\`imageUrl\` maydonini oladi.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  uploadImage(@Param('id', ParseIdPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    return this.pickupPointsService.uploadImage(id, file);
  }

  @Delete(':id/image')
  @ApiOperation({
    summary: 'Salon rasmini o‘chirish',
    description: `Yuklangan rasmni diskdan va bazadan o'chiradi.

Tashqi havola (\`image\`) bilan qo'yilgan rasmga bu TEGMAYDI — uni o'chirish uchun
\`PATCH /pickup-points/{id}\` ga \`{ "image": null }\` yuboring.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  removeImage(@Param('id', ParseIdPipe) id: number) {
    return this.pickupPointsService.removeImage(id);
  }

  @Post(':id/video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['video'],
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: `Video fayl (mp4, mov, webm). ${MAX_UPLOAD_MB} MB gacha.`,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('video', videoUploadOptions))
  @ApiOperation({
    summary: 'Salonga video yuklash',
    description: `Salonning tanishtiruv videosini yuklaydi. **Har bir salonda bitta video** —
yangisini yuklasangiz eskisi avtomatik o'chadi.

**Yuborish qoidasi:** \`multipart/form-data\`, fayl maydonining nomi — \`video\`.

| | |
|---|---|
| Formatlar | \`mp4\`, \`mov\`, \`webm\` (telefon videosi shulardan biri bo'ladi) |
| Yuklash hajmi | **${MAX_UPLOAD_MB} MB** gacha |
| Uzunligi | **${MAX_VIDEO_SECONDS} soniya**. Uzunroq bo'lsa server o'zi kesadi |

**Videoni oldindan siqish SHART EMAS** — server uni o'zi qayta ishlaydi: 480p,
24 kadr/sekund, ovoz mono. Telefondagi 60 MB lik video shu yerdan ~2 MB bo'lib chiqadi.

**Javob 10–20 soniyada keladi:** avval fayl yuklanadi, keyin siqiladi. Frontendda
progress bar qo'ying — bola nima bo'layotganini ko'rib tursin.

Javobdagi \`videoUrl\` — tayyor havola, uni to'g'ridan-to'g'ri \`<video src="...">\` ga
qo'ysa bo'ladi. Video ko'rish uchun token kerak emas (xuddi avtomobil rasmlari kabi).

**Bir vaqtda 2 tadan ortiq video siqilmaydi** — serverda 4 ta protsessor yadrosi bor.
Uchinchi bola yuborsa, so'rovi navbatda kutadi va biroz kechroq javob oladi.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  uploadVideo(@Param('id', ParseIdPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    return this.pickupPointsService.uploadVideo(id, file);
  }

  @Delete(':id/video')
  @ApiOperation({
    summary: 'Salon videosini o‘chirish',
    description: `Videoni diskdan va bazadan o'chiradi. Salonning o'ziga tegilmaydi.

Salonda video bo'lmasa 404 qaytadi.

Eslatma: salonning o'zi o'chirilganda videosi ham avtomatik o'chadi — buni alohida
chaqirish shart emas.`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  removeVideo(@Param('id', ParseIdPipe) id: number) {
    return this.pickupPointsService.removeVideo(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Salonni o‘chirish',
    description: `Salonni bazadan butunlay o'chiradi.

**Muhim qoida:** agar salonda bironta avtomobil bo'lsa, o'chirilmaydi. Bunday holda
aniq tushuntirish qaytadi:

> «Magnate Motors — Chilonzor» salonini o'chira olmaysiz, chunki unda 12 ta avtomobil bor.

**Nima qilish kerak:**

1. \`GET /pickup-points/{id}/products\` — avtomobillarni ko'ring
2. Ularni boshqa salonga ko'chiring: \`PATCH /products/{id}  { "pickupPointId": 2 }\`
3. Yoki salondan butunlay chiqaring: \`PATCH /products/{id}  { "pickupPointId": null }\`
4. Yoki umuman o'chirmasdan, salonni yopib qo'ying`,
  })
  @ApiParam({ name: 'id', description: 'Salon ID raqami', example: 1 })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.pickupPointsService.remove(id);
  }
}
