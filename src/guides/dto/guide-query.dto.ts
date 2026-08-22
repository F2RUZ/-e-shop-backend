import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { GuideLang } from '../guides.registry';

export class GuideQueryDto {
  @ApiPropertyOptional({
    description: 'Qaysi tilda yuklab olinsin. Yubormasangiz — o‘zbekcha.',
    enum: ['uz', 'ru'],
    default: 'uz',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsEnum(['uz', 'ru'], { message: 'lang faqat uz yoki ru bo‘lishi mumkin.' })
  lang?: GuideLang = 'uz';
}
