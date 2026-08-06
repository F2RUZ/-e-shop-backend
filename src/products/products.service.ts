import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { withMessage } from '../common/helpers/with-message.helper';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
  ) {}

  // ─────────────────────────────── CREATE ───────────────────────────────

  async create(dto: CreateProductDto): Promise<Product> {
    // Yangi avtomobil faol holatda yaratiladi -> kategoriyasi ham faol bo'lishi shart
    const category = await this.findCategoryOrFail(dto.categoryId);
    this.ensureCategoryIsActive(category, 'Bu kategoriyaga avtomobil qo‘sha olmaysiz');

    const product = this.productRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      stock: dto.stock ?? 0,
      image: dto.image ?? null,
      categoryId: dto.categoryId,
    });

    const saved = await this.productRepository.save(product);

    return this.findOne(saved.id);
  }

  // ──────────────────────────────── READ ────────────────────────────────

  async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
    const { page, limit, search, categoryId, isActive, minPrice, maxPrice, inStock, sortBy, order } =
      query;

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestException('minPrice maxPrice dan katta bo‘lishi mumkin emas.');
    }

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (search) {
      qb.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (categoryId !== undefined) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (isActive !== undefined) {
      qb.andWhere('product.isActive = :isActive', { isActive });
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (inStock !== undefined) {
      qb.andWhere(inStock ? 'product.stock > 0' : 'product.stock = 0');
    }

    qb.orderBy(`product.${sortBy}`, order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(items, total, page, limit);
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!product) {
      throw new NotFoundException(`ID = ${id} bo‘lgan avtomobil topilmadi.`);
    }

    return product;
  }

  // ─────────────────────────────── UPDATE ───────────────────────────────

  /** PUT — ma'lumotni to'liq almashtiradi (yuborilmagan maydon tozalanadi). */
  async replace(id: number, dto: CreateProductDto): Promise<Product> {
    const product = await this.findEntityOrFail(id);

    await this.ensureCategoryIsUsable(dto.categoryId, product);

    product.name = dto.name;
    product.description = dto.description ?? null;
    product.price = dto.price;
    product.stock = dto.stock ?? 0;
    product.image = dto.image ?? null;
    product.categoryId = dto.categoryId;

    await this.productRepository.save(product);

    return this.findOne(id);
  }

  /** PATCH — faqat yuborilgan maydonlarni o'zgartiradi. */
  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findEntityOrFail(id);

    if (dto.categoryId !== undefined && dto.categoryId !== product.categoryId) {
      await this.ensureCategoryIsUsable(dto.categoryId, product);
      product.categoryId = dto.categoryId;
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.image !== undefined) product.image = dto.image;

    await this.productRepository.save(product);

    return this.findOne(id);
  }

  // ───────────────────────── FAOL / NOFAOL QILISH ──────────────────────

  async changeStatus(id: number, dto: UpdateStatusDto) {
    const product = await this.findOne(id);

    if (product.isActive === dto.isActive) {
      const holat = dto.isActive ? 'faol' : 'nofaol';
      return withMessage(`«${product.name}» avtomobili allaqachon ${holat} holatda edi.`, product);
    }

    // QOIDA: faol avtomobil faqat faol kategoriyada tura oladi
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

  // ─────────────────────────────── DELETE ───────────────────────────────

  async remove(id: number) {
    const product = await this.findEntityOrFail(id);

    await this.productRepository.remove(product);

    return withMessage(
      `«${product.name}» avtomobili butunlay o‘chirildi. ` +
        `Agar keyinchalik kerak bo‘lishi mumkin bo‘lsa, o‘chirish o‘rniga nofaol qilish tavsiya etiladi.`,
      { id, name: product.name },
    );
  }

  // ─────────────────────────── YORDAMCHI METODLAR ───────────────────────

  private async findEntityOrFail(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`ID = ${id} bo‘lgan avtomobil topilmadi.`);
    }

    return product;
  }

  private async findCategoryOrFail(categoryId: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });

    if (!category) {
      throw new NotFoundException(
        `ID = ${categoryId} bo‘lgan kategoriya topilmadi. ` +
          `Mavjud kategoriyalarni ko‘rish uchun: GET /api/categories`,
      );
    }

    return category;
  }

  private ensureCategoryIsActive(category: Category, prefix: string): void {
    if (!category.isActive) {
      throw new ConflictException(
        `${prefix}: «${category.name}» kategoriyasi hozir nofaol. ` +
          `Avval uni faollashtiring: PATCH /api/categories/${category.id}/status  { "isActive": true }`,
      );
    }
  }

  /**
   * Avtomobilni boshqa kategoriyaga o'tkazishda tekshiradi.
   * Faol avtomobilni nofaol kategoriyaga ko'chirib bo'lmaydi.
   */
  private async ensureCategoryIsUsable(categoryId: number, product: Product): Promise<void> {
    const category = await this.findCategoryOrFail(categoryId);

    if (product.isActive) {
      this.ensureCategoryIsActive(
        category,
        `«${product.name}» faol avtomobilini bu kategoriyaga ko‘chira olmaysiz`,
      );
    }
  }
}
