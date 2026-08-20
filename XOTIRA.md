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
  - [1.10 Admins moduli — adminlarni boshqarish](#110-admins-moduli--adminlarni-boshqarish)
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
  - [2.14 Adminlar sahifasi](#214-adminlar-sahifasi)
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

## 1.10 Admins moduli — adminlarni boshqarish

Shu paytgacha panelga faqat **bitta** hisob kirardi — `.env` dagi `admin`.
Endi bosh admin o'ziga **yordamchilar** qo'sha oladi: har bir o'quvchiga alohida
login berib, ishini alohida ko'rish mumkin.

Swagger'dagi teg: **`2. Admins — boshqaruvchilar`** — `auth` dan keyin turadi,
chunki avval tizimga kirasan, keyin adminlarni ko'rasan.

**Fayllar:**

```
src/admins/
├── admins.controller.ts        ← endpointlar + Swagger tavsiflari
├── admins.service.ts           ← butun mantiq shu yerda
├── admins.module.ts            ← modulni yig'ish
├── super-admin.helper.ts       ← ⭐ "kim bosh admin?" savoliga javob
├── guards/
│   └── super-admin.guard.ts    ← faqat bosh adminni o'tkazadigan qorovul
└── dto/
    ├── create-admin.dto.ts     ← POST va PUT uchun
    ├── update-admin.dto.ts     ← PATCH uchun (PartialType)
    ├── change-own-password.dto.ts
    └── query-admin.dto.ts      ← qidiruv + saralash + sahifalash
```

### ⭐ Yangi jadval YO'Q — eski `Admin` entity ishlatiladi

Bu modulda **bitta ham yangi jadval, ustun yoki migratsiya yo'q**. `Admin`
entity `auth` modulida allaqachon bor (1.3-bo'limga qarang) — biz uni faqat
**ishlatamiz**, tegmaymiz:

```ts
// src/admins/admins.module.ts
@Module({
  // Admin entity auth modulida yaratilgan — bu yerda faqat ishlatiladi, o'zgartirilmaydi
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [AdminsController],
  providers: [AdminsService, SuperAdminGuard],
  exports: [AdminsService],
})
export class AdminsModule {}
```

> **Dars:** yangi imkoniyat qo'shish har doim yangi jadval degani emas.
> Avval bor narsani ishlatib ko'r — baza sxemasini o'zgartirmasang, deploy ham,
> ma'lumot ham xavfsiz qoladi.

Javobga kerak bo'lgan qo'shimcha belgi (`isSuperAdmin`) bazada saqlanmaydi —
uni **servis hisoblab qo'shadi**:

```ts
// src/admins/admins.service.ts
/**
 * Javobga qo'shiladigan qo'shimcha belgi.
 * Panel shu belgiga qarab bosh adminning "Tahrirlash"/"O'chirish" tugmalarini yashiradi.
 */
type AdminResponse = Admin & { isSuperAdmin: boolean };

/** Javobga `isSuperAdmin` belgisini qo'shadi. Parol bu yerda umuman yo'q. */
private toResponse(admin: Admin): AdminResponse {
  return { ...admin, isSuperAdmin: isSuperAdmin(admin, this.configService) };
}
```

### ⭐ Bosh admin kim? — LOGIN bo'yicha, ID bo'yicha EMAS

Bu modulning eng muhim qarori. Bosh adminni **ID orqali** aniqlash juda oson
ko'rinadi (`admin.id === 1`), lekin bu **noto'g'ri** bo'lardi:

| Qayerda | Bosh adminning ID si |
|---|---|
| Lokal kompyuter | `1` |
| Serverda (`backend.magnateshop.uz`) | `2` |

ID baza qachon va qanday to'ldirilganiga bog'liq — u **tasodifiy son**. Login
esa `.env` da yozilgan va o'zgarmaydi. Shuning uchun taqqoslash login bo'yicha:

```ts
// src/admins/super-admin.helper.ts
/**
 * SUPER ADMIN kim?
 *
 * Bu hisobni hech kim qo'lda yaratmaydi — tizim o'zi yaratadi.
 * `SeedService` har safar ishga tushganda `.env` dagi ADMIN_LOGIN loginli
 * admin bor-yo'qligini tekshiradi va bo'lmasa o'zi qo'shib qo'yadi.
 * Shuning uchun super admin DOIM bitta bo'ladi va hech qachon yo'qolmaydi.
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
```

Manba `SeedService` bilan **bir xil** o'qiladi — ikkalasi ham `ADMIN_LOGIN` ni
oladi, ikkalasining ham zaxira qiymati `'admin'`:

```ts
// src/database/seed.service.ts — bosh adminni tizim o'zi yaratadi
private async createDefaultAdmin(): Promise<void> {
  const login = this.configService.get<string>('ADMIN_LOGIN', 'admin');
  const password = this.configService.get<string>('ADMIN_PASSWORD', 'admin123');
  const fullName = this.configService.get<string>('ADMIN_FULL_NAME', 'Bosh administrator');

  const exists = await this.adminRepository.findOne({ where: { login } });
  if (exists) return;   // ← bor bo'lsa tegmaydi

  await this.adminRepository.save(
    this.adminRepository.create({ login, password: await bcrypt.hash(password, 10), fullName }),
  );
}
```

> Shu ikki fayl birga o'qilsa hammasi tushunarli bo'ladi: **tizim qaysi hisobni
> o'zi yaratsa, o'shani o'zi himoya ham qiladi.**

### Qorovul — `SuperAdminGuard`

```ts
// src/admins/guards/super-admin.guard.ts
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
```

Ikki qorovul **ketma-ket** ishlaydi:

```
So'rov  →  JwtAuthGuard (global)  →  SuperAdminGuard (faqat ba'zi metodlarda)  →  Controller
           «Token bormi?»            «Sen bosh adminmisan?»
           yo'q → 401                yo'q → 403
```

### Endpointlar — kim nima qila oladi

| Metod | Manzil | Bosh admin | Oddiy admin |
|---|---|---|---|
| `GET` | `/api/admins` | ✅ | ✅ faqat ko'radi |
| `GET` | `/api/admins/:id` | ✅ | ✅ faqat ko'radi |
| `POST` | `/api/admins` | ✅ | ❌ 403 |
| `PUT` | `/api/admins/:id` | ⚠️ o'ziga 409 | ❌ 403 |
| `PATCH` | `/api/admins/:id` | ✅ (o'ziga faqat ism) | ❌ 403 |
| `DELETE` | `/api/admins/:id` | ✅ (o'ziga 409) | ❌ 403 |
| `PATCH` | `/api/admins/me/password` | ❌ 409 | ✅ o'z parolini |

Controller'da bu shunchaki **bitta qator** — `@UseGuards(SuperAdminGuard)`:

```ts
// src/admins/admins.controller.ts
@ApiTags('2. Admins — boshqaruvchilar')
@ApiBearerAuth()
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @UseGuards(SuperAdminGuard)                        // ← faqat bosh admin
  create(@Body() dto: CreateAdminDto) { ... }

  @Get()
  @ResponseMessage('Adminlar ro‘yxati')              // ← guard yo'q: hamma ko'radi
  findAll(@Query() query: QueryAdminDto) { ... }

  @Get(':id')
  @ResponseMessage('Admin ma’lumotlari')
  findOne(@Param('id', ParseIdPipe) id: number) { ... }

  // ⚠️ DIQQAT: 'me/password' `:id` dan OLDIN turishi shart.
  // Aks holda Nest 'me' ni ID deb o'qib, ParseIdPipe xato beradi.
  @Patch('me/password')
  changeOwnPassword(@CurrentAdmin() admin: Admin, @Body() dto: ChangeOwnPasswordDto) { ... }

  @Put(':id')
  @UseGuards(SuperAdminGuard)
  replace(@Param('id', ParseIdPipe) id: number, @Body() dto: CreateAdminDto) { ... }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  update(@Param('id', ParseIdPipe) id: number, @Body() dto: UpdateAdminDto) { ... }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  remove(@Param('id', ParseIdPipe) id: number) { ... }
}
```

> ⭐ **Marshrut tartibi muhim.** `@Patch('me/password')` `@Patch(':id')` dan
> yuqorida turibdi. NestJS marshrutlarni **yozilish tartibida** solishtiradi —
> pastda tursa, `me` so'zi `:id` ga tushib qolardi.

### DTO qoidalari — parol qiyin bo'lishi shart emas

```ts
// src/admins/dto/create-admin.dto.ts
export class CreateAdminDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @Length(3, 50, { message: 'Login 3 tadan 50 tagacha belgidan iborat bo‘lishi kerak.' })
  @Matches(/^[a-z0-9._-]+$/, {
    message:
      'Loginda faqat lotin harflari, raqamlar va . _ - belgilari bo‘lishi mumkin. ' +
      'Probel va boshqa belgilar ishlatilmaydi.',
  })
  login: string;

  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak.' })
  @MaxLength(72, { message: 'Parol 72 ta belgidan oshmasligi kerak.' })
  password: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 100, { message: 'Ism 2 tadan 100 tagacha belgidan iborat bo‘lishi kerak.' })
  fullName: string;
}
```

To'rtta ataylab qilingan tanlov:

| Qoida | Nega shunday |
|---|---|
| Login `toLowerCase()` ga o'tkaziladi | «Sardor» va «sardor» bir xil hisoblansin — bola katta harf bilan yozib, keyin kira olmay qolmasin |
| Loginda probel yo'q | Login bilan tizimga kiriladi; probel ko'rinmaydi va xatoni topib bo'lmaydi |
| Parol — **faqat** 6 belgi, katta harf/maxsus belgi **shart emas** | Bu o'quv loyihasi. Murakkab parol talabi bolani birinchi qadamdayoq to'xtatib qo'yadi |
| `72` belgi cheklovi | `bcrypt` 72 baytdan keyingisini **jimgina tashlab yuboradi** — foydalanuvchi buni bilmay qoladi |

PATCH uchun alohida DTO yozilmaydi — `PartialType` hammasini ixtiyoriy qiladi
(1.4-bo'limdagi kategoriyalar bilan bir xil naqsh):

```ts
// src/admins/dto/update-admin.dto.ts
/**
 * PATCH uchun — barcha maydonlar ixtiyoriy.
 * Faqat ismni o'zgartirish:  { "fullName": "Sardor Aliyev" }
 * Faqat parolni almashtirish: { "password": "yangi123" }
 */
export class UpdateAdminDto extends PartialType(CreateAdminDto) {}
```

### `POST /api/admins` — yangi admin qo'shish

```ts
// src/admins/admins.service.ts
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
```

Login bandligi katta-kichik harf farqisiz tekshiriladi — kategoriyalardagi
`ensureNameIsFree` bilan **bir xil naqsh**:

```ts
/** Login band emasligini tekshiradi (katta-kichik harf farqisiz). */
private async ensureLoginIsFree(login: string, exceptId?: number): Promise<void> {
  const qb = this.adminRepository
    .createQueryBuilder('admin')
    .where('LOWER(admin.login) = LOWER(:login)', { login });

  if (exceptId) qb.andWhere('admin.id != :exceptId', { exceptId });   // ← o'zini hisobga olmaydi

  const existing = await qb.getOne();

  if (existing) {
    throw new ConflictException(
      `«${existing.login}» logini allaqachon band (ID = ${existing.id}). Boshqa login tanlang.`,
    );
  }
}
```

**Frontend — shu endpointni chaqirish:**

```ts
// admin/src/api/endpoints.ts
create: (body: AdminPayload) => unwrapFull<AdminRow>(api.post('/admins', body)),
```

```tsx
// admin/src/pages/AdminsPage.tsx
const createMutation = useMutation({
  mutationFn: () =>
    adminsApi.create({ login: 'sardor', fullName: 'Sardor Aliyev', password: 'sardor123' }),
  onSuccess: (res) => {
    toast(res.message);                                       // ← backend matni o'zgartirilmaydi
    void qc.invalidateQueries({ queryKey: ['admins'] });      // ← ro'yxat qayta o'qiladi
  },
  onError,
});
```

> `unwrapFull` — `{ data, message }` qaytaradi (2.7-bo'lim). Shuning uchun
> toast'da **backend yozgan** «Sardor Aliyev admin sifatida qo'shildi…» chiqadi.
> Frontendda o'sha matnni **qaytadan yozmaymiz**.

### `GET /api/admins` — ro'yxat

```ts
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
    items.map((admin) => this.toResponse(admin)),   // ← har biriga isSuperAdmin qo'shiladi
    total,
    page,
    limit,
  );
}

async findOne(id: number): Promise<AdminResponse> {
  return this.toResponse(await this.findEntityOrFail(id));
}

/** Adminni topadi, topilmasa aniq xabar bilan 404 qaytaradi. */
private async findEntityOrFail(id: number): Promise<Admin> {
  const admin = await this.adminRepository.findOne({ where: { id } });

  if (!admin) throw new NotFoundException(`ID = ${id} bo‘lgan admin topilmadi.`);

  return admin;
}
```

⭐ **Parol bu yerda umuman yo'q** — uni «o'chirish» kerak emas, chunki
entity'da `select: false` (1.3-bo'lim). TypeORM uni bazadan **o'qimaydi** ham.

Javob shakli:

```json
{
  "success": true,
  "message": "Adminlar ro‘yxati",
  "data": {
    "items": [
      { "id": 2, "login": "admin",  "fullName": "Bosh administrator", "isSuperAdmin": true  },
      { "id": 5, "login": "sardor", "fullName": "Sardor Aliyev",      "isSuperAdmin": false }
    ],
    "meta": { "total": 2, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

**Frontend — shu endpointni chaqirish:**

```ts
// admin/src/api/endpoints.ts
export interface AdminQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'id' | 'login' | 'fullName' | 'createdAt';
  order?: 'ASC' | 'DESC';
}

list: (q: AdminQuery = {}) => unwrap<Paginated<AdminRow>>(api.get('/admins', { params: q })),
one:  (id: number)         => unwrap<AdminRow>(api.get(`/admins/${id}`)),
```

```tsx
// Adminlar soni kam — hammasini bir marta olamiz, qidiruv mijoz tomonida
const query = useQuery({
  queryKey: ['admins'],
  queryFn: () => adminsApi.list({ limit: 100, sortBy: 'id', order: 'ASC' }),
});
```

> Kategoriyalar bilan bir xil tanlov (2.11-bo'lim): ro'yxat kichik bo'lsa
> **mijoz tomonida** sahifalash oson va tez. Avtomobillarda esa aksincha —
> ro'yxat cheksiz o'sadi, shuning uchun `page`/`limit` serverga yuboriladi.

### ⭐⭐ Super admin himoyasi — nega ism o'zgaradi-yu, login va parol o'zgarmaydi

Bu modulning **yuragi**. Uchta alohida qoida bor va uchalasining **sababi
boshqa-boshqa**:

| Amal | Natija | SABAB |
|---|---|---|
| `fullName` ni o'zgartirish | ✅ **200** | Ism — shunchaki ko'rinadigan yozuv. Tizim ismga qarab hech narsa qilmaydi |
| `login` ni o'zgartirish | ❌ **409** | Tizim bosh adminni **login bo'yicha** taniydi. Login almashsa — u oddiy adminga aylanadi va `SeedService` keyingi ishga tushishda **yana bitta** bosh admin yaratib qo'yadi |
| `password` ni o'zgartirish | ❌ **409** | Hamma o'quvchi **shu bitta hisob** orqali kiradi. Parol almashsa — qolganlar tizimdan chiqib qoladi |
| `PUT` (to'liq almashtirish) | ❌ **409** | PUT **har doim** login va parolni ham olib keladi — ikkinchi va uchinchi qoidaga urilib ketadi |
| `DELETE` | ❌ **409** | O'chirilsa **hech kim** tizimga kira olmay qoladi; tiklash uchun serverga kirish kerak |

Kodda bu ikkita kichik metod:

```ts
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
  if (!isSuperAdmin(admin, this.configService)) return;   // oddiy adminga bu qoida tegishli emas

  // Bir xil login qayta yuborilsa — bu o'zgarish emas, ruxsat beramiz
  const loginChanged =
    dto.login !== undefined && dto.login.toLowerCase() !== admin.login.toLowerCase();
  const passwordChanged = dto.password !== undefined;

  if (!loginChanged && !passwordChanged) return;          // ← faqat fullName kelgan: o'tadi

  const nima =
    loginChanged && passwordChanged ? 'login va parolni' : loginChanged ? 'loginni' : 'parolni';

  throw new ConflictException(
    `«${admin.login}» — bosh admin (super admin). Unda faqat ISMNI o‘zgartira olasiz, ${nima} emas. ` +
      `Login almashsa tizim uni bosh admin sifatida tanimay qoladi; parol almashsa esa hamma tizimdan chiqib ketadi. ` +
      `Ismini o‘zgartirish: PATCH /api/admins/${admin.id}  { "fullName": "Yangi ism" }. ` +
      `Login va parolni faqat server egasi .env fayldagi ADMIN_LOGIN va ADMIN_PASSWORD orqali o‘zgartiradi.`,
  );
}

/**
 * Bosh adminni (super admin) hech kim o'chira olmaydi.
 *
 * Sabab: bu hisobni tizimning o'zi yaratadi va hamma shu hisob orqali kiradi.
 * O'chirilsa — hech kim tizimga kira olmay qoladi va tiklash uchun
 * serverga kirish kerak bo'ladi.
 */
private ensureSuperAdminIsNotDeleted(admin: Admin): void {
  if (!isSuperAdmin(admin, this.configService)) return;

  throw new ConflictException(
    `«${admin.login}» — bosh admin (super admin), uni o‘chira olmaysiz. ` +
      `Bu hisobni tizim o‘zi yaratadi va o‘zi himoya qiladi: o‘chirilsa hech kim tizimga kira olmay qoladi. ` +
      `Uning o‘rniga ismini o‘zgartirishingiz mumkin: PATCH /api/admins/${admin.id}  { "fullName": "Yangi ism" }`,
  );
}
```

Ikkita nozik joyni alohida ta'kidlaymiz:

**1) «Bir xil login qayta yuborilsa — bu o'zgarish emas».** Frontend formani
to'ldirib ochadi va hamma maydonni qaytib yuborishi mumkin. Agar shunchaki
`dto.login !== undefined` deb tekshirsak, hech narsa o'zgarmagan bo'lsa ham xato
chiqarardik. Shuning uchun **eski qiymat bilan solishtiramiz**.

**2) `password` da esa solishtirish yo'q** — `dto.password !== undefined` yetarli.
Sababi: parol bazada **shifrlangan**, uni «eskisi bilan bir xilmi?» deb tekshirish
uchun `bcrypt.compare` chaqirish kerak bo'lardi, bu esa bu yerda ortiqcha —
bosh adminning parolini hech qanday ko'rinishda yuborish mumkin emas.

> **Xabar nima qilish kerakligini ham aytadi.** Bu butun loyihaning tamoyili
> (1.4-bo'limdagi kategoriya o'chirish xabari bilan solishtiring): «bo'lmaydi»
> deb qo'yib yuborilmaydi, «buning o'rniga mana bunday qiling» deyiladi.

### `PUT` va `PATCH` — ikkalasi ham himoyani birinchi bo'lib chaqiradi

```ts
/** PUT — uchala maydonni ham qaytadan yozadi (login, parol, ism majburiy). */
async replace(id: number, dto: CreateAdminDto) {
  const admin = await this.findEntityOrFail(id);
  this.ensureSuperAdminChangeIsAllowed(admin, dto);   // ← PUT'da login+parol DOIM bor -> bosh adminga 409
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
  const admin = await this.findEntityOrFail(id);
  this.ensureSuperAdminChangeIsAllowed(admin, dto);   // ← faqat fullName kelsa o'tkazib yuboradi

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

  const changed = Object.keys(dto);
  await this.adminRepository.save(admin);

  return withMessage(
    `«${admin.fullName}» admini yangilandi. O‘zgartirilgan maydonlar: ${changed.join(', ')}.`,
    await this.findOne(id),
  );
}
```

⭐ **Eng nozik joy — `select: false` va `save()`.** `findEntityOrFail` parolni
o'qimaydi, ya'ni `admin.password` **`undefined`** bo'lib turadi. TypeORM esa
`save()` da qiymati `undefined` bo'lgan ustunni `UPDATE` ga umuman qo'shmaydi.
Natijada faqat ismni o'zgartirsak — parol **buzilmaydi**. Agar entity'da
`select: false` bo'lmaganida, bu yerda parol ustidan `undefined` yozilib,
admin tizimga kira olmay qolardi.

**Frontend — PATCH ni chaqirish:**

```ts
// admin/src/api/endpoints.ts
update:  (id: number, body: Partial<AdminPayload>) =>
  unwrapFull<AdminRow>(api.patch(`/admins/${id}`, body)),

replace: (id: number, body: AdminPayload) =>
  unwrapFull<AdminRow>(api.put(`/admins/${id}`, body)),
```

```tsx
// admin/src/pages/AdminsPage.tsx — bitta mutatsiya ikkala holatga ham xizmat qiladi
const saveMutation = useMutation({
  mutationFn: (v: FormValue) =>
    v.id
      ? adminsApi.update(v.id, {
          // bosh adminda login umuman yuborilmaydi — backend uni rad etadi
          ...(v.login ? { login: v.login } : {}),
          fullName: v.fullName,
          // parol bo'sh qoldirilsa — eskisi o'zgarmaydi
          ...(v.password ? { password: v.password } : {}),
        })
      : adminsApi.create({
          login: v.login ?? '',
          fullName: v.fullName,
          password: v.password ?? '',
        }),
  onSuccess: (res) => {
    toast(res.message);
    setEditing(null);
    invalidate();
  },
  onError,
});
```

> ⭐ **Frontend backendni takrorlamaydi, unga moslashadi.** Bosh adminni
> tahrirlaganda `login` va `password` **umuman yuborilmaydi** (`undefined`),
> shuning uchun `ensureSuperAdminChangeIsAllowed` ularni o'zgarish deb
> hisoblamaydi va `{ fullName }` bemalol o'tadi.
>
> Panel `replace` (PUT) ni **hech qayerda ishlatmaydi** — u faqat Swagger'da
> o'rgatish uchun turibdi, PUT va PATCH farqini ko'rsatsin deb.

### `PATCH /api/admins/me/password` — har kim faqat O'ZINING paroli

```ts
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
```

Uchta tekshiruv **ketma-ket** turadi va har biri boshqa savolga javob beradi:

| # | Tekshiruv | Nega kerak |
|---|---|---|
| 1 | Bosh adminmi? → **409** | Hamma shu hisob orqali kiradi (4-bo'limdagi 16-muammo takrorlanmasin) |
| 2 | `currentPassword` to'g'rimi? → **400** | Kompyuter ochiq qolsa, begona odam parolni almashtirib qo'ymasin |
| 3 | Yangi parol eskisi bilan bir xilmi? → **409** | «Almashtirdim» deb o'ylab, aslida hech narsa qilmagan bo'lib qolmasin |

⭐ Bu DTO'da **`login` maydoni yo'q** — ataylab:

```ts
// src/admins/dto/change-own-password.dto.ts
/**
 * Admin O'ZINING parolini almashtirishi uchun: PATCH /api/admins/me/password
 *
 * Diqqat: bu yerda `login` yo'q — loginni hech kim o'zi o'zgartira olmaydi.
 * Loginni faqat bosh admin (super admin) o'zgartiradi.
 */
export class ChangeOwnPasswordDto {
  currentPassword: string;
  newPassword: string;   // @MinLength(6)
}
```

**Frontend — shu endpointni chaqirish:**

```ts
// admin/src/api/endpoints.ts
/** O'z parolini almashtirish. Login bu yerda o'zgarmaydi. */
changeOwnPassword: (currentPassword: string, newPassword: string) =>
  unwrapFull<{ id: number; login: string }>(
    api.patch('/admins/me/password', { currentPassword, newPassword }),
  ),
```

```tsx
// admin/src/pages/AdminsPage.tsx
const passwordMutation = useMutation({
  mutationFn: (v: { currentPassword: string; newPassword: string }) =>
    adminsApi.changeOwnPassword(v.currentPassword, v.newPassword),
  onSuccess: (res) => {
    toast(res.message);
    setChangingPassword(false);
  },
  onError,
});
```

Tugma esa **faqat oddiy adminga** ko'rsatiladi — bosh admin bosib, keyin 409
olib hayron bo'lmasin:

```tsx
{me && !me.isSuperAdmin && (
  <Button startIcon={<KeyRoundedIcon />} onClick={() => setChangingPassword(true)}>
    {t('admins.changePassword')}
  </Button>
)}
```

### `DELETE /api/admins/:id`

```ts
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
```

> Kategoriyalardan farqli o'laroq bu yerda «bog'liq yozuvlar» tekshiruvi yo'q:
> loyihada «kim qaysi avtomobilni qo'shdi» yozilmaydi, shuning uchun admin
> o'chirilsa uning ishi joyida qolaveradi.

**Frontend — shu endpointni chaqirish:**

```ts
// admin/src/api/endpoints.ts
remove: (id: number) => unwrapFull<{ id: number; login: string }>(api.delete(`/admins/${id}`)),
```

```tsx
// admin/src/pages/AdminsPage.tsx
const deleteMutation = useMutation({
  mutationFn: (id: number) => adminsApi.remove(id),
  onSuccess: (res) => {
    toast(res.message);
    setDeleting(null);
    invalidate();
  },
  onError: (e) => {
    onError(e);
    setDeleting(null);   // ← xato bo'lsa ham modal yopiladi, xabar toast'da qoladi
  },
});
```

### Qo'lda sinash — Swagger'da qadamma-qadam

```
1) POST /api/auth/login          { "login": "admin", "password": "admin123" }
   → accessToken ni "Authorize" tugmasiga qo'yasan

2) GET  /api/admins              → ro'yxatda bitta yozuv, isSuperAdmin: true
3) POST /api/admins              { "login": "sardor", "password": "sardor123",
                                   "fullName": "Sardor Aliyev" }          → 201

4) PATCH /api/admins/2           { "fullName": "Bosh admin" }             → 200  ✅ ism o'zgardi
5) PATCH /api/admins/2           { "login": "boshqa" }                    → 409  ❌
6) PATCH /api/admins/2           { "password": "yangi123" }               → 409  ❌
7) PUT   /api/admins/2           { hamma maydon }                         → 409  ❌
8) DELETE /api/admins/2                                                   → 409  ❌

