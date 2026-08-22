import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Admin } from '../auth/entities/admin.entity';
import { Category } from '../categories/entities/category.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Product } from '../products/entities/product.entity';
import { SEED_CARS, SEED_CATEGORIES } from './cars.data';
import { SEED_PICKUP_POINTS } from './pickup-points.data';

/**
 * Dastur ishga tushganda:
 *  1) default admin bor-yo'qligini tekshiradi, bo'lmasa yaratadi;
 *  2) SEED_DEMO_DATA=true bo'lsa va baza bo'sh bo'lsa — 8 ta kategoriya
 *     va 100 ta real avtomobil qo'shadi.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(Admin) private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(PickupPoint)
    private readonly pickupPointRepository: Repository<PickupPoint>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.createDefaultAdmin();

    if (this.configService.get<string>('SEED_DEMO_DATA') === 'true') {
      await this.createDemoData();
      await this.createDemoPickupPoints();
    }
  }

  private async createDefaultAdmin(): Promise<void> {
    const login = this.configService.get<string>('ADMIN_LOGIN', 'admin');
    const password = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
    const fullName = this.configService.get<string>('ADMIN_FULL_NAME', 'Bosh administrator');

    const exists = await this.adminRepository.findOne({ where: { login } });
    if (exists) return;

    await this.adminRepository.save(
      this.adminRepository.create({
        login,
        password: await bcrypt.hash(password, 10),
        fullName,
      }),
    );

    this.logger.log(`Default admin yaratildi -> login: ${login} | parol: ${password}`);
  }

  /**
   * Namuna salonlar.
   *
   * Bu alohida metod, chunki `createDemoData()` faqat baza BUTUNLAY bo'sh
   * bo'lgandagina ishlaydi. Salonlar esa avtomobillari allaqachon bor bazaga
   * ham qo'shilishi kerak — shuning uchun o'z tekshiruvi bor.
   *
   * Avtomobillar salonlarga BIRIKTIRILMAYDI: buni o'quvchilarning o'zi
   * PATCH /api/products/{id} { "pickupPointId": ... } orqali qiladi.
   */
  private async createDemoPickupPoints(): Promise<void> {
    const pickupPointsCount = await this.pickupPointRepository.count();
    if (pickupPointsCount > 0) return;

    await this.pickupPointRepository.save(
      SEED_PICKUP_POINTS.map((point) => this.pickupPointRepository.create(point)),
    );

    this.logger.log(`Namuna salonlar qo\u2018shildi: ${SEED_PICKUP_POINTS.length} ta`);
  }

  private async createDemoData(): Promise<void> {
    const categoriesCount = await this.categoryRepository.count();
    if (categoriesCount > 0) return;

    // 1) Kategoriyalarni qo'shamiz
    const categories = await this.categoryRepository.save(
      SEED_CATEGORIES.map((item) => this.categoryRepository.create(item)),
    );

    // Kategoriya nomi -> ID jadvali (avtomobillarni biriktirish uchun)
    const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

    // 2) 100 ta avtomobilni qo'shamiz.
    // Rasm havolasi to'liq bo'lishi uchun APP_URL oldiga qo'shiladi:
    //   http://localhost:4000/images/cars/toyota-camry-2-5-hybrid.jpg
    const appUrl = this.configService
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    await this.productRepository.save(
      SEED_CARS.map((car) =>
        this.productRepository.create({
          name: car.name,
          description: car.description,
          price: car.price,
          stock: car.stock,
          image: `${appUrl}/images/cars/${car.image}`,
          categoryId: categoryIdByName.get(car.category),
        }),
      ),
    );

    this.logger.log(
      `Namuna ma’lumotlar qo‘shildi: ${categories.length} ta kategoriya, ${SEED_CARS.length} ta avtomobil`,
    );
  }
}
