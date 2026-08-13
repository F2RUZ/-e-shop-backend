import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Chat } from './chat.entity';

/**
 * Xabarni KIM yozgani.
 *
 * - `guest` — mijoz (chat.html sahifasidan yozadi)
 * - `admin` — admin (admin paneldan javob beradi)
 *
 * Chatda faqat SHU IKKI TARAF bor — shuning uchun uchinchi qiymat yo'q.
 */
export type ChatRole = 'guest' | 'admin';

@Entity('messages')
export class Message {
  @ApiProperty({ description: 'Xabar ID raqami', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Qaysi suhbatga tegishli (suhbat ID raqami)', example: 1 })
  @Index()
  @Column({ type: 'int' })
  chatId: number;

  /**
   * Diqqat: bu yerda `onDelete: 'CASCADE'` — avtomobil/kategoriyadagidan FARQLI.
   *
   * Kategoriyada 'RESTRICT' edi: avtomobili bor kategoriyani o'chirib bo'lmaydi.
   * Bu yerda esa aksincha — suhbat o'chirilsa, uning xabarlari ham keraksiz
   * bo'lib qoladi, shuning uchun ular birga o'chadi.
   */
  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  @ApiProperty({ description: 'Xabarni kim yozgani', example: 'guest', enum: ['guest', 'admin'] })
  @Column({ type: 'varchar', length: 10 })
  sender: ChatRole;

  @ApiProperty({ description: 'Xabar matni', example: 'Salom! Camry hali sotuvda bormi?' })
  @Column({ type: 'varchar', length: 1000 })
  text: string;

  @ApiProperty({ description: 'Yuborilgan vaqti', example: '2026-08-13T10:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;
}
