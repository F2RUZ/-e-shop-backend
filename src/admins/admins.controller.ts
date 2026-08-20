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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Admin } from '../auth/entities/admin.entity';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { AdminsService } from './admins.service';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { SuperAdminGuard } from './guards/super-admin.guard';

@ApiTags('2. Admins — boshqaruvchilar')
@ApiBearerAuth()
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Yangi admin qo‘shish (faqat bosh admin)',
    description: `Panelga kira oladigan yangi boshqaruvchi qo'shadi.

**Kim qo'sha oladi:** faqat **bosh admin** (super admin). Oddiy admin bu tugmani bossa 403 qaytadi:

> «Admin hisoblarini faqat bosh admin (super admin) qo'sha, tahrirlay va o'chira oladi.»

**Qoidalar:**

- \`login\` takrorlanmaydi va kichik harfga o'tkazib saqlanadi — «Sardor» ham «sardor» ham bir xil
- \`login\` da faqat lotin harflari, raqamlar va \`. _ -\` bo'ladi (probel yo'q, chunki u bilan tizimga kiriladi)
- \`password\` kamida 6 ta belgi — katta harf yoki maxsus belgi **shart emas**
- parol bazaga shifrlab yoziladi va javobda **hech qachon** qaytmaydi

**Yangi admin nima qila oladi:** avtomobil va kategoriyalar bilan to'liq ishlaydi,
adminlar ro'yxatini ko'radi, o'z parolini almashtiradi. Boshqa adminni qo'sha,
tahrirlay yoki o'chira olmaydi.`,
  })
  create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }

  @Get()
  @ResponseMessage('Adminlar ro‘yxati')
  @ApiOperation({
    summary: 'Adminlar ro‘yxati',
    description: `Panelga kira oladigan barcha adminlarni ro'yxat qilib qaytaradi.

**Kim ko'ra oladi:** tizimga kirgan **har qanday** admin. Bu yagona bo'lim
oddiy admin uchun ham ochiq — lekin faqat **ko'rish** uchun.

**Misollar:**

- \`/admins\` — barchasi
- \`/admins?search=sardor\` — login yoki ismida "sardor" bor
- \`/admins?sortBy=createdAt&order=DESC\` — eng oxirgi qo'shilgani birinchi

Har bir yozuvda \`isSuperAdmin\` belgisi bor: \`true\` bo'lsa — bu tizim o'zi
yaratgan bosh admin, uni tahrirlab ham, o'chirib ham bo'lmaydi.

Parol maydoni bu ro'yxatda umuman yo'q — u bazadan hech qachon o'qilmaydi.`,
  })
  findAll(@Query() query: QueryAdminDto) {
    return this.adminsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Admin ma’lumotlari')
  @ApiOperation({
    summary: 'Bitta adminni ko‘rish',
    description: `ID bo'yicha bitta adminning ma'lumotlarini qaytaradi.

Tizimga kirgan har qanday admin ko'ra oladi. Parol bu yerda ham qaytmaydi.

Topilmasa aniq xabar beriladi:

> «ID = 7 bo'lgan admin topilmadi.»`,
  })
  @ApiParam({ name: 'id', description: 'Admin ID raqami', example: 2 })
  findOne(@Param('id', ParseIdPipe) id: number) {
    return this.adminsService.findOne(id);
  }

  @Patch('me/password')
  @ApiOperation({
    summary: 'O‘z parolini almashtirish',
    description: `Har bir admin FAQAT o'zining parolini almashtiradi.

**Login bu yerda o'zgarmaydi** — loginni faqat bosh admin o'zgartira oladi
(\`PATCH /api/admins/{id}\`).

**Qanday ishlaydi:**

1. \`currentPassword\` — hozirgi parolingiz, haqiqatan siz ekaningizni tekshiradi
2. \`newPassword\` — yangi parol, kamida 6 ta belgi

Hozirgi parol xato bo'lsa:

> «Hozirgi parolingiz noto'g'ri. Esingizdan chiqqan bo'lsa — bosh adminga ayting, u yangisini qo'yib beradi.»

**Bosh admin bu yo'ldan foydalana olmaydi.** Uning paroli serverdagi \`.env\`
faylda turadi va hamma o'quvchi shu bitta hisob orqali kiradi — kimdir parolni
almashtirsa qolganlar tizimga kira olmay qolardi.`,
  })
  changeOwnPassword(@CurrentAdmin() admin: Admin, @Body() dto: ChangeOwnPasswordDto) {
    return this.adminsService.changeOwnPassword(admin, dto);
  }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Adminni to‘liq yangilash (faqat bosh admin)',
    description: `Adminning login, parol va ismini QAYTADAN yozadi — uchalasi ham majburiy.

**PUT va PATCH farqi:**

- \`PUT\` — hamma maydonni yuborasiz, hammasi almashadi
- \`PATCH\` — faqat o'zgartirmoqchi bo'lganingizni yuborasiz

Bosh adminni (super admin) o'zgartirib bo'lmaydi:

> «admin» — bosh admin (super admin), uni o'zgartira olmaysiz.`,
  })
  @ApiParam({ name: 'id', description: 'Admin ID raqami', example: 2 })
  replace(@Param('id', ParseIdPipe) id: number, @Body() dto: CreateAdminDto) {
    return this.adminsService.replace(id, dto);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Adminni qisman o‘zgartirish (faqat bosh admin)',
    description: `Faqat yuborilgan maydonlarni o'zgartiradi.

**Misollar:**

- \`{ "fullName": "Sardor Aliyev" }\` — faqat ism
- \`{ "password": "yangi123" }\` — parolni tiklab berish (admin parolini unutgan bo'lsa)
- \`{ "login": "sardor2" }\` — loginni almashtirish

**Eslatma:** admin o'z parolini o'zi ham almashtira oladi —
\`PATCH /api/admins/me/password\`. Lekin loginini o'zi o'zgartira olmaydi,
uni faqat siz — bosh admin — o'zgartirasiz.

Bosh adminning o'ziga bu yerdan tegib bo'lmaydi.`,
  })
  @ApiParam({ name: 'id', description: 'Admin ID raqami', example: 2 })
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateAdminDto) {
    return this.adminsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Adminni o‘chirish (faqat bosh admin)',
    description: `Adminni bazadan butunlay o'chiradi — u endi tizimga kira olmaydi.

**Muhim qoida:** bosh adminni (super admin) hech kim o'chira olmaydi:

> «admin» — bosh admin (super admin), uni o'chira olmaysiz. Bu hisobni tizim o'zi yaratadi va o'zi himoya qiladi: o'chirilsa hech kim tizimga kira olmay qoladi.

Adminning avtomobil va kategoriyalarga qo'shgan ishlari o'chmaydi — bu loyihada
kim nima qilgani alohida yozilmaydi, shuning uchun uning ma'lumotlari joyida qoladi.`,
  })
  @ApiParam({ name: 'id', description: 'Admin ID raqami', example: 2 })
  remove(@Param('id', ParseIdPipe) id: number) {
    return this.adminsService.remove(id);
  }
}
