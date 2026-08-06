import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { withMessage } from '../common/helpers/with-message.helper';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { Admin } from './entities/admin.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Login + parol tekshiriladi va JWT token beriladi. */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    // `password` ustuni entity'da select:false — shuning uchun uni ataylab so'raymiz
    const admin = await this.adminRepository.findOne({
      where: { login: dto.login },
      select: ['id', 'login', 'password', 'fullName', 'createdAt', 'updatedAt'],
    });

    // Xavfsizlik uchun "login topilmadi" va "parol xato" bir xil matn qaytaradi
    const passwordIsValid = admin && (await bcrypt.compare(dto.password, admin.password));

    if (!passwordIsValid) {
      throw new UnauthorizedException('Login yoki parol noto‘g‘ri.');
    }

    const payload: JwtPayload = { sub: admin.id, login: admin.login };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');

    delete admin.password; // javobga parol hech qachon tushmasin

    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn,
      admin,
    };
  }

  /** Token orqali aniqlangan adminning o'z ma'lumotlari. */
  getProfile(admin: Admin): Admin {
    return admin;
  }

  /** Admin o'z parolini o'zgartiradi. */
  async changePassword(adminId: number, dto: ChangePasswordDto) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
      select: ['id', 'login', 'password'],
    });

    const oldPasswordIsValid = await bcrypt.compare(dto.oldPassword, admin.password);
    if (!oldPasswordIsValid) {
      throw new BadRequestException('Hozirgi parol noto‘g‘ri kiritildi.');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('Yangi parol eskisidan farq qilishi kerak.');
    }

    admin.password = await bcrypt.hash(dto.newPassword, 10);
    await this.adminRepository.save(admin);

    return withMessage('Parol muvaffaqiyatli o‘zgartirildi. Endi yangi parol bilan kiring.', {
      login: admin.login,
    });
  }
}
