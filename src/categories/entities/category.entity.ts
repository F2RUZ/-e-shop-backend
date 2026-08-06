import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @ApiProperty({ description: 'Kategoriya ID raqami', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Kategoriya nomi (takrorlanmas)', example: 'Krossover va SUV' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    description: 'Qisqacha izoh',
    example: 'Baland klirens, to‘liq g‘ildirak uzatmasi, oila va sayohat uchun',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Faol holati. false bo‘lsa — kategoriya va undagi avtomobillar sotuvda ko‘rinmaydi',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Yaratilgan vaqti', example: '2026-08-06T10:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Oxirgi o‘zgartirilgan vaqti', example: '2026-08-06T10:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  /**
   * Bazada ustun emas — ro'yxat va bitta kategoriya so'ralganda
   * hisoblanib qo'shiladi (nechta mahsulot borligi).
   */
  @ApiProperty({ description: 'Ushbu kategoriyadagi avtomobillar soni', example: 20 })
  productsCount?: number;
}
