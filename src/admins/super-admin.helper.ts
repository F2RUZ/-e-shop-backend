import { ConfigService } from '@nestjs/config';
import { Admin } from '../auth/entities/admin.entity';

/**
 * SUPER ADMIN kim?
 *
 * Bu hisobni hech kim qo'lda yaratmaydi — tizim o'zi yaratadi.
 * `SeedService` har safar ishga tushganda `.env` dagi ADMIN_LOGIN loginli
 * admin bor-yo'qligini tekshiradi va bo'lmasa o'zi qo'shib qo'yadi.
 * Shuning uchun super admin DOIM bitta bo'ladi va hech qachon yo'qolmaydi.
 *
 * Qolgan barcha adminlarni esa super adminning o'zi qo'shadi.
 */

/** .env dagi ADMIN_LOGIN. Yozilmagan bo'lsa 'admin' (SeedService ham shu qiymatni oladi). */
export function superAdminLogin(configService: ConfigService): string {
  return configService.get<string>('ADMIN_LOGIN', 'admin').trim();
}

/** Berilgan admin — o'sha bosh hisobmi? Katta-kichik harf farqi hisobga olinmaydi. */
export function isSuperAdmin(admin: Admin | undefined, configService: ConfigService): boolean {
  if (!admin?.login) {
    return false;
  }

  return admin.login.toLowerCase() === superAdminLogin(configService).toLowerCase();
}
