import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('admins')
export class Admin {
  @ApiProperty({ description: 'Admin ID raqami', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Tizimga kirish logini', example: 'admin' })
  @Column({ type: 'varchar', length: 50, unique: true })
  login: string;

  /**
   * Parol bcrypt bilan shifrlangan holda saqlanadi.
   * `select: false` — bazadan o'qiganda parol AVTOMATIK olinmaydi,
   * shuning uchun u hech qachon javobga tushib qolmaydi.
   */
  @Column({ type: 'varchar', select: false })
  password: string;

  @ApiProperty({ description: 'Adminning to‘liq ismi', example: 'Bosh administrator' })
  @Column({ type: 'varchar', length: 100, default: 'Administrator' })
  fullName: string;

  @ApiProperty({ description: 'Yaratilgan vaqti', example: '2026-08-06T10:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Oxirgi o‘zgartirilgan vaqti', example: '2026-08-06T10:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
