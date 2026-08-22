import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Admin } from './entities/admin.entity';

@ApiTags('2. Auth — tizimga kirish')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tizimga muvaffaqiyatli kirdingiz')
  @ApiOperation({
    summary: 'Tizimga kirish (token olish)',
    description: `Login va parolni tekshirib, JWT token qaytaradi.

**Default admin:** \`admin\` / \`admin123\`

**Qadamlar:**

1. "Try it out" → Execute
2. Javobdagi \`accessToken\` ni nusxalang
3. Yuqoridagi **Authorize** tugmasiga qo'ying

**Xatolik:** login yoki parol xato bo'lsa — \`Login yoki parol noto'g'ri.\``,
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ResponseMessage('Admin ma’lumotlari')
  @ApiOperation({
    summary: 'Hozirgi adminni bilish',
    description: `Yuborilgan token kimga tegishli ekanini qaytaradi.

Frontendda "Salom, {ism}" ni ko'rsatish va token hali amal qilyaptimi tekshirish uchun ishlatiladi.`,
  })
  getMe(@CurrentAdmin() admin: Admin) {
    return this.authService.getProfile(admin);
  }

  /*
   * Parolni o'zgartirish endpointi ATAYLAB OLIB TASHLANGAN.
   *
   * Sabab: hamma bitta `admin` hisobidan foydalanadi. Kimdir parolni
   * o'zgartirsa — qolganlar tizimga kira olmay qoladi. Parolni faqat
   * server egasi `.env` dagi ADMIN_PASSWORD orqali belgilaydi.
   */
}
