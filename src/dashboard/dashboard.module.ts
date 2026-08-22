import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { PickupPoint } from '../pickup-points/entities/pickup-point.entity';
import { Product } from '../products/entities/product.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, PickupPoint])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
