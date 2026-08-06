import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { CategoryBreakdownDto, DashboardStatsDto } from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
  ) {}

  /** Admin panelning bosh sahifasi uchun umumiy raqamlar. */
  async getStats(threshold: number): Promise<DashboardStatsDto> {
    const [
      totalProducts,
      activeProducts,
      outOfStock,
      lowStockCount,
      totalCategories,
      activeCategories,
      stockTotals,
      emptyCategories,
      latestProducts,
    ] = await Promise.all([
      this.productRepository.count(),
      this.productRepository.count({ where: { isActive: true } }),
      this.productRepository.count({ where: { stock: 0 } }),
      // kam qolganlar: 0 dan ko'p, lekin chegaradan oshmagan
      this.productRepository.count({
        where: { stock: And(MoreThan(0), LessThanOrEqual(threshold)) },
      }),
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
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
        outOfStock,
        lowStock: lowStockCount,
      },
      categories: {
        total: totalCategories,
        active: activeCategories,
        inactive: totalCategories - activeCategories,
        empty: emptyCategories,
      },
      stock: stockTotals,
      latestProducts,
      lowStockThreshold: threshold,
    };
  }

  /** Har bir kategoriya kesimida: nechta mahsulot, qancha dona, qancha pul. */
  async getCategoryBreakdown(): Promise<CategoryBreakdownDto[]> {
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
      .addOrderBy('category.name', 'ASC')
      .getRawMany();

    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      isActive: row.isActive,
      productsCount: Number(row.productsCount),
      activeProductsCount: Number(row.activeProductsCount),
      totalStock: Number(row.totalStock),
      totalValue: Number(row.totalValue),
    }));
  }

  /** Omborda kam qolgan mahsulotlar — eng avval tugab qolganlari. */
  async getLowStockProducts(threshold: number): Promise<Product[]> {
    return this.productRepository.find({
      where: { stock: LessThanOrEqual(threshold) },
      relations: { category: true },
      order: { stock: 'ASC', name: 'ASC' },
      take: 50,
    });
  }

  // ─────────────────────────── YORDAMCHI METODLAR ───────────────────────

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

  private async countEmptyCategories(): Promise<number> {
    const raw = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .groupBy('category.id')
      .having('COUNT(product.id) = 0')
      .getRawMany();

    return raw.length;
  }
}
