import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { PickupPoint } from './entities/pickup-point.entity';
import { GeocodingService } from './geocoding.service';
import { PickupPointsController } from './pickup-points.controller';
import { PickupPointsService } from './pickup-points.service';
import { VideoService } from './video.service';

@Module({
  // Product ham kerak: salonni o'chirish va salondagi avtomobillarni ko'rsatish uchun
  imports: [TypeOrmModule.forFeature([PickupPoint, Product])],
  controllers: [PickupPointsController],
  providers: [PickupPointsService, VideoService, GeocodingService],
  exports: [PickupPointsService],
})
export class PickupPointsModule {}
