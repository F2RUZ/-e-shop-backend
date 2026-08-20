import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Admin } from '../auth/entities/admin.entity';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.dto';
import { withMessage } from '../common/helpers/with-message.helper';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { isSuperAdmin } from './super-admin.helper';

/** Parol necha marta "aralashtirilib" shifrlanadi — SeedService dagi bilan bir xil. */
const BCRYPT_ROUNDS = 10;

/**
 * Javobga qo'shiladigan qo'shimcha belgi.
 * Panel shu belgiga qarab bosh adminning «O'chirish» tugmasini yashiradi,
 * «Tahrirlash» formasida esa login va parol maydonlarini qulflaydi.
 */
type AdminResponse = Admin & { isSuperAdmin: boolean };

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────── CREATE ───────────────────────────────

  async create(dto: CreateAdminDto) {
    await this.ensureLoginIsFree(dto.login);

    const admin = this.adminRepository.create({
      login: dto.login,
      // parol hech qachon ochiq holda saqlanmaydi — faqat shifrlangan ko'rinishda
      password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      fullName: dto.fullName,
    });

    const saved = await this.adminRepository.save(admin);

    return withMessage(
      `«${saved.fullName}» admin sifatida qo‘shildi. ` +
        `Endi u «${saved.login}» logini va siz bergan parol bilan tizimga kira oladi.`,
      await this.findOne(saved.id),
    );
  }

  // ──────────────────────────────── READ ────────────────────────────────

  async findAll(query: QueryAdminDto): Promise<PaginatedResult<AdminResponse>> {
    const { page, limit, search, sortBy, order } = query;

    // `password` ustuni entity'da select:false — u bu yerga hech qachon tushmaydi
    const qb = this.adminRepository.createQueryBuilder('admin');

    if (search) {
      qb.andWhere('(admin.login ILIKE :search OR admin.fullName ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy(`admin.${sortBy}`, order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(
      items.map((admin) => this.toResponse(admin)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: number): Promise<AdminResponse> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  // ─────────────────────────────── UPDATE ───────────────────────────────

  /** PUT — uchala maydonni ham qaytadan yozadi (login, parol, ism majburiy). */
  async replace(id: number, dto: CreateAdminDto) {
    const admin = await this.findEntityOrFail(id);
    this.ensureSuperAdminChangeIsAllowed(admin, dto);
    await this.ensureLoginIsFree(dto.login, id);

    admin.login = dto.login;
    admin.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    admin.fullName = dto.fullName;

    await this.adminRepository.save(admin);

    return withMessage(
      `«${admin.fullName}» admini to‘liq yangilandi (PUT — login, parol va ism qaytadan yozildi).`,
      await this.findOne(id),
    );
  }

  /** PATCH — faqat yuborilgan maydonlarni o'zgartiradi. */
  async update(id: number, dto: UpdateAdminDto) {
    this.ensureNoNullFields(dto);

    const changed = Object.keys(dto);

    // Bo'sh tana yuborilgan: {} — o'zgartiradigan narsa yo'q
    if (changed.length === 0) {
      throw new BadRequestException(
        'Hech qanday maydon yuborilmadi. O‘zgartirmoqchi bo‘lgan maydonni yozing, ' +
          'masalan: { "fullName": "Yangi ism" }',
      );
    }

    const admin = await this.findEntityOrFail(id);
    this.ensureSuperAdminChangeIsAllowed(admin, dto);

    if (dto.login !== undefined) {
      await this.ensureLoginIsFree(dto.login, id);
      admin.login = dto.login;
    }

    // Diqqat: `password` select:false bo'lgani uchun yuqorida bazadan O'QILMAGAN.
    // TypeORM `save()` da qiymati `undefined` bo'lgan ustunga umuman tegmaydi,
    // shuning uchun parol yuborilmasa — eski parol joyida qolaveradi.
    if (dto.password !== undefined) {
      admin.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (dto.fullName !== undefined) {
      admin.fullName = dto.fullName;
    }

    await this.adminRepository.save(admin);

    return withMessage(
      `«${admin.fullName}» admini yangilandi. O‘zgartirilgan maydonlar: ${changed.join(', ')}.`,
      await this.findOne(id),
    );
  }

  // ──────────────────── O'Z PAROLINI ALMASHTIRISH ──────────────────────

  /**
   * Admin faqat O'ZINING parolini almashtiradi.
   *
   * Login bu yerda umuman o'zgarmaydi — uni faqat bosh admin o'zgartira oladi.
   * Bosh adminning o'zi esa bu yo'ldan foydalana olmaydi: uning paroli
   * serverdagi .env faylda turadi (hamma o'quvchi shu hisob orqali kiradi,
   * kimdir parolni almashtirsa qolganlar tizimga kira olmay qoladi).
   */
  async changeOwnPassword(currentAdmin: Admin, dto: ChangeOwnPasswordDto) {
    if (isSuperAdmin(currentAdmin, this.configService)) {
      throw new ConflictException(
        `«${currentAdmin.login}» — bosh admin (super admin), uning parolini bu yerdan almashtirib bo‘lmaydi. ` +
          `Hamma shu bitta hisob orqali kiradi: parol almashsa, qolganlar tizimdan chiqib qoladi. ` +
          `Uni faqat server egasi .env fayldagi ADMIN_PASSWORD orqali o‘zgartiradi.`,
      );
    }

    // `password` ustuni select:false — uni solishtirish uchun ataylab so'raymiz
    const admin = await this.adminRepository.findOne({
      where: { id: currentAdmin.id },
      select: ['id', 'login', 'password', 'fullName', 'createdAt', 'updatedAt'],
    });

    if (!admin) {
      throw new NotFoundException(
        'Hisobingiz topilmadi — u o‘chirilgan bo‘lishi mumkin. Qaytadan tizimga kiring.',
      );
    }

    const currentIsValid = await bcrypt.compare(dto.currentPassword, admin.password);

    if (!currentIsValid) {
      throw new BadRequestException(
        'Hozirgi parolingiz noto‘g‘ri. Esingizdan chiqqan bo‘lsa — bosh adminga ayting, u yangisini qo‘yib beradi.',
      );
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, admin.password);

    if (isSamePassword) {
      throw new ConflictException('Yangi parol eskisi bilan bir xil. Boshqa parol o‘ylab toping.');
    }

    admin.password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.adminRepository.save(admin);

    return withMessage(`Parolingiz almashtirildi. Keyingi safar yangi parol bilan kiring.`, {
      id: admin.id,
      login: admin.login,
    });
  }

  // ─────────────────────────────── DELETE ───────────────────────────────

  async remove(id: number) {
    const admin = await this.findEntityOrFail(id);

    // ASOSIY QOIDA: bosh adminni hech kim o'chira olmaydi.
    this.ensureSuperAdminIsNotDeleted(admin);

    await this.adminRepository.remove(admin);

    return withMessage(
      `«${admin.fullName}» admini o‘chirildi — endi «${admin.login}» logini bilan tizimga kirib bo‘lmaydi.`,
      { id, login: admin.login },
    );
  }

  // ─────────────────────────── YORDAMCHI METODLAR ───────────────────────

  /**
   * `null` yuborilgan maydonni aniq xabar bilan rad etadi.
   *
   * Nega kerak: `PartialType` har bir maydonga `@IsOptional()` qo'yadi,
   * u esa `null` ni "yuborilmagan" deb hisoblab tekshiruvlarni O'TKAZIB YUBORADI.
   * Natijada `null` servisgacha yetib kelib, `null.toLowerCase()` yoki
   * `bcrypt.hash(null)` da dastur qulab tushardi (500 xato).
   */
  private ensureNoNullFields(dto: UpdateAdminDto): void {
    const maydonlar = (['login', 'password', 'fullName'] as const).filter(
      (key) => dto[key] === null,
    );

    if (maydonlar.length === 0) {
      return;
    }

    throw new BadRequestException(
      `${maydonlar.join(', ')} maydoniga null yuborib bo‘lmaydi. ` +
        `Bu maydonni o‘zgartirmoqchi bo‘lmasangiz — uni umuman yubormang.`,
    );
  }

  /** Adminni topadi, topilmasa aniq xabar bilan 404 qaytaradi. */
  private async findEntityOrFail(id: number): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });

    if (!admin) {
      throw new NotFoundException(`ID = ${id} bo‘lgan admin topilmadi.`);
    }

    return admin;
  }

  /**
   * Bosh adminni (super admin) hech kim o'chira olmaydi.
   *
   * Sabab: bu hisobni tizimning o'zi yaratadi va hamma shu hisob orqali kiradi.
   * O'chirilsa — hech kim tizimga kira olmay qoladi va tiklash uchun
   * serverga kirish kerak bo'ladi.
   */
  private ensureSuperAdminIsNotDeleted(admin: Admin): void {
    if (!isSuperAdmin(admin, this.configService)) {
      return;
    }

    throw new ConflictException(
      `«${admin.login}» — bosh admin (super admin), uni o‘chira olmaysiz. ` +
        `Bu hisobni tizim o‘zi yaratadi va o‘zi himoya qiladi: o‘chirilsa hech kim tizimga kira olmay qoladi. ` +
        `Uning o‘rniga ismini o‘zgartirishingiz mumkin: PATCH /api/admins/${admin.id}  { "fullName": "Yangi ism" }`,
    );
  }

  /**
   * Bosh adminda FAQAT ism o'zgaradi. Login va parolga tegib bo'lmaydi.
   *
   * Nega login o'zgarmaydi: tizim bosh adminni .env dagi ADMIN_LOGIN bo'yicha
   * taniydi. Login almashsa — u oddiy adminga aylanib qoladi, keyingi ishga
   * tushishda esa SeedService yana bitta bosh admin yaratib qo'yadi.
   *
   * Nega parol o'zgarmaydi: hamma o'quvchi shu bitta hisob orqali kiradi,
   * parol almashsa qolganlar tizimdan chiqib qoladi. Uni faqat server egasi
   * .env dagi ADMIN_PASSWORD orqali almashtiradi.
   */
  private ensureSuperAdminChangeIsAllowed(
    admin: Admin,
    dto: { login?: string; password?: string },
  ): void {
    if (!isSuperAdmin(admin, this.configService)) {
      return;
    }

    // Bir xil login qayta yuborilsa — bu o'zgarish emas, ruxsat beramiz
    const loginChanged =
      dto.login !== undefined && dto.login.toLowerCase() !== admin.login.toLowerCase();
    const passwordChanged = dto.password !== undefined;

    if (!loginChanged && !passwordChanged) {
      return;
    }

    const nima =
      loginChanged && passwordChanged ? 'login va parolni' : loginChanged ? 'loginni' : 'parolni';

    throw new ConflictException(
      `«${admin.login}» — bosh admin (super admin). Unda faqat ISMNI o‘zgartira olasiz, ${nima} emas. ` +
        `Login almashsa tizim uni bosh admin sifatida tanimay qoladi; parol almashsa esa hamma tizimdan chiqib ketadi. ` +
        `Ismini o‘zgartirish: PATCH /api/admins/${admin.id}  { "fullName": "Yangi ism" }. ` +
        `Login va parolni faqat server egasi .env fayldagi ADMIN_LOGIN va ADMIN_PASSWORD orqali o‘zgartiradi.`,
    );
  }

  /** Login band emasligini tekshiradi (katta-kichik harf farqisiz). */
  private async ensureLoginIsFree(login: string, exceptId?: number): Promise<void> {
    const qb = this.adminRepository
      .createQueryBuilder('admin')
      .where('LOWER(admin.login) = LOWER(:login)', { login });

    if (exceptId) {
      qb.andWhere('admin.id != :exceptId', { exceptId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new ConflictException(
        `«${existing.login}» logini allaqachon band (ID = ${existing.id}). Boshqa login tanlang.`,
      );
    }
  }

  /** Javobga `isSuperAdmin` belgisini qo'shadi. Parol bu yerda umuman yo'q. */
  private toResponse(admin: Admin): AdminResponse {
    return { ...admin, isSuperAdmin: isSuperAdmin(admin, this.configService) };
  }
}
