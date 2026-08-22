import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { withMessage } from '../common/helpers/with-message.helper';
import { Product } from '../products/entities/product.entity';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { QueryPickupPointDto } from './dto/query-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { MAX_IMAGE_MB, MAX_VIDEO_SECONDS } from './upload.config';
import { PickupPoint } from './entities/pickup-point.entity';
import { VideoService } from './video.service';

/** Yer sharining o'rtacha radiusi (kilometrda) — masofa hisoblashda ishlatiladi. */
const EARTH_RADIUS_KM = 6371;

@Injectable()
export class PickupPointsService {
  constructor(
    @InjectRepository(PickupPoint)
    private readonly pickupPointRepository: Repository<PickupPoint>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    private readonly videoService: VideoService,
  ) {}

  // ─────────────────────────────── CREATE ───────────────────────────────

  async create(dto: CreatePickupPointDto) {
    await this.ensureNameIsFree(dto.name);
    this.ensureTimeRangeIsValid(dto.opensAt ?? '09:00', dto.closesAt ?? '19:00');

    const point = this.pickupPointRepository.create({
      name: dto.name,
      city: dto.city,
      address: dto.address,
      phone: dto.phone,
      opensAt: dto.opensAt ?? '09:00',
      closesAt: dto.closesAt ?? '19:00',
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      image: dto.image ?? null,
    });

    const saved = await this.pickupPointRepository.save(point);

    return withMessage(`«${saved.name}» saloni qo‘shildi.`, {
      ...this.withComputedFields(saved),
      productsCount: 0,
    });
  }

  // ──────────────────────────────── READ ────────────────────────────────

