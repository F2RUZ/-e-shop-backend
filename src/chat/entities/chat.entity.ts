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
import { Message } from './message.entity';

/**
 * Suhbat — bitta mijoz bilan admin o'rtasidagi yozishuv.
 *
 * Har bir mijoz uchun bitta suhbat bo'ladi. Mijoz ro'yxatdan o'tmaydi,
 * shuning uchun uni `guestKey` orqali tanib olamiz:
 *
 *   1. Mijoz ismini yozadi  ->  POST /api/chat/start
 *   2. Backend `guestKey` (tasodifiy uzun matn) qaytaradi
 *   3. Brauzer uni localStorage'da saqlaydi
 *   4. Sahifa yopilib qayta ochilsa — o'sha guestKey yuboriladi va
 *      mijoz o'z eski suhbatini yozishmalari bilan qaytadan ko'radi
 *
 * `guestKey` — bu mijozning "kalit"i. U bo'lmasa boshqa birovning
 * suhbatiga kirib bo'lmaydi (buni ChatGateway tekshiradi).
 */
@Entity('chats')
export class Chat {
  @ApiProperty({ description: 'Suhbat ID raqami', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Mijozning maxfiy kaliti. Faqat mijozning o‘zida bo‘ladi (localStorage).',
    example: '6f1c9c1e-2a3b-4c5d-8e9f-0a1b2c3d4e5f',
  })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  guestKey: string;

  @ApiProperty({ description: 'Mijozning ismi', example: 'Aziz' })
  @Column({ type: 'varchar', length: 60 })
  guestName: string;

  @ApiProperty({
    description: 'Oxirgi xabar matni — suhbatlar ro‘yxatida ko‘rsatish uchun',
    example: 'Salom! Camry hali sotuvda bormi?',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 300, nullable: true })
  lastMessage: string | null;

  @ApiProperty({
    description: 'Oxirgi xabar vaqti. Suhbatlar shu bo‘yicha tartiblanadi.',
    example: '2026-08-13T10:00:00.000Z',
    nullable: true,
  })
  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @ApiProperty({
    description: 'Admin hali o‘qimagan xabarlar soni. Admin suhbatni ochsa — 0 bo‘ladi.',
    example: 2,
  })
  @Column({ type: 'int', default: 0 })
  unreadForAdmin: number;

  @OneToMany(() => Message, (message) => message.chat)
  messages: Message[];

  @ApiProperty({ description: 'Suhbat boshlangan vaqt', example: '2026-08-13T09:50:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Oxirgi o‘zgarish vaqti', example: '2026-08-13T10:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
