import { Module } from '@nestjs/common';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';

@Module({
  // Bazaga umuman murojaat qilmaydi — qo'llanmalar kod ichida yozilgan
  controllers: [GuidesController],
  providers: [GuidesService],
})
export class GuidesModule {}
