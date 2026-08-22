import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  // Category ham kerak: mahsulot qo'shishda kategoriya bor-yo'qligi va faolligi tekshiriladi
  // PickupPoint ham kerak: salon ID yuborilsa, bunday salon bor-yo'qligi tekshiriladi
  imports: [TypeOrmModule.forFeature([Product, Category, PickupPoint])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