  async findAll(query: QueryPickupPointDto): Promise<PaginatedResult<PickupPoint>> {
    const { page, limit, search, city, isActive, sortBy, order } = query;

    const qb = this.pickupPointRepository
      .createQueryBuilder('point')
      // har bir salonga undagi avtomobillar sonini qo'shib beradi
      .loadRelationCountAndMap('point.productsCount', 'point.products');

    if (search) {
      qb.andWhere(
        '(point.name ILIKE :search OR point.address ILIKE :search OR point.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (city) {
      qb.andWhere('point.city ILIKE :city', { city: `%${city}%` });
    }

    if (isActive !== undefined) {
      qb.andWhere('point.isActive = :isActive', { isActive });
    }

    qb.orderBy(`point.${sortBy}`, order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(
      items.map((item) => this.withComputedFields(item)),
      total,
      page,
      limit,
    );
  }

  /**
   * Berilgan nuqtaga eng yaqin salonlarni topadi.
   *
   * Masofa bazada emas, shu yerda — JavaScript'da hisoblanadi. Nega?
   * Salonlar soni kam (o'nlab), shuning uchun hammasini o'qib chiqib hisoblash
   * yetarli va kod ancha tushunarli bo'ladi. Agar salonlar minglab bo'lganda
   * hisoblashni SQL'ga (PostGIS) berish kerak bo'lardi.
   */
  async findNearby(query: NearbyQueryDto) {
    const { lat, lng, radiusKm, limit } = query;

    // Koordinatasi yozilmagan salonni masofa bo'yicha topib bo'lmaydi
    const points = await this.pickupPointRepository
      .createQueryBuilder('point')
      .loadRelationCountAndMap('point.productsCount', 'point.products')
      .where('point.isActive = true')
      .andWhere('point.latitude IS NOT NULL')
      .andWhere('point.longitude IS NOT NULL')
      .getMany();

    const nearby = points
      .map((point) => ({
        ...this.withComputedFields(point),
        distanceKm: this.roundTo(
          this.haversineKm(lat, lng, point.latitude as number, point.longitude as number),
          1,
        ),
      }))
      .filter((point) => point.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    if (nearby.length === 0) {
      return withMessage(
        `${radiusKm} km atrofida ochiq salon topilmadi. Qidiruv doirasini kengaytiring: ` +
          `?lat=${lat}&lng=${lng}&radiusKm=${radiusKm * 2}`,
        nearby,
      );
    }

    return withMessage(
      `${nearby.length} ta salon topildi. Eng yaqini — «${nearby[0].name}», ${nearby[0].distanceKm} km.`,
      nearby,
    );
  }

  /**
   * Salon bor shaharlar ro'yxati.
   *
   * Bu `/nearby` ning ZAXIRA yo'li. Brauzer joylashuvni bera olmasa
   * (foydalanuvchi ruxsat bermadi, qurilmada GPS yo'q, sahifa HTTPS emas),
   * foydalanuvchidan «qaysi shaharda turibsiz?» deb so'rash kerak bo'ladi —
   * shu ro'yxat aynan shuning uchun.
   *
   * Har bir shahar bilan birga uning taxminiy markazi ham qaytadi: bu
   * o'sha shahardagi salonlar koordinatasining o'rtachasi. Shuning uchun
   * foydalanuvchi shaharni tanlagach, uni yana `/nearby` ga yuborib
   * masofalar bilan ro'yxat olsa ham bo'ladi.
   */
  async findCities() {
    // SQL'ning GROUP BY si: bir xil `city` qiymatiga ega qatorlarni bitta
    // qatorga yig'adi va ular ustida COUNT/AVG kabi amallarni bajaradi.
    const rows = await this.pickupPointRepository
      .createQueryBuilder('point')
      .select('point.city', 'city')
      // ::int — PostgreSQL COUNT() ni katta son (bigint) qilib qaytaradi,
      // u esa JavaScript'ga MATN bo'lib keladi. Cast qilsak — oddiy son bo'ladi.
      .addSelect('COUNT(*)::int', 'pickupPointsCount')
      .addSelect('AVG(point.latitude)', 'latitude')
      .addSelect('AVG(point.longitude)', 'longitude')
      .where('point.isActive = true')
      .groupBy('point.city')
      .orderBy('point.city', 'ASC')
      .getRawMany();

    const cities = rows.map((row) => ({
      city: row.city,
      pickupPointsCount: row.pickupPointsCount,
      // AVG() ham numeric qaytaradi -> songa aylantiramiz.
      // Shahardagi hech bir salonda koordinata bo'lmasa — null bo'lib qoladi.
      latitude: row.latitude === null ? null : this.roundTo(Number(row.latitude), 6),
      longitude: row.longitude === null ? null : this.roundTo(Number(row.longitude), 6),
    }));

    const jami = cities.reduce((sum, item) => sum + item.pickupPointsCount, 0);

    return withMessage(
      cities.length > 0
        ? `${cities.length} ta shaharda jami ${jami} ta ochiq salon bor.`
        : 'Hozircha ochiq salon yo\u2018q.',
      cities,
    );
  }

  async findOne(id: number): Promise<PickupPoint> {
    const point = await this.pickupPointRepository
      .createQueryBuilder('point')
      .loadRelationCountAndMap('point.productsCount', 'point.products')
      .where('point.id = :id', { id })
      .getOne();

    if (!point) {
      throw new NotFoundException(`ID = ${id} bo‘lgan salon topilmadi.`);
    }

    return this.withComputedFields(point);
  }

  /** Shu salonda turgan avtomobillar ro'yxati. */
  async findProducts(id: number, query: PaginationQueryDto): Promise<PaginatedResult<Product>> {
    // Salon yo'q bo'lsa — bo'sh ro'yxat emas, aniq 404 qaytishi kerak
    await this.findEntityOrFail(id);

    const { page, limit } = query;

    const [items, total] = await this.productRepository.findAndCount({
      where: { pickupPointId: id },
      relations: { category: true },
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  // ─────────────────────────────── UPDATE ───────────────────────────────

  /** PUT — ma'lumotni to'liq almashtiradi (yuborilmagan maydon tozalanadi). */
  async replace(id: number, dto: CreatePickupPointDto) {
    const point = await this.findEntityOrFail(id);
    await this.ensureNameIsFree(dto.name, id);
    this.ensureTimeRangeIsValid(dto.opensAt ?? '09:00', dto.closesAt ?? '19:00');

    point.name = dto.name;
    point.city = dto.city;
    point.address = dto.address;
    point.phone = dto.phone;
    point.opensAt = dto.opensAt ?? '09:00';
    point.closesAt = dto.closesAt ?? '19:00';
    point.latitude = dto.latitude ?? null;
    point.longitude = dto.longitude ?? null;
    point.image = dto.image ?? null;

    await this.pickupPointRepository.save(point);

    return withMessage(
      `«${point.name}» saloni to‘liq yangilandi (PUT — yuborilmagan maydonlar tozalandi).`,
      await this.findOne(id),
    );
  }

  /** PATCH — faqat yuborilgan maydonlarni o'zgartiradi. */
  async update(id: number, dto: UpdatePickupPointDto) {
    this.ensureNoNullFields(dto);

    const changed = Object.keys(dto);

    // Bo'sh tana yuborilgan: {} — o'zgartiradigan narsa yo'q
    if (changed.length === 0) {
      throw new BadRequestException(
        'Hech qanday maydon yuborilmadi. O‘zgartirmoqchi bo‘lgan maydonni yozing, ' +
          'masalan: { "phone": "+998901234567" }',
      );
    }

    const point = await this.findEntityOrFail(id);

    if (dto.name !== undefined) {
      await this.ensureNameIsFree(dto.name, id);
      point.name = dto.name;
    }

    if (dto.city !== undefined) point.city = dto.city;
    if (dto.address !== undefined) point.address = dto.address;
    if (dto.phone !== undefined) point.phone = dto.phone;
    if (dto.opensAt !== undefined) point.opensAt = dto.opensAt;
    if (dto.closesAt !== undefined) point.closesAt = dto.closesAt;

    // Bu uch maydon bazada `null` bo'la oladi, shuning uchun ularga ataylab
    // `null` yuborish MUMKIN — bu «tozalab tashla» degani.
    // (`?? null` shu uchun kerak: qiymat null bo'lsa null bo'lib qoladi.)
    if (dto.latitude !== undefined) point.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) point.longitude = dto.longitude ?? null;
    if (dto.image !== undefined) {
      point.image = dto.image ?? null;

      // Tashqi havola berildi — yuklangan rasm endi keraksiz.
      // Ikkalasi birga turmaydi, aks holda qaysi biri ko'rinishi noaniq bo'lardi.
      if (point.image && point.imagePath) {
        await this.videoService.remove(point.imagePath);
        point.imagePath = null;
      }
    }

    this.ensureTimeRangeIsValid(point.opensAt, point.closesAt);

    await this.pickupPointRepository.save(point);

    return withMessage(
      `«${point.name}» saloni yangilandi. O‘zgartirilgan maydonlar: ${changed.join(', ')}.`,
      await this.findOne(id),
    );
  }

  // ──────────────────────────────── VIDEO ───────────────────────────────

  /**
   * Salonga video yuklaydi. Har bir salonda BITTA video bo'ladi —
   * yangisi yuklansa eskisi diskdan o'chiriladi.
   */
  async uploadVideo(id: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Video fayl yuborilmadi. Faylni «video» nomli maydonda, ' +
          'multipart/form-data ko‘rinishida yuboring.',
      );
    }

    let point: PickupPoint;

    try {
      point = await this.findEntityOrFail(id);
    } catch (error) {
      // Salon topilmadi — yuklangan xom fayl diskda qolib ketmasin
      await this.videoService.removeTemp(file.path);
      throw error;
    }

    const oldVideoPath = point.videoPath;

    // Siqish shu yerda bo'ladi va vaqt oladi (~8 soniya). Navbat
    // VideoService ichida: bir vaqtda 2 tadan ortiq ffmpeg ishlamaydi.
    const { path, sizeBytes } = await this.videoService.compress(file.path, id);

    point.videoPath = path;
    await this.pickupPointRepository.save(point);

    // Yangisi saqlangandan KEYIN eskisini o'chiramiz: agar yuqorida
    // xatolik bo'lsa, salon eski videosiz qolib ketmaydi
    await this.videoService.remove(oldVideoPath);

    return withMessage(
      `«${point.name}» saloniga video yuklandi: ${this.toMb(file.size)} MB → ` +
        `${this.toMb(sizeBytes)} MB (480p, ${MAX_VIDEO_SECONDS} soniyagacha).` +
        (oldVideoPath ? ' Eski video o‘chirildi.' : ''),
      await this.findOne(id),
    );
  }

  /** Salondagi videoni o'chiradi (salonning o'ziga tegmaydi). */
  async removeVideo(id: number) {
    const point = await this.findEntityOrFail(id);

    if (!point.videoPath) {
      throw new NotFoundException(
        `«${point.name}» salonida video yo‘q — o‘chiradigan narsa topilmadi.`,
      );
    }

    const oldVideoPath = point.videoPath;
    point.videoPath = null;
    await this.pickupPointRepository.save(point);

    await this.videoService.remove(oldVideoPath);

    return withMessage(`«${point.name}» salonining videosi o‘chirildi.`, await this.findOne(id));
  }

  // ──────────────────────────────── RASM ────────────────────────────────

  /**
   * Salon rasmini yuklaydi. Har salonda BITTA rasm — yangisi eskisini
   * almashtiradi. Yuklangan rasm tashqi havoladan (`image`) ustun turadi.
   */
  async uploadImage(id: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Rasm fayl yuborilmadi. Faylni «image» nomli maydonda, ' +
          'multipart/form-data ko‘rinishida yuboring.',
      );
    }

    let point: PickupPoint;

    try {
      point = await this.findEntityOrFail(id);
    } catch (error) {
      await this.videoService.removeTemp(file.path);
      throw error;
    }

    const oldImagePath = point.imagePath;

    const { path, sizeBytes } = await this.videoService.compressImage(file.path, id);

    point.imagePath = path;
    // Yuklangan rasm bor ekan, tashqi havola chalkashtirmasin
    point.image = null;
    await this.pickupPointRepository.save(point);

    await this.videoService.remove(oldImagePath);

    return withMessage(
      `«${point.name}» saloniga rasm yuklandi: ${this.toMb(file.size)} MB → ` +
        `${this.toMb(sizeBytes)} MB.` + (oldImagePath ? ' Eski rasm o‘chirildi.' : ''),
      await this.findOne(id),
    );
  }

  /** Yuklangan rasmni o'chiradi. Tashqi havola bo'lsa, u tegilmaydi. */
  async removeImage(id: number) {
    const point = await this.findEntityOrFail(id);

    if (!point.imagePath) {
      throw new NotFoundException(
        `«${point.name}» salonida yuklangan rasm yo‘q — o‘chiradigan narsa topilmadi.`,
      );
    }

    const oldImagePath = point.imagePath;
    point.imagePath = null;
    await this.pickupPointRepository.save(point);

    await this.videoService.remove(oldImagePath);

    return withMessage(`«${point.name}» salonining rasmi o‘chirildi.`, await this.findOne(id));
  }

  // ───────────────────────── OCHIQ / YOPIQ QILISH ──────────────────────

  async changeStatus(id: number, dto: UpdateStatusDto) {
    const point = await this.findEntityOrFail(id);

    if (point.isActive === dto.isActive) {
      const holat = dto.isActive ? 'ochiq' : 'yopiq';
      return withMessage(
        `«${point.name}» saloni allaqachon ${holat} holatda edi.`,
        this.withComputedFields(point),
      );
    }

    point.isActive = dto.isActive;
    await this.pickupPointRepository.save(point);

    const productsCount = await this.productRepository.count({ where: { pickupPointId: id } });

    // MUHIM FARQ: kategoriya nofaol qilinsa, undagi avtomobillar ham nofaol bo'ladi.
    // Salon bilan bunday QILINMAYDI — kategoriya avtomobilning o'z xususiyati,
    // salon esa shunchaki turgan joyi. Salon vaqtincha yopilsa ham avtomobil
    // sotuvda qolaveradi, uni boshqa salonga ko'chirish kifoya.
    if (!dto.isActive) {
      return withMessage(
        productsCount > 0
          ? `«${point.name}» saloni yopildi. Undagi ${productsCount} ta avtomobil sotuvda qoldi — ` +
              `kerak bo‘lsa ularni boshqa salonga ko‘chiring: GET /api/pickup-points/${id}/products`
          : `«${point.name}» saloni yopildi. Unda avtomobil yo‘q edi.`,
        this.withComputedFields(point),
      );
    }

    return withMessage(`«${point.name}» saloni yana ochildi.`, this.withComputedFields(point));
  }

  // ─────────────────────────────── DELETE ───────────────────────────────

  async remove(id: number) {
    const point = await this.findEntityOrFail(id);

    const productsCount = await this.productRepository.count({ where: { pickupPointId: id } });

    // ASOSIY QOIDA: ichida avtomobil bor salonni o'chirib bo'lmaydi.
    if (productsCount > 0) {
      throw new ConflictException(
        `«${point.name}» salonini o‘chira olmaysiz, chunki unda ${productsCount} ta avtomobil bor. ` +
          `Avval o‘sha avtomobillarni boshqa salonga ko‘chiring yoki salondan chiqaring. ` +
          `Ularni ko‘rish uchun: GET /api/pickup-points/${id}/products. ` +
          `Salondan chiqarish: PATCH /api/products/{id}  { "pickupPointId": null }. ` +
          `Agar salon shunchaki vaqtincha ishlamasa — o‘chirish o‘rniga yopib qo‘ying: ` +
          `PATCH /api/pickup-points/${id}/status  { "isActive": false }`,
      );
    }

    await this.pickupPointRepository.remove(point);

    // Salon o'chdi — videosi va rasmi ham diskda qolib ketmasin
    await this.videoService.remove(point.videoPath);
    await this.videoService.remove(point.imagePath);

    return withMessage(`«${point.name}» saloni o‘chirildi.`, { id, name: point.name });
  }

  // ─────────────────────────── YORDAMCHI METODLAR ───────────────────────

  /** Salonni topadi, topilmasa aniq xabar bilan 404 qaytaradi. */
  private async findEntityOrFail(id: number): Promise<PickupPoint> {
    const point = await this.pickupPointRepository.findOne({ where: { id } });

    if (!point) {
      throw new NotFoundException(`ID = ${id} bo‘lgan salon topilmadi.`);
    }

    return point;
  }

  /** Nom band emasligini tekshiradi (katta-kichik harf farqisiz). */
  private async ensureNameIsFree(name: string, exceptId?: number): Promise<void> {
    const qb = this.pickupPointRepository
      .createQueryBuilder('point')
      .where('LOWER(point.name) = LOWER(:name)', { name });

    if (exceptId) {
      qb.andWhere('point.id != :exceptId', { exceptId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new ConflictException(
        `«${existing.name}» nomli salon allaqachon mavjud (ID = ${existing.id}). Boshqa nom tanlang.`,
      );
    }
  }

  /**
   * PATCH'da `null` tuzog'idan himoya.
   *
   * PartialType har bir maydonga @IsOptional() qo'yadi, @IsOptional() esa
   * `null` ni «yuborilmagan» deb hisoblab BARCHA tekshiruvni o'tkazib yuboradi.
   * Shuning uchun bazada bo'sh bo'la olmaydigan maydonlarni shu yerda rad etamiz.
   *
   * `latitude`, `longitude`, `image` bu ro'yxatda YO'Q — ular bazada `null`
   * bo'la oladi, ularga null yuborish «tozalab tashla» degani.
   */
  private ensureNoNullFields(dto: UpdatePickupPointDto): void {
    const maydonlar = (['name', 'city', 'address', 'phone', 'opensAt', 'closesAt'] as const).filter(
      (key) => dto[key] === null,
    );

    if (maydonlar.length === 0) {
      return;
    }

    throw new BadRequestException(
      `${maydonlar.join(', ')} maydoniga null yuborib bo‘lmaydi — bu maydonlar bo‘sh qololmaydi. ` +
        `O‘zgartirmoqchi bo‘lmasangiz, ularni umuman yubormang.`,
    );
  }

  /** Yopilish vaqti ochilishdan keyin bo'lishi kerak. */
  private ensureTimeRangeIsValid(opensAt: string, closesAt: string): void {
    // Vaqtlar doim "09:00" ko'rinishida (ikki xonali soat, ikki xonali daqiqa),
    // shuning uchun ularni oddiy MATN sifatida solishtirsa bo'ladi: "09:00" < "19:00"
    if (closesAt <= opensAt) {
      throw new BadRequestException(
        `Yopilish vaqti (${closesAt}) ochilish vaqtidan (${opensAt}) keyin bo‘lishi kerak. ` +
          `Tungi smena bu loyihada qo‘llab-quvvatlanmaydi.`,
      );
    }
  }

  /**
   * Javobga bazada saqlanmaydigan maydonlarni qo'shadi:
   * «hozir ochiqmi» va video havolasi.
   */
  private withComputedFields(point: PickupPoint): PickupPoint {
    const now = this.currentTashkentTime();

    point.isOpenNow = point.isActive && now >= point.opensAt && now < point.closesAt;
    point.videoUrl = this.videoService.buildUrl(point.videoPath);

    // Yuklangan rasm ustun; bo'lmasa tashqi havola ishlatiladi
    point.imageUrl = point.imagePath ? this.videoService.buildUrl(point.imagePath) : point.image;

    return point;
  }

  /** Hozirgi Toshkent vaqti "HH:MM" ko'rinishida. Server qaysi mamlakatda turganidan qat'i nazar. */
  private currentTashkentTime(): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
  }

  /**
   * Ikki nuqta orasidagi masofa — Haversine formulasi.
   *
   * Yer yassi emas, shar shaklida. Shuning uchun oddiy Pifagor teoremasi
   * (a² + b² = c²) noto'g'ri natija beradi. Haversine sharning egriligini
   * hisobga oladi va natijani kilometrda qaytaradi.
   */
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /** 65011712 -> 62 (baytni megabaytga) */
  private toMb(bytes: number): number {
    return this.roundTo(bytes / (1024 * 1024), 1);
  }

  /** 3.44999 -> 3.4 (bitta kasr xonasi bilan) */
  private roundTo(value: number, digits: number): number {
    const factor = 10 ** digits;

    return Math.round(value * factor) / factor;
  }
}
