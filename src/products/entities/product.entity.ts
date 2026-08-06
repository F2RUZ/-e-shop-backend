import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
export class Product {
  @ApiProperty({ description: 'Mahsulot ID raqami', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Mahsulot nomi', example: 'iPhone 15 Pro 256GB' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({
    description: 'Mahsulot tavsifi',
    example: 'Titan korpus, A17 Pro protsessor, 48MP kamera',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 2000, nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Narxi (so‘mda)', example: 15990000 })
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  price: number;

  @ApiProperty({ description: 'Omborda nechta qolgani', example: 12 })
  @Column({ type: 'int', default: 0 })
  stock: number;

  @ApiProperty({
    description: 'Rasm havolasi',
    example: 'https://example.com/rasmlar/iphone-15-pro.jpg',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @ApiProperty({
    description: 'Faol holati. false bo‘lsa — mahsulot sotuvda ko‘rinmaydi',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Qaysi kategoriyaga tegishli (kategoriya ID raqami)', example: 1 })
  @Index()
  @Column({ type: 'int' })
  categoryId: number;

  @ApiProperty({ description: 'Kategoriya ma’lumotlari', type: () => Category })
  @ManyToOne(() => Category, (category) => category.products, {
    // Bazaning o'zi ham himoya qiladi: mahsuloti bor kategoriya o'chirilmaydi
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ApiProperty({ description: 'Yaratilgan vaqti', example: '2026-08-06T10:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Oxirgi o‘zgartirilgan vaqti', example: '2026-08-06T10:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
