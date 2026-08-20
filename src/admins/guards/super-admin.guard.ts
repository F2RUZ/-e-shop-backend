import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Admin } from '../../auth/entities/admin.entity';
import { isSuperAdmin } from '../super-admin.helper';

/**
 * Admin qo'shish / tahrirlash / o'chirish — faqat SUPER ADMIN uchun.
 *
 * Bu guard faqat o'zgartiruvchi endpointlarga qo'yilgan (POST, PUT, PATCH, DELETE).
 * Ro'yxatni ko'rish (GET) hamma uchun ochiq — super admin qo'shgan oddiy admin
 * kimlar borligini ko'ra oladi, lekin hech kimni (hatto o'zini ham) o'zgartira olmaydi.
 *
 * Nima uchun shunday: agar har bir admin boshqasini o'chira olsa, ular
 * bir-birini tizimdan chiqarib yuborardi va kim qilgani ham bilinmasdi.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Global JwtAuthGuard tokenni allaqachon tekshirib, adminni shu yerga qo'yib ketgan
    const request = context.switchToHttp().getRequest<{ user?: Admin }>();

    if (!isSuperAdmin(request.user, this.configService)) {
      throw new ForbiddenException(
        'Admin hisoblarini faqat bosh admin (super admin) qo‘sha, tahrirlay va o‘chira oladi. ' +
          'Siz ularni faqat ko‘rishingiz mumkin: GET /api/admins. ' +
          'Avtomobil va kategoriyalar bilan esa odatdagidek ishlayverasiz.',
      );
    }

    return true;
  }
}
