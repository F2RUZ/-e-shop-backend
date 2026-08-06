import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { Admin } from './entities/admin.entity';

@ApiTags('1. Auth — tizimga kirish')
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

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Parolni o‘zgartirish',
    description: `Adminning parolini yangilaydi.

**Qoidalar:**

- Eski parol to'g'ri kiritilishi shart
- Yangi parol kamida 6 ta belgi
- Yangi parol eskisidan farq qilishi kerak`,
  })
  changePassword(@CurrentAdmin('id') adminId: number, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(adminId, dto);
  }
}