9) Endi «sardor» bo'lib kir:
   POST /api/auth/login          { "login": "sardor", "password": "sardor123" }
10) GET   /api/admins                                                     → 200  ✅ ko'radi
11) POST  /api/admins            { ... }                                  → 403  ❌
12) DELETE /api/admins/5         (o'zini ham!)                            → 403  ❌
13) PATCH /api/admins/me/password { "currentPassword": "sardor123",
                                    "newPassword": "yangi123" }           → 200  ✅
```

> `2` — serverdagi bosh adminning ID si. Lokalda u `1` bo'ladi. **Sinashdan
> oldin `GET /api/admins` da `isSuperAdmin: true` bo'lgan yozuvning ID sini
> ko'rib ol** — kodda ham ID emas, login solishtirilgani shundan.

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

## 2.14 Adminlar sahifasi

Backendning 1.10-bo'limiga **mos** sahifa. Bitta fayl:
`admin/src/pages/AdminsPage.tsx`. Chap menyuda **«Tizim → Adminlar»**.

### Menyuga qo'shish va marshrut

```tsx
// admin/src/components/layout/AppSidebar.tsx
{
  titleKey: 'nav.section.system',
  items: [
    { to: '/admins',   labelKey: 'nav.admins',   icon: <AdminPanelSettingsRoundedIcon /> },
    { to: '/settings', labelKey: 'nav.settings', icon: <SettingsRoundedIcon /> },
  ],
},
```

```tsx
// admin/src/App.tsx — sahifa lazy yuklanadi (boshlang'ich bundle kichik qolsin)
const AdminsPage = lazy(() => import('./pages/AdminsPage'));
...
<Route path="/admins" element={<AdminsPage />} />
```

### Turlar — backend javobiga aynan mos

```ts
// admin/src/api/types.ts
export interface Admin {
  id: number;
  login: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
  // parol yo'q — backend uni hech qachon yubormaydi
}

