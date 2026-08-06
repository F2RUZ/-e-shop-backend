import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';

export class ProductStatsDto {
  @ApiProperty({ description: 'Jami mahsulotlar soni', example: 24 })
  total: number;

  @ApiProperty({ description: 'Faol (sotuvda turgan) mahsulotlar', example: 20 })
  active: number;

  @ApiProperty({ description: 'Nofaol mahsulotlar', example: 4 })
  inactive: number;

  @ApiProperty({ description: 'Omborda tugagan mahsulotlar (stock = 0)', example: 3 })
  outOfStock: number;

  @ApiProperty({ description: 'Kam qolgan mahsulotlar (0 < stock <= threshold)', example: 5 })
  lowStock: number;
}

export class CategoryStatsDto {
  @ApiProperty({ description: 'Jami kategoriyalar soni', example: 5 })
  total: number;

  @ApiProperty({ description: 'Faol kategoriyalar', example: 4 })
  active: number;

  @ApiProperty({ description: 'Nofaol kategoriyalar', example: 1 })
  inactive: number;

  @ApiProperty({ description: 'Bo‘sh (bitta ham mahsuloti yo‘q) kategoriyalar', example: 1 })
  empty: number;
}

export class StockStatsDto {
  @ApiProperty({ description: 'Ombordagi jami dona soni', example: 512 })
  totalItems: number;

  @ApiProperty({ description: 'Ombordagi tovarlarning umumiy qiymati (so‘m)', example: 1543000000 })
  totalValue: number;

  @ApiProperty({ description: 'O‘rtacha mahsulot narxi (so‘m)', example: 3200000 })
  averagePrice: number;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Mahsulotlar bo‘yicha statistika', type: ProductStatsDto })
  products: ProductStatsDto;

  @ApiProperty({ description: 'Kategoriyalar bo‘yicha statistika', type: CategoryStatsDto })
  categories: CategoryStatsDto;

  @ApiProperty({ description: 'Ombor bo‘yicha statistika', type: StockStatsDto })
  stock: StockStatsDto;

  @ApiProperty({ description: 'Oxirgi qo‘shilgan 5 ta mahsulot', type: [Product] })
  latestProducts: Product[];

  @ApiProperty({
    description: '"Kam qolgan" deb hisoblangan chegara (shu son va undan kam)',
    example: 5,
  })
  lowStockThreshold: number;
}

export class CategoryBreakdownDto {
  @ApiProperty({ description: 'Kategoriya ID raqami', example: 1 })
  id: number;

  @ApiProperty({ description: 'Kategoriya nomi', example: 'Telefonlar' })
  name: string;

  @ApiProperty({ description: 'Kategoriya faolmi', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Kategoriyadagi jami mahsulotlar', example: 12 })
  productsCount: number;

  @ApiProperty({ description: 'Shundan faollari', example: 10 })
  activeProductsCount: number;

  @ApiProperty({ description: 'Kategoriyadagi jami dona soni', example: 140 })
  totalStock: number;

  @ApiProperty({ description: 'Kategoriyadagi tovarlar umumiy qiymati (so‘m)', example: 890000000 })
  totalValue: number;
}
