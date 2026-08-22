import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../auth/entities/admin.entity';
import { Category } from '../categories/entities/category.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Product } from '../products/entities/product.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Category, Product, PickupPoint])],
  providers: [SeedService],
})
export class DatabaseModule {}