/**
 * Adminlar ro'yxatidagi yozuv.
 * Backend har bir adminga `isSuperAdmin` belgisini qo'shib beradi —
 * bosh adminni tahrirlash/o'chirish tugmalari shu belgiga qarab yashiriladi.
 */
export interface AdminRow extends Admin {
  isSuperAdmin: boolean;
}

export interface AdminPayload {
  login: string;
  password: string;
  fullName: string;
}
```

### API qatlami — bitta obyektda hamma endpoint

```ts
// admin/src/api/endpoints.ts
/**
 * Adminlarni boshqarish.
 *
 * Ro'yxatni HAR QANDAY admin ko'ra oladi, lekin qo'shish/tahrirlash/o'chirishni
 * faqat bosh admin (super admin) qila oladi — boshqasi urinsa backend 403 beradi.
 * Har kim faqat O'Z parolini almashtiradi: `changeOwnPassword`.
 */
export const adminsApi = {
  list:    (q: AdminQuery = {}) => unwrap<Paginated<AdminRow>>(api.get('/admins', { params: q })),
  one:     (id: number)         => unwrap<AdminRow>(api.get(`/admins/${id}`)),
  create:  (body: AdminPayload) => unwrapFull<AdminRow>(api.post('/admins', body)),
  update:  (id: number, body: Partial<AdminPayload>) =>
             unwrapFull<AdminRow>(api.patch(`/admins/${id}`, body)),
  replace: (id: number, body: AdminPayload) =>
             unwrapFull<AdminRow>(api.put(`/admins/${id}`, body)),
  remove:  (id: number) =>
             unwrapFull<{ id: number; login: string }>(api.delete(`/admins/${id}`)),

  /** O'z parolini almashtirish. Login bu yerda o'zgarmaydi. */
  changeOwnPassword: (currentPassword: string, newPassword: string) =>
    unwrapFull<{ id: number; login: string }>(
      api.patch('/admins/me/password', { currentPassword, newPassword }),
    ),
};
```

> `unwrap` — faqat `data`, `unwrapFull` — `{ data, message }` (2.7-bo'lim).
> Ro'yxatni o'qishda xabar kerak emas, mutatsiyalarda esa **kerak** — backend
> yozgan matn to'g'ridan-to'g'ri toast'ga chiqadi.

### ⭐ «Men bosh adminmanmi?» — javobni ro'yxatdan topamiz

`/auth/me` javobida `isSuperAdmin` **yo'q** (`Admin` entity o'zgartirilmagan).
Lekin adminlar ro'yxatida bor — o'z yozuvimizni ID bo'yicha topib olamiz:

```tsx
// admin/src/pages/AdminsPage.tsx
const { admin } = useAuth();

