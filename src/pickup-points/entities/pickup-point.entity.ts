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
import { numericTransformer } from '../../common/transformers/numeric.transformer';
import { Product } from '../../products/entities/product.entity';

/**
 * Tarqatuvchi salon (pickup point) — xaridor avtomobilni borib oladigan joy.
 *
 * Kategoriya avtomobilning O'ZI haqida (qanaqa avtomobil), salon esa
 * avtomobil QAYERDA turgani haqida. Shuning uchun ular bir-biriga xalaqit
 * bermaydi: bitta avtomobilning ham kategoriyasi, ham saloni bo'ladi.
 */
@Entity('pickup_points')
export class PickupPoint {
  @ApiProperty({ description: 'Salon ID raqami', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Salon nomi (takrorlanmas)',
    example: 'Magnate Motors — Chilonzor',
  })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ description: 'Shahar yoki viloyat', example: 'Toshkent' })
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @ApiProperty({
    description: 'To‘liq manzil',
    example: 'Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12-uy',
  })
  @Column({ type: 'varchar', length: 300 })
  address: string;

  @ApiProperty({
    description: 'Telefon raqami (xalqaro ko‘rinishda saqlanadi)',
    example: '+998901234567',
  })
  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @ApiProperty({ description: 'Ochilish vaqti (HH:MM)', example: '09:00' })
  @Column({ type: 'varchar', length: 5, default: '09:00' })
  opensAt: string;

  @ApiProperty({ description: 'Yopilish vaqti (HH:MM)', example: '19:00' })
  @Column({ type: 'varchar', length: 5, default: '19:00' })
  closesAt: string;

  @ApiProperty({
    description: 'Kenglik (latitude) — xaritadagi joyi',
    example: 41.285,
    nullable: true,
  })
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true, transformer: numericTransformer })
  latitude: number | null;

  @ApiProperty({
    description: 'Uzunlik (longitude) — xaritadagi joyi',
    example: 69.204,
    nullable: true,
  })
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true, transformer: numericTransformer })
  longitude: number | null;

  @ApiProperty({
    description: 'Salon rasmi (to‘liq havola)',
    example: 'https://backend.magnateshop.uz/images/salons/chilonzor.jpg',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @ApiProperty({
    description:
      'Panelga YUKLANGAN rasmning serverdagi yo‘li. Frontend buni ISHLATMAYDI — ' +
      'tayyor havola uchun `imageUrl` maydonini oling. `image` esa tashqi havola: ' +
      'ikkisidan biri to‘ldiriladi, ikkalasi birga emas.',
    example: 'pickup-points/3-1755874000.jpg',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 300, nullable: true })
  imagePath: string | null;

  @ApiProperty({
    description:
      'Video faylning serverdagi yo‘li. Frontend buni ISHLATMAYDI — ' +
      'tayyor havola uchun `videoUrl` maydonini oling.',
    example: 'pickup-points/3-1755874000.mp4',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 300, nullable: true })
  videoPath: string | null;

  @ApiProperty({
    description: 'Faol holati. false bo‘lsa — salon vaqtincha yopiq',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Yaratilgan vaqti', example: '2026-08-22T10:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Oxirgi o‘zgartirilgan vaqti', example: '2026-08-22T10:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.pickupPoint)
  products: Product[];

  /** Bazada ustun EMAS — so'ralganda hisoblanib qo'shiladi. */
  @ApiProperty({ description: 'Shu salondagi avtomobillar soni', example: 12 })
  productsCount?: number;

  /** Bazada ustun EMAS — `opensAt`/`closesAt` va hozirgi vaqtdan hisoblanadi. */
  @ApiProperty({ description: 'Hozir ochiqmi (Toshkent vaqti bilan)', example: true })
  isOpenNow?: boolean;

  /**
   * Bazada ustun EMAS — `videoPath` dan yasaladi.
   *
   * Nega bazada to'liq havola saqlanmaydi? Domen o'zgarsa (masalan sayt
   * boshqa manzilga ko'chsa) bazadagi HAMMA qatorni yangilash kerak bo'lardi.
   * Yo'lni saqlab, havolani javob berayotganda yasash — xavfsizroq.
   */
  /**
   * Bazada ustun EMAS. Yuklangan rasm bo'lsa — o'shanikini, aks holda
   * tashqi havolani (`image`) qaytaradi. Frontend faqat shuni biladi.
   */
  @ApiProperty({
    description: 'Rasm havolasi — brauzer shuni ishlatadi (yuklangan yoki tashqi)',
    example: 'https://backend.magnateshop.uz/uploads/pickup-points/3-1755874000.jpg',
    nullable: true,
  })
  imageUrl?: string | null;

  @ApiProperty({
    description: 'Video havolasi — brauzer shuni ishlatadi',
    example: 'https://backend.magnateshop.uz/uploads/pickup-points/3-1755874000.mp4',
    nullable: true,
  })
  videoUrl?: string | null;

  /** Bazada ustun EMAS — faqat `GET /pickup-points/nearby` javobida bo'ladi. */
  @ApiProperty({ description: 'Berilgan nuqtadan masofa (km)', example: 3.4 })
  distanceKm?: number;
}
