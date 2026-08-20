import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../auth/entities/admin.entity';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  // Admin entity auth modulida yaratilgan — bu yerda faqat ishlatiladi, o'zgartirilmaydi
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [AdminsController],
  providers: [AdminsService, SuperAdminGuard],
  exports: [AdminsService],
})
export class AdminsModule {}