const items = useMemo(() => query.data?.items ?? [], [query.data]);

/**
 * Men bosh adminmanmi?
 * Backend `/auth/me` da bu belgi yo'q — shuning uchun ro'yxatdan
 * o'z yozuvimni topib olamiz. Bosh admin bo'lmasam qo'shish/tahrirlash/
 * o'chirish tugmalari umuman ko'rinmaydi (backend ham 403 beradi).
 */
const me = useMemo(() => items.find((a) => a.id === admin?.id) ?? null, [items, admin]);
const iAmSuper = me?.isSuperAdmin ?? false;
```

⭐ **Frontend himoya EMAS.** Tugmani yashirish — bu shunchaki **odob**:
bosilmaydigan tugmani ko'rsatib, keyin xato chiqarish yomon. Haqiqiy himoya
serverda — `SuperAdminGuard`. Brauzerdagi kodni har kim o'zgartira oladi,
serverdagini esa yo'q.

### Ruxsat yo'qligini tushuntirish — jimgina yashirmaymiz

Oddiy admin sahifaga kirsa, tugmalar yo'qligining **sababini** ko'radi:

```tsx
{/* Bosh admin bo'lmaganlarga nega tugmalar yo'qligini tushuntiramiz */}
{!query.isPending && !iAmSuper && (
  <Paper variant="glassSoft" sx={{ px: 2, py: 1.5 }}>
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <InfoOutlinedIcon fontSize="small" sx={{ color: 'var(--info)', mt: '2px' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }}>
        {t('admins.readOnlyHint')}
      </Typography>
    </Stack>
  </Paper>
)}
```

```jsonc
// admin/src/locales/uz.json
"readOnlyHint": "Adminlarni faqat bosh admin qo‘sha, tahrirlay va o‘chira oladi. Siz ro‘yxatni ko‘rishingiz mumkin."
```

### Jadval — qulf ikonkasi va tugmalar

Boshqa sahifalardagi **aynan o'sha uchlik**: `CollapsibleSection` → `TableToolbar`
→ `PagedList` (2.9 va 2.11-bo'limlar). Yangi hech narsa ixtiro qilinmagan.

```tsx
{pageRows.map((a) => {
  const isMe = a.id === admin?.id;
  // Bosh adminda faqat ISM o'zgaradi (login/parol emas),
  // o'chirish esa hech qachon mumkin emas — backend ham 409 qaytaradi
  const canEdit = iAmSuper;
  const canDelete = iAmSuper && !a.isSuperAdmin;

  return (
    <TableRow key={a.id} hover sx={{ height: 56 }}>
      {/* Ism + login bitta katakda: ism qalin, login pastida kulrang */}
      <TableCell sx={{ maxWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap title={a.fullName}>
            {a.fullName}
          </Typography>
          {isMe && <MeBadge />}
        </Stack>
        <Typography variant="caption" className="tabular" noWrap display="block">
          {a.login}
        </Typography>
      </TableCell>

      <TableCell align="center">
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <RoleBadge isSuperAdmin={a.isSuperAdmin} />
          {a.isSuperAdmin && (
            <Tooltip title={t('admins.superAdminHint')}>
              <LockRoundedIcon fontSize="small" sx={{ color: 'var(--muted-foreground)' }} />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      ...
      <TableCell align="right">
        {canEdit && (
          <Tooltip title={a.isSuperAdmin ? t('admins.editNameOnly') : t('common.edit')}>
            <IconButton size="small" onClick={() => setEditing(a)}>
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" onClick={() => setDeleting(a)}
              sx={{ color: 'var(--destructive)' }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
})}
```

Bosh adminning qatorida:

| Element | Holati | Sababi |
|---|---|---|
| 🔒 Qulf ikonkasi | **bor** | «Bu yozuv himoyalangan» — tooltip'da to'liq tushuntirish |
| ✏️ Tahrirlash | **bor** | Ismini o'zgartirish mumkin (`canEdit = iAmSuper`) |
| 🗑 O'chirish | **yo'q** | `canDelete = iAmSuper && !a.isSuperAdmin` — hech qachon `true` bo'lmaydi |

> Tooltip matni ham «yo'q» demaydi, **nima mumkinligini** aytadi:
> «Bosh adminni tizim o'zi yaratadi. Uni o'chirib bo'lmaydi va parolini
> almashtirib bo'lmaydi — faqat ismini o'zgartira olasiz.»

### Belgilar — rang **yagona** signal emas

```tsx
/** Admin turi: bosh admin yoki oddiy admin. Rang yagona signal emas — matn ham bor. */
function RoleBadge({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { t } = useTranslation();
  const color = isSuperAdmin ? 'var(--primary)' : 'var(--muted-foreground)';

  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.75,
      px: 1.25, py: 0.5, borderRadius: 'var(--radius-pill)',
      fontSize: '.75rem', fontWeight: 600, whiteSpace: 'nowrap', color,
      background: `color-mix(in oklab, ${color} 15%, transparent)`,
      border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
    }}>
      <Box component="span" aria-hidden
        sx={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {t(isSuperAdmin ? 'admins.superAdmin' : 'admins.regularAdmin')}
    </Box>
  );
}
```

Ikki qoida bu yerda ham buzilmadi (2.2-bo'lim):

- **Hech qanday `#hex` yo'q** — faqat `var(--primary)`, `var(--muted-foreground)`.
  `color-mix` esa shaffofligini to'rt temada ham to'g'ri hisoblaydi.
- **Rang yolg'iz ma'no tashimaydi** — yonida «Bosh admin» / «Admin» matni bor.
  Rangni ajratmaydigan odam ham tushunadi.

`MeBadge` — «Siz» belgisi, `var(--info)` da. Ro'yxatda o'z yozuvini topish oson
bo'lsin uchun.

### Forma dialogi — bitta forma, uch xil holat

```tsx
interface FormValue {
  id?: number;
  /** Bosh adminni tahrirlaganda yuborilmaydi — uning logini o'zgarmaydi. */
  login?: string;
  fullName: string;
  password?: string;
}

const isNew = value === 'new';
const row = isNew ? null : value;
// Bosh adminda faqat ism o'zgaradi — login va parol maydonlari yopiladi
const isSuper = row?.isSuperAdmin ?? false;
```

Tekshiruv qoidalari **backend bilan aynan bir xil** — bola formada ham,
Swagger'da ham bir xil javob olsin:

```tsx
/** Parol qoidasi backend bilan bir xil: kamida 6 ta belgi. */
const MIN_PASSWORD = 6;

/** Login qoidasi backend bilan bir xil: kichik lotin harflari, raqam va . _ - */
const LOGIN_PATTERN = /^[a-z0-9._-]+$/;

const loginValue = login.trim().toLowerCase();
const loginInvalid = !isSuper && (loginValue.length < 3 || !LOGIN_PATTERN.test(loginValue));
const nameInvalid = fullName.trim().length < 2;

// Tahrirlashda parol ixtiyoriy: bo'sh qolsa eski parol saqlanadi
const passwordInvalid =
  !isSuper &&
  (isNew ? password.length < MIN_PASSWORD : password.length > 0 && password.length < MIN_PASSWORD);
```

Bosh adminni tahrirlaganda ikki maydon **`disabled`** bo'ladi va har biri
**o'z sababini** yozadi:

```tsx
<TextField
  label={t('admins.login')}
  value={login}
  disabled={isSuper}
  helperText={
    isSuper
      ? t('admins.superAdminLoginLocked')     // "…aks holda tizim uni bosh admin
      : touched && loginInvalid               //   sifatida tanimay qoladi."
        ? t('admins.loginHint')
        : ' '
  }
/>

<TextField
  label={t('admins.password')}
  type="password"
  disabled={isSuper}
  helperText={
    isSuper
      ? t('admins.superAdminPasswordLocked')  // "…faqat server egasi .env fayldagi
      : isNew || (touched && passwordInvalid) //   ADMIN_PASSWORD orqali almashtiradi."
        ? t('admins.passwordHint')
        : t('admins.passwordKeepHint')        // "Bo'sh qoldirsangiz — eski parol o'zgarmaydi."
  }
/>
```

Saqlashda bosh adminga login va parol **yuborilmaydi ham**:

```tsx
onClick={() =>
  onSubmit({
    id: row?.id,
    // bosh adminda login va parol umuman yuborilmaydi
    login: isSuper ? undefined : loginValue,
    fullName: fullName.trim(),
    password: isSuper ? undefined : password || undefined,
  })
}
```

> ⭐ **Uch qatlamli himoya, uchtasi ham kerak:**
> 1. maydon `disabled` — bola noto'g'ri narsa yozolmaydi;
> 2. so'rovda maydon **yo'q** — backend uni «o'zgarish» deb hisoblamaydi;
> 3. baribir yuborilsa — `ensureSuperAdminChangeIsAllowed` **409** qaytaradi.
>
> Birinchi ikkitasi — qulaylik uchun. Uchinchisi — **haqiqiy** himoya.

### `useState` bilan dialogni tiklash — `useEffect`siz

Dialog har ochilganda maydonlar to'ldirilishi/tozalanishi kerak. Buni
`useEffect` bilan qilish mumkin, lekin React o'zi tavsiya qiladigan
**«render paytida holatni tuzatish»** usuli soddaroq va bitta ortiqcha
render bermaydi:

```tsx
// Dialog ochilganda maydonlarni to'ldiramiz
const key = isNew ? 'new' : (row?.id ?? 'none');
const [lastKey, setLastKey] = useState<string | number>('none');

if (value && key !== lastKey) {
  setLastKey(key);
  setLogin(row?.login ?? '');
  setFullName(row?.fullName ?? '');
  setPassword('');
  setTouched(false);
}
```

`ChangeOwnPasswordDialog` da ham xuddi shu naqsh (`wasOpen` bilan) — dialog
har ochilganda parol maydonlari tozalanadi, eski parol ekranda qolib ketmaydi.

### Xatolarni ko'rsatish — backend matni o'zgartirilmaydi

```tsx
const onError = (e: unknown) => {
  const msg = errorMessage(e, t('error.unknown'));
  toast(msg === 'network' ? t('error.network') : msg, 'error');
};
```

Shu bitta funksiya tufayli oddiy admin `POST /admins` ga urinsa — ekranda
**backend yozgan** to'liq tushuntirish chiqadi:

> «Admin hisoblarini faqat bosh admin (super admin) qo'sha, tahrirlay va
> o'chira oladi. Siz ularni faqat ko'rishingiz mumkin: GET /api/admins.
> Avtomobil va kategoriyalar bilan esa odatdagidek ishlayverasiz.»

⭐ Matn **ikki joyda yozilmaydi**. Backend o'zgarsa — panel o'zi yangilanadi.

### Tarjima kalitlari

Barcha matn `uz.json` va `ru.json` da — komponentda bitta ham qattiq yozilgan
matn yo'q (2.6-bo'lim qoidasi):

```jsonc
// admin/src/locales/uz.json
"admins": {
  "kicker": "Tizim",
  "title": "Adminlar",
  "subtitle": "Panelga kira oladigan boshqaruvchilar",
  "superAdmin": "Bosh admin",
  "regularAdmin": "Admin",
  "you": "Siz",
  "loginHint": "Kichik lotin harflari, raqamlar va . _ - belgilari. Probelsiz.",
  "passwordHint": "Kamida 6 ta belgi. Katta harf yoki maxsus belgi shart emas.",
  "passwordKeepHint": "Bo‘sh qoldirsangiz — eski parol o‘zgarmaydi.",
  "superAdminHint": "Bosh adminni tizim o‘zi yaratadi. Uni o‘chirib bo‘lmaydi va parolini almashtirib bo‘lmaydi — faqat ismini o‘zgartira olasiz.",
  "editNameOnly": "Faqat ismini o‘zgartirish",
  "superAdminEditHint": "Bosh adminda faqat ISM o‘zgaradi. Login va parolni server egasi .env fayl orqali belgilaydi.",
  "superAdminLoginLocked": "Bosh adminning logini o‘zgarmaydi — aks holda tizim uni bosh admin sifatida tanimay qoladi.",
  "superAdminPasswordLocked": "Parolni faqat server egasi .env fayldagi ADMIN_PASSWORD orqali almashtiradi.",
  "readOnlyHint": "Adminlarni faqat bosh admin qo‘sha, tahrirlay va o‘chira oladi. Siz ro‘yxatni ko‘rishingiz mumkin.",
  "changePasswordHint": "Faqat parol o‘zgaradi. Loginni bosh admin o‘zgartiradi."
  // ...
}
```

### O'zingiz yozib ko'ring

Shu bo'limni o'qib bo'lgach, quyidagilarni **kodga qaramay** yozib ko'ring:

1. `GET /api/admins/:id` ni chaqiradigan `useQuery` — bitta adminni ko'rish
   modali uchun (`adminsApi.one`, `queryKey: ['admins', id]`).
2. Ro'yxatga «Login bo'yicha saralash» tugmasi — `sortBy: 'login'` ni
   `adminsApi.list` ga uzatib.
3. Yangi admin qo'shilganda unga ko'rsatiladigan «parolni eslab qoling»
   ogohlantirishi — chunki parol boshqa **hech qachon** ko'rinmaydi.
4. `adminsApi.replace` (PUT) ni ishlatadigan forma — va bosh adminda u nega
   **409** berishini o'z so'zingiz bilan tushuntiring.

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
| Backend | 31 endpoint, 6 modul, 100 ta avtomobil, 8 kategoriya |
| Chat | WebSocket `/chat`, 8 hodisa, mijoz sahifasi `public/chat.html` |
| Admin panel | 46 fayl, 4 tema, uz/ru, 15 shrift, 5 o'lcham |
| Repo | 222 fayl · https://github.com/F2RUZ/-e-shop-backend |
| Jonli | https://admin.magnateshop.uz · https://backend.magnateshop.uz/docs |
| Kirish | `admin` / `admin123` |
