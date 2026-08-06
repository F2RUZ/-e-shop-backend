import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { PaginatedResult, paginate } from '../common/dto/paginated-result.dto';
import { withMessage } from '../common/helpers/with-message.helper';
import { Product } from '../products/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
  ) {}

  // ─────────────────────────────── CREATE ───────────────────────────────

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.ensureNameIsFree(dto.name);

    const category = this.categoryRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });

    return this.categoryRepository.save(category);
  }

  // ──────────────────────────────── READ ────────────────────────────────

  async findAll(query: QueryCategoryDto): Promise<PaginatedResult<Category>> {
    const { page, limit, search, isActive, sortBy, order } = query;

    const qb = this.categoryRepository
      .createQueryBuilder('category')
      // har bir kategoriyaga avtomobillar sonini qo'shib beradi
      .loadRelationCountAndMap('category.productsCount', 'category.products');

    if (search) {
      qb.andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (isActive !== undefined) {
      qb.andWhere('category.isActive = :isActive', { isActive });
    }

    qb.orderBy(`category.${sortBy}`, order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return paginate(items, total, page, limit);
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .loadRelationCountAndMap('category.productsCount', 'category.products')
      .where('category.id = :id', { id })
      .getOne();

    if (!category) {
      throw new NotFoundException(`ID = ${id} bo‘lgan kategoriya topilmadi.`);
    }

    return category;
  }

  // ─────────────────────────────── UPDATE ───────────────────────────────

  /** PUT — ma'lumotni to'liq almashtiradi (yuborilmagan maydon tozalanadi). */
  async replace(id: number, dto: CreateCategoryDto): Promise<Category> {
    const category = await this.findEntityOrFail(id);
    await this.ensureNameIsFree(dto.name, id);

    category.name = dto.name;
    category.description = dto.description ?? null;

    return this.categoryRepository.save(category);
  }

  /** PATCH — faqat yuborilgan maydonlarni o'zgartiradi. */
  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findEntityOrFail(id);

    if (dto.name !== undefined) {
      await this.ensureNameIsFree(dto.name, id);
      category.name = dto.name;
    }

    if (dto.description !== undefined) {
      category.description = dto.description;
    }

    return this.categoryRepository.save(category);
  }

  // ───────────────────────── FAOL / NOFAOL QILISH ──────────────────────

  async changeStatus(id: number, dto: UpdateStatusDto) {
    const category = await this.findEntityOrFail(id);

    if (category.isActive === dto.isActive) {
      const holat = dto.isActive ? 'faol' : 'nofaol';
      return withMessage(`«${category.name}» kategoriyasi allaqachon ${holat} holatda edi.`, category);
    }

    category.isActive = dto.isActive;
    await this.categoryRepository.save(category);

    // NOFAOL qilish: kategoriya bilan birga undagi avtomobillar ham nofaol bo'ladi,
    // aks holda "nofaol kategoriyadagi faol avtomobil" degan chalkash holat paydo bo'ladi.
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

    // FAOL qilish: avtomobillar avtomatik yoqilmaydi — qaysi biri sotuvga chiqishini admin o'zi hal qiladi.
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

  // ─────────────────────────────── DELETE ───────────────────────────────

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

    return withMessage(`«${category.name}» kategoriyasi o‘chirildi.`, {
      id,
      name: category.name,
    });
  }

  // ─────────────────────────── YORDAMCHI METODLAR ───────────────────────

  /** Kategoriyani topadi, topilmasa aniq xabar bilan 404 qaytaradi. */
  private async findEntityOrFail(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`ID = ${id} bo‘lgan kategoriya topilmadi.`);
    }

    return category;
  }

  /** Nom band emasligini tekshiradi (katta-kichik harf farqisiz). */
  private async ensureNameIsFree(name: string, exceptId?: number): Promise<void> {
    const qb = this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name });

    if (exceptId) {
      qb.andWhere('category.id != :exceptId', { exceptId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new ConflictException(
        `«${existing.name}» nomli kategoriya allaqachon mavjud (ID = ${existing.id}). Boshqa nom tanlang.`,
      );
    }
  }
}
