import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';

export class ProductStatsDto {
  @ApiProperty({ description: 'Jami avtomobillar soni', example: 100 })
  total: number;

  @ApiProperty({ description: 'Faol (sotuvda turgan) avtomobillar', example: 96 })
  active: number;

  @ApiProperty({ description: 'Nofaol avtomobillar', example: 4 })
  inactive: number;

  @ApiProperty({ description: 'Salonda tugagan avtomobillar (stock = 0)', example: 4 })
  outOfStock: number;

  @ApiProperty({ description: 'Kam qolgan avtomobillar (0 < stock <= threshold)', example: 70 })
  lowStock: number;
}

export class CategoryStatsDto {
  @ApiProperty({ description: 'Jami kategoriyalar soni', example: 8 })
  total: number;

  @ApiProperty({ description: 'Faol kategoriyalar', example: 8 })
  active: number;

  @ApiProperty({ description: 'Nofaol kategoriyalar', example: 0 })
  inactive: number;

  @ApiProperty({ description: 'Bo‘sh (bitta ham avtomobili yo‘q) kategoriyalar', example: 0 })
  empty: number;
}

export class PickupPointStatsDto {
  @ApiProperty({ description: 'Jami salonlar soni', example: 6 })
  total: number;

  @ApiProperty({ description: 'Ochiq salonlar', example: 5 })
  active: number;

  @ApiProperty({ description: 'Yopiq salonlar', example: 1 })
  inactive: number;

  @ApiProperty({ description: 'Nechta shaharda salon bor', example: 4 })
  cities: number;

  @ApiProperty({ description: 'Bo‘sh (bitta ham avtomobili yo‘q) salonlar', example: 2 })
  empty: number;

  @ApiProperty({ description: 'Tanishtiruv videosi bor salonlar', example: 3 })
  withVideo: number;

  @ApiProperty({
    description: 'Koordinatasi yozilmagan salonlar — ular /nearby ro‘yxatiga tushmaydi',
    example: 1,
  })
  withoutCoordinates: number;

  @ApiProperty({
    description: 'Hech qaysi salonga biriktirilmagan avtomobillar',
    example: 100,
  })
  unassignedProducts: number;
}

export class StockStatsDto {
  @ApiProperty({ description: 'Salondagi jami avtomobillar soni', example: 432 })
  totalItems: number;

  @ApiProperty({ description: 'Salondagi avtomobillarning umumiy qiymati (so‘m)', example: 189576000000 })
  totalValue: number;

  @ApiProperty({ description: 'O‘rtacha avtomobil narxi (so‘m)', example: 863580000 })
  averagePrice: number;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Avtomobillar bo‘yicha statistika', type: ProductStatsDto })
  products: ProductStatsDto;

  @ApiProperty({ description: 'Kategoriyalar bo‘yicha statistika', type: CategoryStatsDto })
  categories: CategoryStatsDto;

  @ApiProperty({ description: 'Tarqatuvchi salonlar bo‘yicha statistika', type: PickupPointStatsDto })
  pickupPoints: PickupPointStatsDto;

  @ApiProperty({ description: 'Salon bo‘yicha statistika', type: StockStatsDto })
  stock: StockStatsDto;

  @ApiProperty({ description: 'Oxirgi qo‘shilgan 5 ta avtomobil', type: [Product] })
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

  @ApiProperty({ description: 'Kategoriya nomi', example: 'Krossover va SUV' })
  name: string;

  @ApiProperty({ description: 'Kategoriya faolmi', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Kategoriyadagi jami avtomobillar', example: 20 })
  productsCount: number;

  @ApiProperty({ description: 'Shundan faollari', example: 20 })
  activeProductsCount: number;

  @ApiProperty({ description: 'Kategoriyadagi jami avtomobillar soni', example: 96 })
  totalStock: number;

  @ApiProperty({ description: 'Kategoriyadagi avtomobillar umumiy qiymati (so‘m)', example: 47815000000 })
  totalValue: number;
}

export class PickupPointBreakdownDto {
  @ApiProperty({ description: 'Salon ID raqami', example: 1 })
  id: number;

  @ApiProperty({ description: 'Salon nomi', example: 'Magnate Motors — Chilonzor' })
  name: string;

  @ApiProperty({ description: 'Shahar', example: 'Toshkent' })
  city: string;

  @ApiProperty({ description: 'Salon ochiqmi', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Tanishtiruv videosi bormi', example: true })
  hasVideo: boolean;

  @ApiProperty({ description: 'Salondagi jami avtomobillar', example: 12 })
  productsCount: number;

  @ApiProperty({ description: 'Shundan faollari', example: 11 })
  activeProductsCount: number;

  @ApiProperty({ description: 'Salondagi avtomobillar jami soni (dona)', example: 47 })
  totalStock: number;

  @ApiProperty({ description: 'Salondagi avtomobillar umumiy qiymati (so‘m)', example: 23400000000 })
  totalValue: number;
}
