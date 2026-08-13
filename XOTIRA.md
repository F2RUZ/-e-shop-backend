# XOTIRA — loyiha qanday qurilgani, kodi bilan

> Bu fayl **hamma qilingan ishni** boshidan oxirigacha, kodlari bilan yozib qo'yadi.
> Maqsad: keyin ochib o'qib, hech narsa so'ramasdan tushunish va davom ettirish.
>
> Ikkita qism bor: **1) Backend** (NestJS) va **2) Admin panel** (React + MUI).
>
> **Sana:** 2026-08-06 · **Repo:** https://github.com/F2RUZ/-e-shop-backend

---

## Mundarija

- [0. Qisqacha tarix](#0-qisqacha-tarix)
- [1. BACKEND](#1-backend)
  - [1.1 O'rnatish va konfiguratsiya](#11-ornatish-va-konfiguratsiya)
  - [1.2 Umumiy qatlam (`common/`)](#12-umumiy-qatlam-common)
  - [1.3 Auth moduli](#13-auth-moduli)
  - [1.4 Categories moduli](#14-categories-moduli)
  - [1.5 Products moduli](#15-products-moduli)
  - [1.6 Dashboard moduli](#16-dashboard-moduli)
  - [1.7 Seed — 100 ta avtomobil va rasmlar](#17-seed--100-ta-avtomobil-va-rasmlar)
  - [1.8 `main.ts` — Swagger va global sozlamalar](#18-maints--swagger-va-global-sozlamalar)
  - [1.9 Chat moduli — WebSocket](#19-chat-moduli--websocket)
- [2. ADMIN PANEL](#2-admin-panel)
  - [2.1 Arxitektura — 3 qatlam](#21-arxitektura--3-qatlam)
  - [2.2 1-qatlam: tokenlar](#22-1-qatlam-tokenlar)
  - [2.3 Shisha retseptlari](#23-shisha-retseptlari)
  - [2.4 2-qatlam: MUI theme](#24-2-qatlam-mui-theme)
  - [2.5 Provayderlar](#25-provayderlar)
  - [2.6 Ko'p tillilik](#26-kop-tillilik)
  - [2.7 API qatlami](#27-api-qatlami)
  - [2.8 Hook'lar](#28-hooklar)
  - [2.9 Umumiy UI komponentlari](#29-umumiy-ui-komponentlari)
  - [2.10 Layout](#210-layout)
  - [2.11 Sahifalar](#211-sahifalar)
  - [2.12 View modallar](#212-view-modallar)
  - [2.13 Chat sahifasi](#213-chat-sahifasi)
- [3. DEPLOY](#3-deploy)
- [4. Uchragan muammolar va yechimlar](#4-uchragan-muammolar-va-yechimlar)

---

## 0. Qisqacha tarix

Loyiha qadamma-qadam shunday o'sdi:

| # | Nima qilindi |
|---|---|
| 1 | NestJS backend: auth · categories · products · dashboard, o'zbekcha xabarlar bilan |
| 2 | PostgreSQL + TypeORM, Swagger hujjatlari, JWT himoya |
| 3 | Mavzu **telefon do'konidan avtosalonga** o'zgartirildi — 100 ta real avtomobil |
| 4 | Rasmlar Wikipedia'dan yuklab olinib, backendning o'zidan tarqatiladigan qilindi |
| 5 | Docker + nginx + SSL → `backend.magnateshop.uz` |
| 6 | Swagger tozalandi: ortiqcha javob bloklari olib tashlandi, modullar ochiq qilindi |
| 7 | Admin panel: React + MUI, «Liquid Glass» dizayn tizimi TZ'si bo'yicha |
| 8 | Har avtomobil/kategoriya uchun view modal |
| 9 | Docker → `admin.magnateshop.uz` |
| 10 | **Jonli chat (WebSocket)**: backend gateway + mijoz sahifasi + admin sahifasi |
| 11 | Chat hujjati: Swagger teg tavsifiga qadamma-qadam qo'llanma + `WEBSOCKET.md` |
| 12 | Parolni o'zgartirish endpointi **olib tashlandi** (sababi 4-bo'limda) |

---

# 1. BACKEND

## 1.1 O'rnatish va konfiguratsiya

**Texnologiya:** NestJS 11 · PostgreSQL 16 · TypeORM 0.3 · JWT · Swagger · bcryptjs

```bash
npm install
createdb eshop_admin
cp .env.example .env
npm run dev
```

### `src/app.module.ts`

Baza ulanishi va global guard shu yerda:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD') || undefined,
        database: config.get<string>('DB_NAME', 'eshop_admin'),
        entities: [Admin, Category, Product],
        // true bo'lsa TypeORM jadvallarni o'zi yaratadi (o'rganish uchun qulay)
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: false,
      }),
    }),

    AuthModule, CategoriesModule, ProductsModule, DashboardModule, DatabaseModule,
  ],
  controllers: [AppController],
  providers: [
    // BARCHA endpointlar token talab qiladi. Istisno — @Public() qo'yilganlari.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

> `password: ... || undefined` — bo'sh parol bilan lokal PostgreSQL'ga ulanish uchun.
> `password: ''` yozilsa `pg` drayveri xato beradi.

---

## 1.2 Umumiy qatlam (`common/`)

Bu qatlam butun API'ning **bir xil ko'rinishini** ta'minlaydi.

### Javoblarni bir xillashtirish — `ResponseInterceptor`

Har bir muvaffaqiyatli javob `{ success, message, data }` qobig'iga o'raladi:

```ts
// src/common/interceptors/response.interceptor.ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const defaultMessage =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Muvaffaqiyatli';

    return next.handle().pipe(
      map((payload) => {
        // service withMessage() qaytargan bo'lsa — o'sha dinamik matnni ishlatamiz
        if (isMessagePayload(payload)) {
          return { success: true, message: payload.message, data: payload.data };
        }
        return { success: true, message: defaultMessage, data: payload ?? null };
      }),
    );
  }
}
```

Ikki xil matn manbai bor:

```ts
// 1) STATIK — controller'da dekorator bilan
@ResponseMessage('Avtomobillar ro‘yxati')
findAll() { ... }

// 2) DINAMIK — service'da, ichida nom bo'lsa
return withMessage(`«${product.name}» avtomobili yangilandi.`, product);
```

`withMessage` — juda sodda helper:

```ts
// src/common/helpers/with-message.helper.ts
export function withMessage<T>(message: string, data: T): MessagePayload<T> {
  return { message, data };
}

export function isMessagePayload(value: unknown): value is MessagePayload<unknown> {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as MessagePayload<unknown>).message === 'string' && 'data' in value
  );
}
```

### Xatoliklarni bir xillashtirish — `AllExceptionsFilter`

```ts
// src/common/filters/all-exceptions.filter.ts
const DEFAULT_MESSAGES: Record<string, string> = {
  Unauthorized: 'Token yuborilmadi yoki eskirgan. Iltimos, qaytadan tizimga kiring.',
  'Forbidden resource': 'Bu amalni bajarishga ruxsatingiz yo‘q.',
  'Internal server error': 'Serverda kutilmagan xatolik yuz berdi.',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // ... statusCode va message ajratiladi ...

    // NestJS'ning inglizcha matnini o'zbekchaga o'giramiz
    message = DEFAULT_MESSAGES[message] ?? message;

    // Mavjud bo'lmagan endpoint: "Cannot GET /api/xyz"
    if (statusCode === 404 && /^Cannot (GET|POST|PUT|PATCH|DELETE)/.test(message)) {
      message = `Bunday endpoint mavjud emas: ${request.method} ${request.url}. ` +
                `Barcha endpointlar ro‘yxati: /docs`;
    }

    response.status(statusCode).json({
      success: false, statusCode, message,
      ...(errors?.length ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### `:id` ni songa aylantirish

```ts
// src/common/pipes/parse-id.pipe.ts
export const ParseIdPipe = new ParseIntPipe({
  exceptionFactory: () =>
    new BadRequestException('ID butun son bo‘lishi kerak. Masalan: /api/categories/1'),
});

// Ishlatilishi:
findOne(@Param('id', ParseIdPipe) id: number) { ... }
```

### `numeric` ustunni songa aylantirish

PostgreSQL'ning `numeric` turi TypeORM'da **matn** bo'lib qaytadi (`"545000000.00"`).
Transformer uni JSON'da oddiy son qiladi:

```ts
// src/common/transformers/numeric.transformer.ts
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
```

### Query'dagi boolean

`?isActive=true` da `"true"` matn bo'lib keladi:

```ts
// src/common/transformers/to-boolean.transformer.ts
export const ToBoolean = () =>
  Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return value; // noto'g'ri qiymat -> @IsBoolean() xato matnini qaytaradi
  });
```

### Sahifalash

```ts
// src/common/dto/paginated-result.dto.ts
export function paginate<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    meta: { total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
  };
}
```

---

## 1.3 Auth moduli

### Entity — parol hech qachon javobga tushmaydi

```ts
// src/auth/entities/admin.entity.ts
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn() id: number;

  @Column({ type: 'varchar', length: 50, unique: true }) login: string;

  /**
   * `select: false` — bazadan o'qiganda parol AVTOMATIK olinmaydi,
   * shuning uchun u hech qachon javobga tushib qolmaydi.
   */
  @Column({ type: 'varchar', select: false }) password: string;

  @Column({ type: 'varchar', length: 100, default: 'Administrator' }) fullName: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

### Login

```ts
// src/auth/auth.service.ts
async login(dto: LoginDto): Promise<LoginResponseDto> {
  // `password` ustuni select:false — uni ATAYLAB so'raymiz
  const admin = await this.adminRepository.findOne({
    where: { login: dto.login },
    select: ['id', 'login', 'password', 'fullName', 'createdAt', 'updatedAt'],
  });

  // Xavfsizlik: "login topilmadi" va "parol xato" BIR XIL matn qaytaradi
  const passwordIsValid = admin && (await bcrypt.compare(dto.password, admin.password));
  if (!passwordIsValid) {
    throw new UnauthorizedException('Login yoki parol noto‘g‘ri.');
  }

  const payload: JwtPayload = { sub: admin.id, login: admin.login };
  delete admin.password;  // javobga parol hech qachon tushmasin

  return {
    accessToken: await this.jwtService.signAsync(payload),
    expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    admin,
  };
}
```

### Global guard — hamma yopiq, `@Public()` ochiq

```ts
// src/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  /** Xatolik sababini ANIQ o'zbekcha matn bilan tushuntiradi */
  private explain(info: Error | undefined): string {
    switch (info?.name) {
      case 'TokenExpiredError':
        return 'Token muddati tugagan. /api/auth/login orqali qaytadan kiring.';
      case 'JsonWebTokenError':
        return 'Token noto‘g‘ri. Uni "Authorization: Bearer <token>" ko‘rinishida yuboring.';
      default:
        return 'Token yuborilmadi. Avval /api/auth/login orqali tizimga kiring va ' +
               'tokenni Swagger’dagi "Authorize" tugmasiga qo‘ying.';
    }
  }
}
```

### `@CurrentAdmin()` dekoratori

```ts
// src/common/decorators/current-admin.decorator.ts
export const CurrentAdmin = createParamDecorator(
  (field: keyof Admin | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: Admin }>();
    return field ? request.user?.[field] : request.user;
  },
);

// Ishlatilishi:
getMe(@CurrentAdmin() admin: Admin) { ... }
changePassword(@CurrentAdmin('id') adminId: number, ...) { ... }
```

---

## 1.4 Categories moduli

### Entity

```ts
// src/categories/entities/category.entity.ts
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn() id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 }) name: string;

  @Column({ type: 'varchar', length: 500, nullable: true }) description: string | null;
  @Column({ type: 'boolean', default: true }) isActive: boolean;

  @OneToMany(() => Product, (product) => product.category) products: Product[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  /** Bazada ustun EMAS — so'rov paytida hisoblanib qo'shiladi */
  productsCount?: number;
}
```

### ⭐ Asosiy qoida: avtomobili bor kategoriya o'chirilmaydi

```ts
// src/categories/categories.service.ts
async remove(id: number) {
  const category = await this.findEntityOrFail(id);
  const productsCount = await this.productRepository.count({ where: { categoryId: id } });

  // ASOSIY QOIDA: ichida avtomobil bor kategoriyani o'chirib bo'lmaydi.
  if (productsCount > 0) {
    throw new ConflictException(
      `«${category.name}» kategoriyasini o‘chira olmaysiz, chunki unda ${productsCount} ta avtomobil bor. ` +
        `Avval o‘sha avtomobillarni o‘chiring yoki boshqa kategoriyaga ko‘chiring. ` +
        `Ularni ko‘rish uchun: GET /api/products?categoryId=${id}. ` +
        `Agar shunchaki sotuvdan olib qo‘ymoqchi bo‘lsangiz — o‘chirish o‘rniga nofaol qiling: ` +
        `PATCH /api/categories/${id}/status  { "isActive": false }`,
    );
  }

  await this.categoryRepository.remove(category);
  return withMessage(`«${category.name}» kategoriyasi o‘chirildi.`, { id, name: category.name });
}
```

> Xabar faqat "bo'lmaydi" demaydi — **nima qilish kerakligini** ham aytadi.
> Bu butun loyihaning asosiy tamoyili.

Baza darajasida ham himoya bor (`Product` entity'sida):

```ts
@ManyToOne(() => Category, (category) => category.products, {
  onDelete: 'RESTRICT',   // baza ham ruxsat bermaydi
})
```

### Nofaol qilishda kaskad

```ts
async changeStatus(id: number, dto: UpdateStatusDto) {
  const category = await this.findEntityOrFail(id);

  if (category.isActive === dto.isActive) {
    const holat = dto.isActive ? 'faol' : 'nofaol';
    return withMessage(`«${category.name}» kategoriyasi allaqachon ${holat} holatda edi.`, category);
  }

  category.isActive = dto.isActive;
  await this.categoryRepository.save(category);

  // NOFAOL: kategoriya bilan birga undagi avtomobillar ham nofaol bo'ladi,
  // aks holda "nofaol kategoriyadagi faol avtomobil" chalkash holat paydo bo'ladi.
  if (!dto.isActive) {
    const { affected } = await this.productRepository.update(
      { categoryId: id, isActive: true },
      { isActive: false },
    );
    return withMessage(
      affected > 0
        ? `«${category.name}» kategoriyasi nofaol qilindi. U bilan birga ${affected} ta avtomobil ham nofaol qilindi.`
        : `«${category.name}» kategoriyasi nofaol qilindi. Unda avtomobil yo‘q edi.`,
      category,
    );
  }

  // FAOL: avtomobillar avtomatik yoqilmaydi — qaysi biri sotuvga chiqishini admin hal qiladi
  const inactiveProducts = await this.productRepository.count({
    where: { categoryId: id, isActive: false },
  });
  return withMessage(
    inactiveProducts > 0
      ? `«${category.name}» kategoriyasi faollashtirildi. Ichidagi ${inactiveProducts} ta avtomobil hali nofaol — kerakligini alohida faollashtiring.`
      : `«${category.name}» kategoriyasi faollashtirildi.`,
    category,
  );
}
```

### Nom takrorlanmasligi (katta-kichik harf farqsiz)

```ts
private async ensureNameIsFree(name: string, exceptId?: number): Promise<void> {
  const qb = this.categoryRepository
    .createQueryBuilder('category')
    .where('LOWER(category.name) = LOWER(:name)', { name });

  if (exceptId) qb.andWhere('category.id != :exceptId', { exceptId });

  const existing = await qb.getOne();
  if (existing) {
    throw new ConflictException(
      `«${existing.name}» nomli kategoriya allaqachon mavjud (ID = ${existing.id}). Boshqa nom tanlang.`,
    );
  }
}
```

### Avtomobillar sonini qo'shib berish

```ts
const qb = this.categoryRepository
  .createQueryBuilder('category')
  // har bir kategoriyaga avtomobillar sonini qo'shib beradi
  .loadRelationCountAndMap('category.productsCount', 'category.products');
```

### PUT va PATCH farqi (kodda)

```ts
/** PUT — ma'lumotni TO'LIQ almashtiradi (yuborilmagan maydon tozalanadi) */
async replace(id: number, dto: CreateCategoryDto) {
  const category = await this.findEntityOrFail(id);
  await this.ensureNameIsFree(dto.name, id);

  category.name = dto.name;
  category.description = dto.description ?? null;   // ← yubormasangiz null bo'ladi

  await this.categoryRepository.save(category);
  return withMessage(
    `«${category.name}» kategoriyasi to‘liq yangilandi (PUT — yuborilmagan maydonlar tozalandi).`,
    await this.findOne(id),
  );
}

/** PATCH — faqat yuborilgan maydonlarni o'zgartiradi */
async update(id: number, dto: UpdateCategoryDto) {
  const category = await this.findEntityOrFail(id);

  if (dto.name !== undefined) {                     // ← faqat kelgan bo'lsa
    await this.ensureNameIsFree(dto.name, id);
    category.name = dto.name;
  }
  if (dto.description !== undefined) category.description = dto.description;

  const changed = Object.keys(dto);
  await this.categoryRepository.save(category);

  return withMessage(
    `«${category.name}» kategoriyasi yangilandi. O‘zgartirilgan maydonlar: ${changed.join(', ')}.`,
    await this.findOne(id),
  );
}
```

DTO tomonida farq shunchaki `PartialType`:

```ts
// create-category.dto.ts — POST va PUT uchun (hamma maydon)
export class CreateCategoryDto {
  @Length(2, 100, { message: 'Kategoriya nomi 2 tadan 100 tagacha belgidan iborat bo‘lishi kerak.' })
  name: string;
  description?: string;
}

// update-category.dto.ts — PATCH uchun (hammasi ixtiyoriy)
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

---

## 1.5 Products moduli

### Entity

```ts
// src/products/entities/product.entity.ts
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 150 }) name: string;
  @Column({ type: 'varchar', length: 2000, nullable: true }) description: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  price: number;

  @Column({ type: 'int', default: 0 }) stock: number;
  @Column({ type: 'varchar', length: 500, nullable: true }) image: string | null;
  @Column({ type: 'boolean', default: true }) isActive: boolean;

  @Index()
  @Column({ type: 'int' }) categoryId: number;

  @ManyToOne(() => Category, (c) => c.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

### ⭐ Bitta invariant: **faol avtomobil faqat faol kategoriyada tura oladi**

Bu qoidadan uchta tekshiruv kelib chiqadi:

```ts
// 1) Yangi avtomobil faol holatda yaratiladi -> kategoriyasi ham faol bo'lishi shart
async create(dto: CreateProductDto) {
  const category = await this.findCategoryOrFail(dto.categoryId);
  this.ensureCategoryIsActive(category, 'Bu kategoriyaga avtomobil qo‘sha olmaysiz');
  ...
}

// 2) Faol avtomobilni nofaol kategoriyaga ko'chirib bo'lmaydi
private async ensureCategoryIsUsable(categoryId: number, product: Product): Promise<void> {
  const category = await this.findCategoryOrFail(categoryId);
  if (product.isActive) {
    this.ensureCategoryIsActive(
      category,
      `«${product.name}» faol avtomobilini bu kategoriyaga ko‘chira olmaysiz`,
    );
  }
}

// 3) Nofaol kategoriyadagi avtomobilni faollashtirib bo'lmaydi
async changeStatus(id: number, dto: UpdateStatusDto) {
  const product = await this.findOne(id);

  if (product.isActive === dto.isActive) {
    const holat = dto.isActive ? 'faol' : 'nofaol';
    return withMessage(`«${product.name}» avtomobili allaqachon ${holat} holatda edi.`, product);
  }

  if (dto.isActive && !product.category.isActive) {
    throw new ConflictException(
      `«${product.name}» avtomobilini faollashtira olmaysiz, chunki uning «${product.category.name}» ` +
        `kategoriyasi nofaol. Avval kategoriyani faollashtiring: ` +
        `PATCH /api/categories/${product.categoryId}/status  { "isActive": true }`,
    );
  }

  product.isActive = dto.isActive;
  await this.productRepository.save(product);

  return withMessage(
    dto.isActive
      ? `«${product.name}» avtomobili faollashtirildi — endi sotuvda ko‘rinadi.`
      : `«${product.name}» avtomobili nofaol qilindi — endi sotuvda ko‘rinmaydi, lekin bazada saqlanib qoladi.`,
    product,
  );
}
```

Umumiy tekshiruv metodi:

```ts
private ensureCategoryIsActive(category: Category, prefix: string): void {
  if (!category.isActive) {
    throw new ConflictException(
      `${prefix}: «${category.name}» kategoriyasi hozir nofaol. ` +
        `Avval uni faollashtiring: PATCH /api/categories/${category.id}/status  { "isActive": true }`,
    );
  }
}
```

### Filtrlar — QueryBuilder bilan

```ts
async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
  const { page, limit, search, categoryId, isActive, minPrice, maxPrice, inStock, sortBy, order } = query;

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new BadRequestException('minPrice maxPrice dan katta bo‘lishi mumkin emas.');
  }

  const qb = this.productRepository
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.category', 'category');

  if (search)              qb.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', { search: `%${search}%` });
  if (categoryId !== undefined) qb.andWhere('product.categoryId = :categoryId', { categoryId });
  if (isActive !== undefined)   qb.andWhere('product.isActive = :isActive', { isActive });
  if (minPrice !== undefined)   qb.andWhere('product.price >= :minPrice', { minPrice });
  if (maxPrice !== undefined)   qb.andWhere('product.price <= :maxPrice', { maxPrice });
  if (inStock !== undefined)    qb.andWhere(inStock ? 'product.stock > 0' : 'product.stock = 0');

  qb.orderBy(`product.${sortBy}`, order)   // sortBy enum bilan cheklangan — SQL injection yo'q
    .skip((page - 1) * limit)
    .take(limit);

  const [items, total] = await qb.getManyAndCount();
  return paginate(items, total, page, limit);
}
```

> `sortBy` — enum DTO orqali tekshiriladi, shuning uchun `product.${sortBy}` xavfsiz:
> ```ts
> export enum ProductSortBy { ID='id', NAME='name', PRICE='price', STOCK='stock', CREATED_AT='createdAt' }
> ```

---

## 1.6 Dashboard moduli

Bitta so'rovda bosh sahifaning hamma raqami:

```ts
// src/dashboard/dashboard.service.ts
async getStats(threshold: number): Promise<DashboardStatsDto> {
  const [
    totalProducts, activeProducts, outOfStock, lowStockCount,
    totalCategories, activeCategories, stockTotals, emptyCategories, latestProducts,
  ] = await Promise.all([
    this.productRepository.count(),
    this.productRepository.count({ where: { isActive: true } }),
    this.productRepository.count({ where: { stock: 0 } }),
    // kam qolganlar: 0 dan ko'p, lekin chegaradan oshmagan
    this.productRepository.count({ where: { stock: And(MoreThan(0), LessThanOrEqual(threshold)) } }),
    this.categoryRepository.count(),
    this.categoryRepository.count({ where: { isActive: true } }),
    this.getStockTotals(),
    this.countEmptyCategories(),
    this.productRepository.find({
      relations: { category: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 5,
    }),
  ]);

  return {
    products:   { total: totalProducts, active: activeProducts,
                  inactive: totalProducts - activeProducts, outOfStock, lowStock: lowStockCount },
    categories: { total: totalCategories, active: activeCategories,
                  inactive: totalCategories - activeCategories, empty: emptyCategories },
    stock: stockTotals,
    latestProducts,
    lowStockThreshold: threshold,
  };
}
```

Agregatlar (`SUM`, `AVG`) matn qaytaradi — `Number()` bilan o'giriladi:

```ts
private async getStockTotals() {
  const raw = await this.productRepository
    .createQueryBuilder('product')
    .select('COALESCE(SUM(product.stock), 0)', 'totalItems')
    .addSelect('COALESCE(SUM(product.price * product.stock), 0)', 'totalValue')
    .addSelect('COALESCE(AVG(product.price), 0)', 'averagePrice')
    .getRawOne();

  return {
    totalItems: Number(raw.totalItems),
    totalValue: Math.round(Number(raw.totalValue)),
    averagePrice: Math.round(Number(raw.averagePrice)),
  };
}
```

Kategoriyalar kesimi — PostgreSQL'ning `FILTER` sintaksisi bilan:

```ts
const rows = await this.categoryRepository
  .createQueryBuilder('category')
  .leftJoin('category.products', 'product')
  .select('category.id', 'id')
  .addSelect('category.name', 'name')
  .addSelect('category.isActive', 'isActive')
  .addSelect('COUNT(product.id)', 'productsCount')
  .addSelect('COUNT(product.id) FILTER (WHERE product."isActive" = true)', 'activeProductsCount')
  .addSelect('COALESCE(SUM(product.stock), 0)', 'totalStock')
  .addSelect('COALESCE(SUM(product.price * product.stock), 0)', 'totalValue')
  .groupBy('category.id')
  .orderBy('COUNT(product.id)', 'DESC')
  .getRawMany();
```

---

## 1.7 Seed — 100 ta avtomobil va rasmlar

### Rasmlarni topish va yuklab olish

Wikipedia'ning **pageimages** API'sidan har bir model uchun haqiqiy surat olindi:

```python
# 1) Rasm havolasini olish (800px gacha)
def api(title):
    q = urllib.parse.urlencode({
        "action": "query", "titles": title, "prop": "pageimages",
        "pithumbsize": "800", "format": "json", "redirects": "1",
    })
    r = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + q, headers=UA)
    with urllib.request.urlopen(r, timeout=25) as f:
        d = json.load(f)
    for p in (d.get("query", {}).get("pages") or {}).values():
        t = (p.get("thumbnail") or {}).get("source")
        if t: return t

# 2) Yuklab olish va 800px gacha kichraytirish (macOS `sips`)
subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82",
                "-Z", "800", path, "--out", path])
```

Natija: **100 ta rasm, 13 MB**, `public/images/cars/` ichida.

> ⚠️ Boshida Wikipedia'ga to'g'ridan-to'g'ri havola (hotlink) qilingan edi — lekin
> Wikimedia **429 Too Many Requests** qaytardi. Shuning uchun rasmlar yuklab olinib,
> backendning o'zi tarqatadigan qilindi.

### Ma'lumot fayli

```ts
// src/database/cars.data.ts (840 qator)
export const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Sedan', description: 'Kundalik yurish uchun qulay, tejamkor va keng bagajli avtomobillar' },
  { name: 'Krossover va SUV', description: 'Baland klirens, to‘liq g‘ildirak uzatmasi, oila va sayohat uchun' },
  { name: 'Xetchbek', description: 'Ixcham, shahar sharoitida parkovka qilish oson avtomobillar' },
  { name: 'Elektromobil', description: 'Benzinsiz, sokin va tejamkor — kelajak transporti' },
  { name: 'Sport avtomobil', description: 'Yuqori quvvat, tez tezlanish va sport dizayn' },
  { name: 'Lyuks va premium', description: 'Eng yuqori komfort, sifatli materiallar va boy jihozlar' },
  { name: 'Minivan', description: 'Ko‘p o‘rinli, katta oila va biznes tashish uchun' },
  { name: 'Pikap va yuk', description: 'Ochiq kuzov, yuk tashish va og‘ir ish sharoitlari uchun' },
];

export const SEED_CARS: SeedCar[] = [
  // ── Sedan ──────────────────────────────────────────────
  {
    name: 'Toyota Camry 2.5 Hybrid',
    description: '2.5 L gibrid, 100 km ga 4.5 litr sarf',
    price: 545000000,
    stock: 7,
    image: 'toyota-camry-2-5-hybrid.jpg',
    category: 'Sedan',
  },
  // … yana 99 ta
];
```

Taqsimot: Krossover va SUV 20 · Sedan 17 · Lyuks 16 · Elektromobil 14 ·
Sport 12 · Xetchbek 9 · Pikap 8 · Minivan 4 = **100**

### Seed servisi

```ts
// src/database/seed.service.ts
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    await this.createDefaultAdmin();
    if (this.configService.get<string>('SEED_DEMO_DATA') === 'true') {
      await this.createDemoData();
    }
  }

  private async createDemoData(): Promise<void> {
    if ((await this.categoryRepository.count()) > 0) return;  // baza bo'sh bo'lsagina

    const categories = await this.categoryRepository.save(
      SEED_CATEGORIES.map((item) => this.categoryRepository.create(item)),
    );
    const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

    // Rasm havolasi to'liq bo'lishi uchun APP_URL oldiga qo'shiladi
    const appUrl = this.configService
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    await this.productRepository.save(
      SEED_CARS.map((car) =>
        this.productRepository.create({
          ...car,
          image: `${appUrl}/images/cars/${car.image}`,
          categoryId: categoryIdByName.get(car.category),
        }),
      ),
    );
  }
}
```

---

## 1.8 `main.ts` — Swagger va global sozlamalar

```ts
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Mashinalar rasmlari: public/images/cars/... -> /images/cars/...
  app.useStaticAssets(join(process.cwd(), 'public'), { maxAge: '7d' });

  app.setGlobalPrefix('api');

  // CORS TO'LIQ OCHIQ — istalgan frontend ulana oladi
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // DTO'da yo'q maydonlar tashlab yuboriladi
      forbidNonWhitelisted: true,   // ...va bu haqda ogohlantiriladi
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: 'Yuborilgan ma‘lumotlar noto‘g‘ri.',
          errors: collectMessages(errors),
        }),
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());
  // ... Swagger ...
}
```

Validatsiya xatoliklarini o'zbekchalashtirish:

```ts
function collectMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const own = Object.entries(error.constraints ?? {}).map(([rule, text]) =>
      rule === 'whitelistValidation'
        ? `«${error.property}» degan maydon qo‘llab-quvvatlanmaydi — uni olib tashlang.`
        : text,
    );
    const nested = error.children?.length ? collectMessages(error.children) : [];
    return [...own, ...nested];
  });
}
```

Swagger sozlamalari:

```ts
SwaggerModule.setup('docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,   // sahifa yangilansa ham token saqlanib qoladi
    docExpansion: 'list',         // barcha modullar OCHIQ holda ko'rinadi
    tagsSorter: 'alpha',
    operationsSorter: 'method',
    defaultModelsExpandDepth: 0,
  },
  customSiteTitle: 'E-Shop Admin API',
});
```

> ⚠️ `@ApiResponse` dekoratorlari **ataylab olib tashlangan** — Execute bosilmasdan
> chiqib turgan 200/404 jadvallar chalg'itadi. Barcha tushuntirish `@ApiOperation`
> ning `description` ida markdown ko'rinishida.

---

## 1.9 Chat moduli — WebSocket

**Nima uchun WebSocket?** REST'da server o'zi mijozga murojaat qila olmaydi.
Chatda esa admin javob yozganda mijoz sahifasi **yangilanmasdan** ko'rishi kerak.

**Paketlar:** `@nestjs/websockets` · `@nestjs/platform-socket.io` · `socket.io`

### Ma'lumot modeli — ikkita jadval

```ts
// src/chat/entities/chat.entity.ts
@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn() id: number;

  /** Mijozning maxfiy kaliti — parol o'rnida. localStorage'da saqlanadi. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 }) guestKey: string;

  @Column({ type: 'varchar', length: 60 }) guestName: string;

  /** Ro'yxatda ko'rsatish uchun — har safar xabarlar jadvalini qidirmaslik */
  @Column({ type: 'varchar', length: 300, nullable: true }) lastMessage: string | null;
  @Column({ type: 'timestamptz', nullable: true }) lastMessageAt: Date | null;
  @Column({ type: 'int', default: 0 }) unreadForAdmin: number;

  @OneToMany(() => Message, (m) => m.chat) messages: Message[];
}
```

```ts
// src/chat/entities/message.entity.ts
export type ChatRole = 'guest' | 'admin';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn() id: number;
  @Index() @Column({ type: 'int' }) chatId: number;

  // ⚠️ Avtomobildan FARQLI: bu yerda CASCADE.
  // Suhbat o'chsa xabarlari ham ketadi (xabar suhbatsiz ma'nosiz).
  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' }) chat: Chat;

  @Column({ type: 'varchar', length: 10 }) sender: ChatRole;
  @Column({ type: 'varchar', length: 1000 }) text: string;
  @CreateDateColumn() createdAt: Date;
}
```

### `guestKey` — mijozni tanish usuli

Mijoz ro'yxatdan o'tmaydi. Uni tasodifiy kalit orqali taniymiz:

```
1. Ism yoziladi           -> POST /api/chat/start
2. Server randomUUID() qaytaradi
3. Brauzer localStorage'ga saqlaydi
4. Keyingi safar o'sha kalit yuboriladi -> eski suhbat qaytadi
```

Usiz istalgan odam `chatId` ni 1, 2, 3 deb terib birovning yozishmasini
o'qiy olardi. Kalitni `chat:join` tekshiradi.

### Hodisa nomlari — yagona manba

```ts
// src/chat/chat.events.ts
export const CHAT_EVENTS = {
  JOIN: 'chat:join',       MESSAGE: 'chat:message',
  TYPING: 'chat:typing',   READ: 'chat:read',
  READY: 'chat:ready',     HISTORY: 'chat:history',
  CHATS: 'chat:chats',     ERROR: 'chat:error',
} as const;

export const chatRoom = (chatId: number) => `chat:${chatId}`;
export const ADMIN_ROOM = 'admins';
```

Backend, admin panel va `chat.html` — uchalasi ham shu nomlarni ishlatadi.

### Gateway

```ts
// src/chat/chat.gateway.ts
@Public()                                  // ⬅️ pastda tushuntirilgan
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}
}
```

### ⭐ Nega gateway `@Public()`?

Loyihada global `JwtAuthGuard` bor va u **gateway handlerlariga ham** qo'llanadi.
Lekin passport tokenni `Authorization` sarlavhasidan qidiradi — WebSocket'da
bunday sarlavha yo'q. Natijada barcha hodisalar bloklanib qolardi.

Yechim: guardni o'chirib, tokenni **o'zimiz** tekshiramiz:

```ts
handleConnection(socket: Socket): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    socket.data.role = 'guest';               // token yo'q -> mehmon
    socket.emit(CHAT_EVENTS.READY, { role: 'guest' });
    return;
  }

  try {
    this.jwtService.verify(token);
  } catch {
    socket.emit(CHAT_EVENTS.ERROR, { message: 'Token noto‘g‘ri yoki muddati tugagan...' });
    socket.disconnect();
    return;
  }

  socket.data.role = 'admin';
  void socket.join(ADMIN_ROOM);
  socket.emit(CHAT_EVENTS.READY, { role: 'admin' });
}
```

`JwtService` ni olish uchun `AuthModule` unga yo'l ochdi:

```ts
// auth.module.ts
exports: [TypeOrmModule, JwtModule]     // ⬅️ JwtModule qo'shildi
```

### ⭐ `server.to` va `socket.to` farqi

```ts
this.server.to(room).emit(...)   // xonadagi HAMMAGA, yuboruvchi ham
socket.to(room).emit(...)        // yuboruvchidan BOSHQA hammaga
```

- **Xabar** — `server.to`: yuboruvchi o'z xabarini ko'rishi kerak
- **«yozmoqda…»** — `socket.to`: o'zining yozayotganini ko'rish kulgili

Shu tanlov tufayli frontendda xabarni qo'lda qo'shish shart emas —
yuborilgan xabar `chat:message` bo'lib o'zi qaytadi.

### `chat:join` — huquq tekshiruvi shu yerda

```ts
private async resolveChat(socket: Socket, body: JoinPayload): Promise<Chat> {
  const chatId = Number(body?.chatId);

  if (!Number.isInteger(chatId) || chatId < 1) {
    throw new Error('chatId butun son bo‘lishi kerak. Uni POST /api/chat/start javobidan olasiz.');
  }

  const chat = await this.chatService.findOneOrFail(chatId);

  // Mijoz faqat O'Z suhbatiga kira oladi
  if (state(socket).role === 'guest' && chat.guestKey !== body?.guestKey) {
    throw new Error('Bu suhbat sizniki emas. POST /api/chat/start orqali o‘z suhbatingizni oching...');
  }

  return chat;
}
```

Va admin boshqa suhbatga o'tganda eskisidan chiqadi:

```ts
if (previousChatId && previousChatId !== chat.id) {
  void socket.leave(chatRoom(previousChatId));
}
```

> Busiz admin eski xonada ham qolib, u yerdagi xabarlarni ham olaverardi.

### ⭐ Gateway ichida hech qachon `throw` qilinmaydi

Loyihadagi global `AllExceptionsFilter` HTTP javobi uchun yozilgan
(`response.status(...).json(...)`) — WebSocket'da `response` degan narsa yo'q.

Shuning uchun har bir handler `try/catch` ichida:

```ts
private fail(socket: Socket, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Kutilmagan xatolik yuz berdi.';
  this.logger.warn(message);
  socket.emit(CHAT_EVENTS.ERROR, { message });   // faqat xato qilgan odamga
}
```

### ⭐ WS payloadlari `class` emas, `interface`

Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) `class` ko'rsa
uni tekshirishga urinadi va `BadRequestException` chiqaradi — u esa yana HTTP
filtriga boradi. `interface` bo'lsa kompilyatsiyadan keyin hech narsa qolmaydi,
pipe uni o'tkazib yuboradi. Tekshiruvni o'zimiz, aniq matn bilan qilamiz.

### Swagger'da WebSocket'ni qanday ko'rsatdik

OpenAPI faqat HTTP'ni tavsiflaydi — hodisalarni ko'rsata olmaydi. Uch yo'l bilan
hal qilindi:

```ts
// main.ts — teg tavsifi Swagger UI'da MARKDOWN bo'lib chiqadi
.addTag(CHAT_TAG, CHAT_GUIDE)
```

`CHAT_GUIDE` — `src/chat/chat.docs.ts` dagi ~10 000 belgilik qo'llanma:
REST/WS farqi, ulanish, 5 qadamli mijoz kodi, admin kodi, React'dagi 3 tuzoq,
hodisalar jadvali, xatolar jadvali va topshiriqlar.

Matn **qator massivi** qilib yozilgan:

```ts
export const CHAT_GUIDE = [
  '## 2. Ulanish manzili va kutubxona',
  '',
  '```js',
  "const socket = io('/chat');",
  '```',
].join('\n');
```

> Sababi: TypeScript template literal ichida ``` belgilarini ekranlash kerak
> bo'lardi va kod o'qib bo'lmas holga kelardi.

Qolgan ikki yo'l: `GET /api/chat/events` (hodisalar JSON ro'yxati) va
repodagi `WEBSOCKET.md`.

---

# 2. ADMIN PANEL

## 2.1 Arxitektura — 3 qatlam

```
┌──────────────────────────────────────────────────────────┐
│ 3-QATLAM: Komponentlar (sahifalar, MUI komponentlari)     │
│   • rang yozmaydi, shrift yozmaydi, soya yozmaydi         │
│   • faqat semantik nom: primary, card, success            │
├──────────────────────────────────────────────────────────┤
│ 2-QATLAM: MUI theme (theme.ts)                            │
│   • palette / typography / spacing / components           │
├──────────────────────────────────────────────────────────┤
│ 1-QATLAM: Tokenlar (tokens.ts + CSS o'zgaruvchilari)      │
│   ⭐ YAGONA MANBA — barcha hex, blur, radius, soya        │
└──────────────────────────────────────────────────────────┘
```

**Tekshirish (0 chiqishi kerak):**

```bash
grep -rE '#[0-9a-fA-F]{3,6}\b' src --include='*.tsx' --include='*.ts' \
  | grep -v 'tokens.ts' | grep -v '://'
```

---

## 2.2 1-qatlam: tokenlar

```ts
// admin/src/theme/tokens.ts
export type ThemeName = 'night' | 'frost' | 'daylight' | 'deep';

const night: ThemeTokens = {
  kind: 'dark',
  i18nKey: 'theme.night',

  background: '#0b1119', foreground: '#eaf1f8',
  card: '#17212b', popover: '#17212b',

  primary: '#3390ec', primaryForeground: '#ffffff',
  muted: '#212d39', mutedForeground: '#8a9aa9',
  accent: '#232e3c', border: '#26313d', input: '#242f3d', ring: '#3390ec',

  success: '#4ade80', warning: '#fbbf24',
  destructive: '#ef5350', info: '#4ea4f5', violet: '#c084fc',

  sidebar: '#141e28', sidebarAccent: '#2b5278',
  chart1: '#3390ec', chart2: '#4ea4f5', /* ... */

  radius: '0.75rem',
  panelShadow: '0 18px 50px -18px rgba(0,0,0,.65)',

  glassBlur: '30px', glassOpacity: '60%', glassRim: 'rgba(255,255,255,.08)',
  ambient: 'radial-gradient(1000px 600px at 50% -8%, rgba(51,144,236,.10), transparent 62%)',
};

// … frost, daylight, deep

export const THEMES: Record<ThemeName, ThemeTokens> = { night, frost, daylight, deep };
```

Tokenlarni CSS o'zgaruvchilariga aylantirish:

```ts
const kebab = (s: string) => s.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();

export function toCssVars(name: ThemeName): Record<string, string> {
  const tokens = THEMES[name];
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'kind' || key === 'i18nKey') continue;   // meta — CSS'ga chiqmaydi
    out[`--${kebab(key)}`] = value as string;            // chart1 -> --chart-1
  }

  // Radius shkalasi — hammasi --radius dan hosil bo'ladi
  out['--radius-sm']  = 'calc(var(--radius) * .6)';
  out['--radius-md']  = 'calc(var(--radius) * .8)';
  out['--radius-lg']  = 'var(--radius)';
  out['--radius-xl']  = 'calc(var(--radius) * 1.4)';
  out['--radius-2xl'] = 'calc(var(--radius) * 1.8)';
  out['--radius-pill'] = '980px';

  return out;
}
```

CSS'ga chiqarish — tema `<body>` klassida:

```tsx
// admin/src/theme/cssVars.tsx
const themeBlocks = Object.fromEntries(
  THEME_NAMES.map((name) => [`body.${name}`, toCssVars(name)]),
);
// natija: body.night { --primary: #3390ec; ... }

const sizeBlocks = Object.fromEntries(
  Object.entries(FONT_SIZES).map(([key, { px }]) => [
    `html[data-font-size="${key}"]`, { '--font-size-base': `${px}px` },
  ]),
);

const fontBlocks = Object.fromEntries(
  FONTS.map((f) => [`html[data-font="${f.key}"]`, { '--font-ui': f.stack }]),
);
```

---

## 2.3 Shisha retseptlari

```ts
// admin/src/theme/glass.ts

/** Yuqori qirradagi bir piksel "nur" — shishaga qalinlik hissini beradi */
const RIM_LIGHT = 'inset 0 1px 0 0 rgba(255,255,255,.14)';

const blur = (px: string) => ({
  backdropFilter: `blur(${px}) saturate(180%)`,
  WebkitBackdropFilter: `blur(${px}) saturate(180%)`,   // Safari uchun majburiy
});

/** 1-daraja — asosiy panel, karta */
export const glass: CSSObject = {
  background: 'color-mix(in oklab, var(--card) var(--glass-opacity), transparent)',
  ...blur('var(--glass-blur)'),
  border: '1px solid var(--glass-rim)',
  borderRadius: 'var(--radius-2xl)',
  boxShadow: `${RIM_LIGHT}, var(--panel-shadow)`,
  backgroundImage: 'none',
};

/** 2-daraja — panel ICHIDAGI blok: toolbar, filtr */
export const glassSoft: CSSObject = {
  background: 'color-mix(in oklab, var(--card) 40%, transparent)',
  ...blur('16px'),
  border: '1px solid color-mix(in oklab, var(--border) 50%, transparent)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'none',
};

/** 3-daraja — sidebar va topbar */
export const glassChrome: CSSObject = {
  background: 'color-mix(in oklab, var(--sidebar) 70%, transparent)',
  ...blur('40px'),
  /* ... */
};

/** 4-daraja — dialog, menyu (matn ustma-ust tushmasin) */
export const glassSolid: CSSObject = {
  background: 'color-mix(in oklab, var(--popover) 92%, transparent)',
  ...blur('20px'),
  /* ... */
};
```

**Qoidalar:** `glass` ichida yana `glass` bo'lmaydi · bir ekranda ≤4 blur qatlami ·
ro'yxat qatorlariga blur berilmaydi · rasm ustiga blur qo'yilmaydi.

Zaxira (brauzer qo'llab-quvvatlamasa):

```ts
'@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
  '.MuiPaper-root': { background: 'var(--card) !important' },
},
```

---

## 2.4 2-qatlam: MUI theme

⚠️ **Eng muhim qaror:** MUI palitrasiga **haqiqiy hex** beriladi, `var()` emas —
chunki `alpha()`, `lighten()`, `darken()` CSS `var()` ni parse qila olmaydi va
butun panel qora rangga aylanib qoladi.

```ts
// admin/src/theme/theme.ts
export function buildTheme(name: ThemeName, lang: string): Theme {
  const t = THEMES[name];

  return createTheme({
    palette: {
      mode: t.kind,
      primary:   { main: t.primary,   contrastText: t.primaryForeground },
      error:     { main: t.destructive },
      warning:   { main: t.warning },
      success:   { main: t.success },
      background: { default: t.background, paper: t.card },
      text:      { primary: t.foreground, secondary: t.mutedForeground },
      divider:   t.border,
    },

    shape: { borderRadius: parseFloat(t.radius) * 16 },

    // 1 birlik = 0.5rem -> shrift o'sganda ORALIQLAR HAM o'sadi
    spacing: (factor: number) => `${0.5 * factor}rem`,

    typography: {
      fontFamily: 'var(--font-ui)',   // CSS var bu yerda XAVFSIZ (rang emas)
      htmlFontSize: 16,               // ⚠️ O'ZGARTIRILMAYDI
      h1: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-.02em' },
      // ⚠️ MAJBURIY: kirillda UPPERCASE o'qishni qiyinlashtiradi
      button: { textTransform: 'none', fontWeight: 600 },
    },

    components: { /* pastda */ },
  },
  // MUI'ning O'Z ichki matnlari (pagination va h.k.)
  lang === 'ru' ? ruRU : {});
}
```

### Paper — eng muhim override

MUI barcha sirtlarni `Paper` dan quradi, shuning uchun 4 ta variant shu yerda:

```ts
MuiPaper: {
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: {
      backgroundImage: 'none',   // ⚠️ MUI'ning dark-mode elevation overlay'ini o'chiradi
      transition: 'background-color .25s ease, border-color .25s ease',
    },
  },
  variants: [
    { props: { variant: 'glass' },       style: glass },
    { props: { variant: 'glassSoft' },   style: glassSoft },
    { props: { variant: 'glassChrome' }, style: glassChrome },
    { props: { variant: 'glassSolid' },  style: glassSolid },
  ],
},
```

TypeScript'ga yangi variantlarni tanitish:

```ts
// admin/src/theme/mui-augment.d.ts
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    glass: true; glassSoft: true; glassChrome: true; glassSolid: true;
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides { soft: true }
}
```

> ⚠️ Fayl nomi `theme.d.ts` bo'lmasligi kerak — `theme.ts` bilan bir papkada bo'lsa,
> TypeScript uni `theme.ts` ning deklaratsiya fayli deb qabul qiladi va augmentation
> ishlamaydi. Shuning uchun `mui-augment.d.ts`.

### Jadval uslubi

```ts
MuiTableHead: {
  styleOverrides: {
    root: {
      '& .MuiTableCell-root': {
        fontSize: '.6875rem', fontWeight: 700,
        letterSpacing: '.04em', textTransform: 'uppercase',
        color: 'var(--muted-foreground)',
        height: 40, whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--border)',
      },
    },
  },
},
MuiTableRow: {
  styleOverrides: {
    root: { '&:last-of-type .MuiTableCell-root': { borderBottom: 'none' } },
    hover: { '&:hover': { backgroundColor: soft('var(--accent)', 40) } },
  },
},
```

### Yumshoq tugma varianti

```ts
const soft = (v: string, pct = 15) => `color-mix(in oklab, ${v} ${pct}%, transparent)`;

MuiButton: {
  variants: [{
    props: { variant: 'soft' },
    style: {
      background: soft('var(--primary)', 14),
      color: 'var(--primary)',
      '&:hover': { background: soft('var(--primary)', 22) },
    },
  }],
},
```

---

## 2.5 Provayderlar

**Uchta o'q mustaqil:** til · tema · ko'rinish. Biri o'zgarsa boshqasi o'zgarmaydi.

```tsx
// admin/src/App.tsx
export default function App() {
  return (
    <AppearanceProvider>        {/* shrift turi + o'lchami -> <html data-*> */}
      <ThemeModeProvider>       {/* tema nomi -> <body class>              */}
        <I18nProvider>          {/* til -> <html lang>                     */}
          <MuiLayer>            {/* MUI theme + CSS o'zgaruvchilari        */}
            <ToastProvider>
              <QueryClientProvider client={queryClient}>
                <AuthProvider>
                  <BrowserRouter><Gate /></BrowserRouter>
                </AuthProvider>
              </QueryClientProvider>
            </ToastProvider>
          </MuiLayer>
        </I18nProvider>
      </ThemeModeProvider>
    </AppearanceProvider>
  );
}
```

Tema — `<body>` klassida:

```tsx
// admin/src/providers/ThemeModeProvider.tsx
useEffect(() => {
  const body = document.body;
  THEME_NAMES.forEach((n) => body.classList.remove(n));
  body.classList.add(theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}, [theme]);
```

Ko'rinish — `<html>` atributlarida:

```tsx
// admin/src/providers/AppearanceProvider.tsx
useEffect(() => {
  document.documentElement.setAttribute('data-font-size', fontSize);
  localStorage.setItem(STORAGE_KEYS.fontSize, fontSize);
}, [fontSize]);
```

MUI theme faqat tema yoki til o'zgarganda qayta quriladi:

```tsx
function MuiLayer({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeMode();
  const { i18n } = useTranslation();
  const muiTheme = useMemo(() => buildTheme(theme, i18n.language), [theme, i18n.language]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      <CssVariables />
      {children}
    </ThemeProvider>
  );
}
```

### FOUC'ga qarshi boot skript

React'dan **oldin** ishlaydi — sahifa yangilanganda rang miltillamaydi:

```html
<!-- admin/index.html, <body> ning eng boshida -->
<script>
  (function () {
    try {
      var THEMES = ['night', 'frost', 'daylight', 'deep'];
      var body = document.body, html = document.documentElement;

      var theme = localStorage.getItem('ui-theme');
      if (THEMES.indexOf(theme) > -1) {
        THEMES.forEach(function (x) { body.classList.remove(x); });
        body.classList.add(theme);
      }

      var size = localStorage.getItem('ui-font-size');
      if (['sm','md','lg','xl','xxl'].indexOf(size) > -1) html.setAttribute('data-font-size', size);

      var font = localStorage.getItem('ui-font');
      if (font) html.setAttribute('data-font', font);

      var lang = localStorage.getItem('ui-lang');
      if (['uz','ru'].indexOf(lang) > -1) html.setAttribute('lang', lang);
    } catch (e) {}
  })();
</script>
```

`localStorage` kalitlari: `ui-theme` · `ui-font-size` · `ui-font` · `ui-lang` · `ui-sidebar-collapsed`

---

## 2.6 Ko'p tillilik

⚠️ Dizayn fayllarida birorta foydalanuvchi matni yo'q, tarjima fayllarida birorta rang yo'q.

```tsx
// admin/src/providers/I18nProvider.tsx
void i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz }, ru: { translation: ru } },
  lng: initial,
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});
```

Xaritalarda **matn saqlanmaydi** — faqat rang va kalit:

```tsx
// admin/src/components/ui/StatusBadge.tsx
const STATUS: Record<StatusKey, { color: string; i18nKey: string }> = {
  active:     { color: 'var(--success)',          i18nKey: 'status.active' },
  inactive:   { color: 'var(--muted-foreground)', i18nKey: 'status.inactive' },
  inStock:    { color: 'var(--success)',          i18nKey: 'status.inStock' },
  outOfStock: { color: 'var(--destructive)',      i18nKey: 'status.outOfStock' },
  lowStock:   { color: 'var(--warning)',          i18nKey: 'status.lowStock' },
};

export function StatusBadge({ status }: { status: StatusKey }) {
  const { t } = useTranslation();
  const { color, i18nKey } = STATUS[status];
  return (
    <Box sx={{ color, background: `color-mix(in oklab, ${color} 15%, transparent)`, /* ... */ }}>
      <Box aria-hidden sx={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {t(i18nKey)}   {/* rang + nuqta + MATN birga — rang yagona signal emas */}
    </Box>
  );
}
```

Sana va raqamlar — har doim `Intl`:

```ts
// admin/src/lib/format.ts
export const formatNumber = (value: number, lang: string) =>
  new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(value);

/** 189 576 000 000 -> "189.6 mlrd" / "189,6 млрд" */
export function formatCompactMoney(value: number, lang: string): string {
  const ru = lang === 'ru';
  const units: [number, string][] = ru
    ? [[1e12,' трлн'], [1e9,' млрд'], [1e6,' млн'], [1e3,' тыс']]
    : [[1e12,' trln'], [1e9,' mlrd'], [1e6,' mln'], [1e3,' ming']];

  for (const [factor, suffix] of units) {
    if (Math.abs(value) >= factor) {
      const n = value / factor;
      return new Intl.NumberFormat(ru ? 'ru-RU' : 'uz-UZ', {
        maximumFractionDigits: n < 10 ? 1 : 0,
      }).format(n) + suffix;
    }
  }
  return formatNumber(value, lang);
}
```

### Shriftlar — hammasi kirill bilan

```ts
// admin/src/theme/appearance.ts
/**
 * ⚠️ Har bir shrift KIRILLNI qo'llab-quvvatlaydi.
 * Lato, Poppins, Raleway, Nunito kabi kirillsiz shriftlar ATAYLAB yo'q —
 * ruscha matn boshqa shriftga tushib, sahifa "yamoq" bo'lib ko'rinadi.
 */
export const FONTS: FontOption[] = [
  { key: 'system', label: 'Tizim shrifti', google: null, category: 'system', stack: SYSTEM_STACK },
  { key: 'inter', label: 'Inter', google: 'Inter', category: 'sans', stack: `"Inter", ${SYSTEM_STACK}` },
  // … Roboto, Open Sans, Noto Sans, Montserrat, PT Sans, Fira Sans,
  //   IBM Plex Sans, Rubik, Manrope, PT Serif, Lora, JetBrains Mono, Roboto Mono
];

/** Jadval raqamlari uchun — foydalanuvchi tanlovidan QAT'IY NAZAR o'zgarmaydi */
export const MONO_STACK = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
```

---

## 2.7 API qatlami

```ts
// admin/src/api/client.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://backend.magnateshop.uz/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

// Har so'rovga tokenni qo'shamiz
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 kelsa — token eskirgan, login sahifasiga qaytaramiz
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
```

Backend qobig'ini ochish:

```ts
/** Faqat `data` ni qaytaradi */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  return (await promise).data.data;
}

/** `message` bilan birga (toast ko'rsatish uchun) */
export async function unwrapFull<T>(promise: Promise<{ data: ApiEnvelope<T> }>) {
  const res = await promise;
  return { data: res.data.data, message: res.data.message };
}
```

⭐ Backend xabarlari **o'zgartirilmaydi** — ular allaqachon o'zbekcha va tushuntirilgan:

```ts
export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const body = error.response?.data;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;     // ← backend matni to'g'ridan-to'g'ri
    if (!error.response) return 'network';
  }
  return fallback;
}
```

---

## 2.8 Hook'lar

### `useAutoPageSize` — qator soni ekrandan hisoblanadi

```ts
// admin/src/hooks/useAutoPageSize.ts
export function useAutoPageSize({
  rowHeight = 56, reserved = 380, min = 5, max = 30,
}: Options = {}): number {
  const calc = () => {
    if (typeof window === 'undefined') return min;   // SSR
    const usable = window.innerHeight - reserved;
    return Math.max(min, Math.min(max, Math.floor(usable / rowHeight)));
  };

  const [size, setSize] = useState(calc);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize(calc()));
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', onResize); };
  }, [rowHeight, reserved, min, max]);

  return size;
}
```

> Noutbukda ~8 qator, katta monitorda ~20 qator ko'rsatiladi va bo'sh joy qolmaydi.

### `useDebounced` — qidiruvda har harfda so'rov ketmasin

```ts
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

---

## 2.9 Umumiy UI komponentlari

### `CollapsibleSection` — yopiqda DOM'dan chiqadi

```tsx
<Collapse in={open} unmountOnExit timeout={250}>
  <Box sx={{ px: { xs: 1.75, md: 2.5 }, pb: 2, pt: 0.5 }}>{children}</Box>
</Collapse>
```

Sarlavha — haqiqiy `<button aria-expanded>`:

```tsx
<Box
  component="button" type="button"
  aria-expanded={open}
  onClick={() => setOpen((v) => !v)}
  sx={{ flex: 1, minWidth: 0, /* ⚠️ uzun ruscha nom layoutni yorib chiqmasin */ }}
>
  <ExpandMoreRoundedIcon
    sx={{
      transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
      transition: 'transform .2s cubic-bezier(.4,0,.2,1)',
    }}
  />
  {/* ikonka + nom + son */}
</Box>

{/* O'ngdagi amal AKKORDEONNI OCHMAYDI — alohida element */}
{action && <Box sx={{ flexShrink: 0, ml: 1.5 }}>{action}</Box>}
```

### `PagedList` — mijoz tomonida sahifalash

```tsx
export function PagedList<T>({ items, pageSize, children, empty, resetKey }: Props<T>) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));

  // Filtr/qidiruv o'zgarganda 1-sahifaga qaytamiz
  useEffect(() => setPage(1), [resetKey]);

  // Mavjud bo'lmagan sahifada qolib ketmasin
  useEffect(() => { setPage((p) => Math.min(p, pages)); }, [pages]);

  const current = Math.min(page, pages);
  const from = (current - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(from, from + pageSize), [items, from, pageSize]);

  if (items.length === 0) return <>{empty}</>;

  return (
    <>
      {children(pageItems)}
      {/* Bitta sahifa bo'lsa pagination UMUMAN ko'rsatilmaydi */}
      {pages > 1 && (
        <PaginationBar page={current} pages={pages} from={from + 1}
          to={Math.min(from + pageSize, items.length)} total={items.length} onChange={setPage} />
      )}
    </>
  );
}
```

`PaginationBar` — mijoz va server tomonida **bir xil ko'rinish**:

```tsx
<Stack
  onKeyDown={(e) => {                        // ← / → bilan sahifa almashadi
    if (e.key === 'ArrowLeft'  && page > 1)     onChange(page - 1);
    if (e.key === 'ArrowRight' && page < pages) onChange(page + 1);
  }}
>
  <Typography variant="caption" className="tabular">
    {t('table.showing', { from, to, total })}   {/* 1–12 / 47 */}
  </Typography>

  <IconButton disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t('common.prev')}>
    <ChevronLeftRoundedIcon fontSize="small" />
  </IconButton>

  <Box className="tabular" sx={{ minWidth: 52, textAlign: 'center' }}>
    {t('table.page', { page, pages })}
  </Box>

  <IconButton disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={t('common.next')}>
    <ChevronRightRoundedIcon fontSize="small" />
  </IconButton>
</Stack>
```

> `.tabular` klassi — `font-variant-numeric: tabular-nums` + monospace.
> Raqam almashganda kenglik sakramaydi.

### `TableSkeleton` — spinner emas, kontent SHAKLI

```tsx
export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <Box sx={{ py: 1 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <Stack key={r} direction="row" spacing={2} sx={{ height: 56, px: 1.5 }}>
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} variant="text"
              sx={{ flex: c === 0 ? 2 : 1, background: 'var(--skeleton-base)' }} />
          ))}
        </Stack>
      ))}
    </Box>
  );
}
```

---

## 2.10 Layout

```
┌─ ambient qatlam (fixed, inset-0, z:-1, pointer-events:none) ──────┐
│  ┌── p:12px ──────────────────────────────────────────────────┐   │
│  │ ┌─ sidebar ─┐  ┌─ topbar (sticky, h:56px) ───────────────┐ │   │
│  │ │glassChrome│  ├─ PageHeader (glass) ────────────────────┤ │   │
│  │ │sticky     │  ├─ kontent (glass panellar, gap 12px) ────┤ │   │
│  │ │256/72px   │  └─────────────────────────────────────────┘ │   │
│  │ └───────────┘                                              │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

⚠️ Ambient fon **alohida `fixed` qatlam** — layout'ga `overflow:hidden` qo'yilsa
sticky sidebar/topbar buziladi:

```tsx
// admin/src/components/layout/AppShell.tsx
<Box aria-hidden className="ambient" />

<Box sx={{ display: 'flex', gap: 1.5, p: 1.5, minHeight: '100dvh' }}>
  <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
    <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
  </Box>

  {/* Mobil drawer — portal orqali body ga chiqadi */}
  <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
          sx={{ display: { xs: 'block', lg: 'none' } }}>
    <AppSidebar collapsed={false} inDrawer onNavigate={() => setDrawerOpen(false)} />
  </Drawer>

  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <AppTopbar titleKey={titleKey} onOpenDrawer={() => setDrawerOpen(true)} />
    <Box component="main" sx={{ flex: 1, minWidth: 0 }}><Outlet /></Box>
  </Box>
</Box>
```

Ambient auraning o'zi:

```ts
'.ambient': {
  position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
  background: 'var(--ambient)', overflow: 'hidden',
},
'.ambient::before': {
  content: '""', position: 'absolute', inset: '-20%',
  background: [
    'radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 42%)',
    'radial-gradient(circle at 80% 65%, color-mix(in oklab, var(--chart-2) 16%, transparent), transparent 46%)',
  ].join(', '),
  filter: 'blur(46px)',
  animation: 'aurora 26s ease-in-out infinite',
},
'@media (prefers-reduced-motion: reduce)': { '.ambient::before': { animation: 'none' } },
```

### Dock uslubidagi sidebar

Har nav elementi — **glossy yumaloq plita** `36×36px`:

```tsx
<Box className="dock-tile" aria-hidden
  sx={{
    width: 36, height: 36, borderRadius: 14,
    background: 'color-mix(in oklab, var(--sidebar-accent) 45%, transparent)',
    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
    transition: 'transform .2s cubic-bezier(.4,0,.2,1), background-color .15s ease',
  }}
>{item.icon}</Box>
```

```tsx
sx={{
  '&.active .dock-tile': {
    color: 'var(--sidebar-primary)',
    background: 'color-mix(in oklab, var(--sidebar-primary) 20%, transparent)',
    borderColor: 'color-mix(in oklab, var(--sidebar-primary) 40%, transparent)',
  },
  '&:hover .dock-tile': { transform: 'translateY(-2px) scale(1.08)' },  // macOS dock hissi
}}
```

Topbar `z-index: 30` — **1100 dan past**, aks holda MUI portal'lari ustida qolib ketadi.

---

## 2.11 Sahifalar

### Kategoriyalar — mijoz tomonida sahifalash

Ro'yxat kichik (8 ta), shuning uchun bir marta olinadi va mahalliy filtrlanadi:

```tsx
const query = useQuery({
  queryKey: ['categories'],
  queryFn: () => categoriesApi.list({ limit: 100, sortBy: 'id', order: 'ASC' }),
});

const rows = useMemo(() => {
  const items = query.data?.items ?? [];
  const q = search.trim().toLowerCase();
  return items.filter((c) => {
    if (status === 'active' && !c.isActive) return false;
    if (status === 'inactive' && c.isActive) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
  });
}, [query.data, search, status]);
```

Mutatsiyalar — backend xabari to'g'ridan-to'g'ri toast'ga:

```tsx
const statusMutation = useMutation({
  mutationFn: (v: { id: number; isActive: boolean }) => categoriesApi.setStatus(v.id, v.isActive),
  onSuccess: (res) => { toast(res.message); invalidate(); },   // ← backend matni
  onError,
});

const onError = (e: unknown) => {
  const msg = errorMessage(e, t('error.unknown'));
  toast(msg === 'network' ? t('error.network') : msg, 'error');
};
```

Uchlik tuzilishi:

```tsx
<CollapsibleSection titleKey="categories.list" icon={<CategoryRoundedIcon />} count={rows.length}>
  <TableToolbar search={search} onSearch={setSearch}
    searchPlaceholderKey="categories.searchPlaceholder"
    filters={[{ value: status, onChange: setStatus, labelKey: 'status.title', options: STATUS_OPTIONS }]} />

  {query.isPending ? <TableSkeleton rows={pageSize} columns={5} />
   : query.isError  ? <ErrorState message={...} onRetry={() => void query.refetch()} />
   : <PagedList items={rows} pageSize={pageSize} resetKey={`${search}|${status}`}
       empty={<EmptyState titleKey={...} descriptionKey={...} action={...} />}>
       {(pageRows) => (
         <Box sx={{ width: '100%', overflowX: 'auto' }}>   {/* faqat jadval scroll qiladi */}
           <Table size="small" sx={{ minWidth: 720 }}>…</Table>
         </Box>
       )}
     </PagedList>}
</CollapsibleSection>
```

### Avtomobillar — server tomonida sahifalash

Ro'yxat cheksiz o'sishi mumkin, shuning uchun `page`/`limit` serverga yuboriladi.
Ko'rinish esa **bir xil** qoladi:

```tsx
const limit = useAutoPageSize({ rowHeight: 64, reserved: 430, min: 5, max: 25 });

// Filtr o'zgarganda sahifa 1 ga qaytadi
const filterKey = `${debouncedSearch}|${categoryId}|${status}|${stock}|${limit}`;
useEffect(() => setPage(1), [filterKey]);

const query = useQuery({
  queryKey: ['products', { page, limit, debouncedSearch, categoryId, status, stock }],
  queryFn: () => productsApi.list({
    page, limit,
    search: debouncedSearch || undefined,
    categoryId: categoryId === 'all' ? undefined : Number(categoryId),
    isActive:   status === 'all' ? undefined : status === 'active',
    inStock:    stock === 'all' ? undefined : stock === 'in',
    sortBy: 'id', order: 'ASC',
  }),
  placeholderData: keepPreviousData,   // sahifa almashganda jadval "sakramaydi"
});
```

Yuklanayotganda mazmun yo'qolmaydi, faqat xiralashadi:

```tsx
<Box sx={{ opacity: query.isFetching ? 0.6 : 1, transition: 'opacity .15s ease' }}>
```

### Dashboard

```tsx
const stats      = useQuery({ queryKey: ['dashboard','stats'],          queryFn: () => dashboardApi.stats() });
const byCategory = useQuery({ queryKey: ['dashboard','category-stats'], queryFn: () => dashboardApi.categoryStats() });
const lowStock   = useQuery({ queryKey: ['dashboard','low-stock'],      queryFn: () => dashboardApi.lowStock() });
```

Kategoriya diagrammasi — `LinearProgress` bilan, eng kattasiga nisbatan:

```tsx
const maxCount = Math.max(1, ...(byCategory.data ?? []).map((c) => c.productsCount));

<LinearProgress variant="determinate" value={(c.productsCount / maxCount) * 100}
  aria-label={c.name} sx={{ height: 5 }} />
```

---

## 2.12 View modallar

Uch xil usulda ochiladi: **qatorni bosib** · **ko'z 👁 tugmasi** · **`Enter`/`Space`**.

```tsx
<TableRow
  key={p.id}
  hover
  tabIndex={0}
  role="button"
  aria-label={p.name}
  onClick={() => setViewing(p)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewing(p); }
  }}
  sx={{ height: 64, cursor: 'pointer' }}
>
```

Switch va amal tugmalari qatorni **ochmaydi**:

```tsx
<TableCell align="center" onClick={(e) => e.stopPropagation()}>
  <Switch checked={p.isActive} onChange={...} />
</TableCell>

<TableCell align="right" onClick={(e) => e.stopPropagation()}>
  <Tooltip title={t('common.view')}>
    <IconButton size="small" onClick={() => setViewing(p)}>
      <VisibilityRoundedIcon fontSize="small" />
    </IconButton>
  </Tooltip>
  {/* edit, delete */}
</TableCell>
```

`ProductViewDialog` — rasm, narx/soni kartochkalari, tavsif, texnik ma'lumot:

```tsx
{/* Rasm — blur qo'yilmaydi */}
<Box sx={{ height: 190, borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
  {p.image && !imageFailed
    ? <Box component="img" src={p.image} alt={p.name}
        onError={() => setImageFailed(true)}
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : <Stack alignItems="center"><DirectionsCarFilledRoundedIcon />
        <Typography variant="caption">{t('products.noImage')}</Typography></Stack>}
</Box>

{/* Narx va soni — glassSoft kartochkalarda */}
<Paper variant="glassSoft" sx={{ flex: 1, p: 1.5 }}>
  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('products.price')}</Typography>
  <Typography className="tabular" sx={{ fontSize: '1.125rem', fontWeight: 800 }}>
    {formatNumber(p.price, lang)}
  </Typography>
</Paper>
```

`CategoryViewDialog` — kategoriya raqamlari + ichidagi avtomobillar:

```tsx
// Faqat dialog ochilganda so'raladi
const products = useQuery({
  queryKey: ['products', 'by-category', c?.id],
  queryFn: () => productsApi.list({ categoryId: c!.id, limit: 100, sortBy: 'price', order: 'DESC' }),
  enabled: !!c,
});

const activeCount = items.filter((p) => p.isActive).length;
const totalStock  = items.reduce((sum, p) => sum + p.stock, 0);
const totalValue  = items.reduce((sum, p) => sum + p.price * p.stock, 0);
```

---

## 2.13 Chat sahifasi

Ikki fayl: `admin/src/api/socket.ts` (ulanish) va `admin/src/pages/ChatPage.tsx`.

### Ulanish — mijozdan farqi bitta

```ts
// admin/src/api/socket.ts
const ORIGIN = API_URL.replace(/\/api\/?$/, '');   // .../api -> ...
export const WS_URL = `${ORIGIN}/chat`;

export function createChatSocket(): Socket {
  return io(WS_URL, {
    auth: { token: localStorage.getItem(TOKEN_KEY) },   // ⬅️ shu tufayli "admin"
  });
}
```

> `transports` ataylab belgilanmagan: socket.io avval oddiy so'rov bilan
> ulanib, keyin WebSocket'ga o'tadi. Nginx WebSocket'ni o'tkazmasa ham chat
> ishlayveradi (sekinroq bo'lsa ham).

### ⭐ React'dagi 3 ta tuzoq

**1) Ulanish har renderda takrorlanadi** — `useEffect(..., [])` + majburiy tozalash:

```tsx
useEffect(() => {
  const socket = createChatSocket();
  socketRef.current = socket;

  socket.on(CHAT_EVENTS.MESSAGE, (m) => setMessages((list) => [...list, m]));

  // ⚠️ Busiz: har renderda yangi ulanish, xabar 2-3 marta ko'rinadi
  return () => { socket.close(); socketRef.current = null; };
}, [qc, toast]);
```

**2) `socket.on` ichida state ESKI qiymatda qotib qoladi (stale closure)**

`socket.on(...)` bir marta yoziladi — uning ichidagi `activeId` o'sha paytdagi
qiymatda qolib ketadi. Yechim: state'ning **ref nusxasi**:

```tsx
const activeIdRef = useRef<number | null>(null);

const openChat = (chat: Chat) => {
  activeIdRef.current = chat.id;    // hodisa ichida o'qish uchun
  setActiveId(chat.id);             // ekranga chizish uchun
  socketRef.current?.emit(CHAT_EVENTS.JOIN, { chatId: chat.id });
};

socket.on(CHAT_EVENTS.MESSAGE, (m) => {
  if (m.chatId !== activeIdRef.current) return;   // ✅ doim yangi qiymat
  setMessages((list) => [...list, m]);
});
```

**3) State'ni joyida o'zgartirish**

```tsx
setMessages((list) => [...list, m]);    // ✅
// list.push(m); setMessages(list);     // ❌ React sezmaydi
```

### ⭐ react-query'ni WebSocket bilan yangilash

Ro'yxat birinchi marta REST bilan yuklanadi, keyingi yangilanishlar
WebSocket'dan to'g'ridan-to'g'ri keshga yoziladi — qayta so'rov yo'q:

```tsx
const chatsQuery = useQuery({ queryKey: CHATS_KEY, queryFn: () => chatApi.list() });

socket.on(CHAT_EVENTS.CHATS, (payload) => {
  qc.setQueryData(CHATS_KEY, payload.chats);
});
```

### O'qilgan holati

Server oddiy qoidada ishlaydi: mijoz yozsa `unreadForAdmin` oshadi. Suhbat
admin ekranida ochiq turgan bo'lsa — admin paneli o'zi xabar beradi:

```tsx
if (message.sender === 'guest') {
  socket.emit(CHAT_EVENTS.READ, { chatId: message.chatId });
}
```

> Serverni «kim hozir qaysi sahifada turibdi» ni bilishga majburlamaslik uchun
> shunday qilindi — mantiq mijoz tomonida, server soddaligicha qoladi.

### Ko'rinish

Ikki ustunli `glass` panel: chapda suhbatlar, o'ngda yozishuv. Mobil ekranda
faqat bittasi ko'rinadi (`display: { xs: activeId ? 'none' : 'flex', md: 'flex' }`),
orqaga qaytish tugmasi bilan. Xabar pufaklari mavjud tokenlardan rang oladi —
yangi rang qo'shilmadi.

---

# 3. DEPLOY

## `docker-compose.yml` — uchta servis

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: eshop-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes: [eshop-db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USERNAME} -d ${DB_NAME}']
      interval: 10s
    # Baza tashqariga ochilmaydi — faqat api konteyneri ko'radi

  api:
    build: .
    container_name: eshop-api
    restart: unless-stopped
    env_file: .env
    environment:
      DB_HOST: db          # konteyner ichida "localhost" emas, "db"
      PORT: 3000
    ports: ['127.0.0.1:${HOST_PORT:-3000}:3000']
    depends_on:
      db: { condition: service_healthy }

  admin:
    build:
      context: ./admin
      args:
        # ⚠️ Vite build paytida bundle ichiga yoziladi
        VITE_API_URL: ${ADMIN_API_URL:-https://backend.magnateshop.uz/api}
    container_name: eshop-admin
    restart: unless-stopped
    ports: ['127.0.0.1:${ADMIN_HOST_PORT:-4300}:80']

volumes:
  eshop-db-data:
```

## Backend `Dockerfile` — ikki bosqichli

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY public ./public
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
```

## Admin `Dockerfile` — React → nginx

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
ARG VITE_API_URL=https://backend.magnateshop.uz/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

Konteyner ichidagi nginx — SPA fallback:

```nginx
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";   # hashli fayllar
    try_files $uri =404;
}

location / {
    try_files $uri $uri/ /index.html;               # react-router uchun
    add_header Cache-Control "no-cache";
}
```

## Server nginx + SSL

```nginx
server {
    listen 80;
    server_name admin.magnateshop.uz;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        proxy_pass http://127.0.0.1:4300;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/admin.magnateshop.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d admin.magnateshop.uz --redirect
```

> To'liq infratuzilma (portlar, `.env`, tiklash tartibi) — **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

# 4. Uchragan muammolar va yechimlar

Bularni **eslab qolish kerak** — o'xshash loyihalarda yana chiqadi.

| # | Muammo | Sabab | Yechim |
|---|---|---|---|
| 1 | `JwtModuleOptions` TS xatosi: `expiresIn` string emas | `ms` kutubxonasi `StringValue` turini talab qiladi | `as \`${number}d\`` bilan cast |
| 2 | Wikipedia rasmlari **429 Too Many Requests** | Hotlink va tez-tez so'rov | Rasmlarni **yuklab olib**, `public/images/cars/` dan tarqatish |
| 3 | `/900px-` havolalari **400** qaytardi | Wikimedia faqat oldindan tayyorlangan o'lchamlarni beradi | `action=query&prop=pageimages&pithumbsize=800` API'sidan olish |
| 4 | Swagger'da `@ApiBearerAuth()` ishlamadi | `addBearerAuth(..., 'JWT-auth')` nomlangan edi | Nomsiz `addBearerAuth({...})` (default `bearer`) |
| 5 | MUI Paper variantlari TS'da tanilmadi | `theme.d.ts` fayli `theme.ts` ning deklaratsiyasi deb qabul qilingan | **`mui-augment.d.ts`** deb qayta nomlash |
| 6 | Docker'da `Cannot find type definition file for 'node'` | `@types/node` faqat lokal `node_modules` da hoisted edi | `devDependencies` ga aniq qo'shish |
| 7 | nginx konfigda `\$host` literal qoldi | SSH heredoc ichidagi qo'shaloq escaping | Faylni lokalda yozib **`scp`** bilan yuborish |
| 8 | 3000-port band | Serverda boshqa loyiha ishlayapti | Backend 4200, admin 4300 portlariga o'tkazish |
| 9 | `LessThanOrEqual(x) && MoreThan(0)` ishlamadi | JS `&&` ikkinchi operandni qaytaradi | TypeORM'ning **`And(...)`** operatori |
| 10 | Yorug' temada matn o'qilmadi | Shaffoflik juda yuqori | `daylight` da `glassOpacity: 70%`, `glassBlur: 24px` (to'q temalarda 55–60%) |
| 11 | WS handlerlari 401 qaytardi | Global `JwtAuthGuard` gateway'ga ham qo'llanadi, passport esa `Authorization` sarlavhasini qidiradi | Gateway'ga `@Public()`, tokenni `handshake.auth` dan o'zimiz tekshirish |
| 12 | WS'da xato tashlansa server yiqilardi | `AllExceptionsFilter` HTTP `response` ni kutadi | Handlerlar `try/catch` ichida, xato `chat:error` hodisasi bo'lib qaytadi |
| 13 | WS payloadi `class` bo'lsa `ValidationPipe` xato berdi | Global pipe barcha kontekstlarga qo'llanadi | Payloadlar `interface`, tekshiruv qo'lda |
| 14 | Admin boshqa suhbatga o'tsa, eskisining xabarlari ham kelaverdi | `socket.join` qo'shadi, o'zi chiqarmaydi | `chat:join` da avval `socket.leave(eski xona)` |
| 15 | Xabar ikki marta ko'rindi | Yuborayotganda ekranga qo'lda ham qo'shilgan | Faqat `chat:message` hodisasida chizish (`server.to` o'zingga ham qaytaradi) |
| 16 | Bolalar parolni o'zgartirib, hammasi tizimdan chiqib qoldi | Hamma bitta `admin` hisobidan foydalanadi | `PATCH /auth/change-password` **butunlay olib tashlandi** — parol faqat `.env` da |

---

## Yakuniy holat

| | |
|---|---|
| Backend | 25 endpoint, 5 modul, 100 ta avtomobil, 8 kategoriya |
| Chat | WebSocket `/chat`, 8 hodisa, mijoz sahifasi `public/chat.html` |
| Admin panel | 46 fayl, 4 tema, uz/ru, 15 shrift, 5 o'lcham |
| Repo | 222 fayl · https://github.com/F2RUZ/-e-shop-backend |
| Jonli | https://admin.magnateshop.uz · https://backend.magnateshop.uz/docs |
| Kirish | `admin` / `admin123` |
