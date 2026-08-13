import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { withMessage } from '../common/helpers/with-message.helper';
import { StartChatDto } from './dto/start-chat.dto';
import { Chat } from './entities/chat.entity';
import { ChatRole, Message } from './entities/message.entity';

/** Tarixda bir marta nechta xabar qaytariladi. */
const HISTORY_LIMIT = 100;

/**
 * Chatning BAZA bilan ishlaydigan qismi.
 *
 * Diqqat: bu servis WebSocket haqida HECH NARSA bilmaydi.
 * U faqat saqlaydi va o'qiydi. Kim kimga yuborishini ChatGateway hal qiladi.
 * Shu sabab uni oddiy REST controllerdan ham chaqirsa bo'ladi.
 */
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
  ) {}

  /**
   * Mijoz suhbatni boshlaydi.
   *
   * `guestKey` yuborilgan va bazada topilgan bo'lsa — eski suhbat davom etadi
   * (ism o'zgargan bo'lsa yangilanadi). Aks holda yangi suhbat ochiladi.
   */
  async start(dto: StartChatDto): Promise<Chat> {
    if (dto.guestKey) {
      const existing = await this.chatRepository.findOne({ where: { guestKey: dto.guestKey } });

      if (existing) {
        if (existing.guestName !== dto.name) {
          existing.guestName = dto.name;
          await this.chatRepository.save(existing);
        }
        return existing;
      }
    }

    // randomUUID() — Node'ning o'zida bor, qo'shimcha kutubxona kerak emas
    const chat = this.chatRepository.create({
      guestKey: randomUUID(),
      guestName: dto.name,
    });

    return this.chatRepository.save(chat);
  }

  /**
   * Barcha suhbatlar — eng oxirgi yozilgani birinchi bo'lib.
   *
   * Hali xabar yozilmagan suhbatda `lastMessageAt` = null. PostgreSQL'da
   * DESC tartibida null'lar eng tepada turadi — ya'ni yangi kelgan mijoz
   * ro'yxatning boshida ko'rinadi. Bu bizga aynan kerak.
   */
  findAll(): Promise<Chat[]> {
    return this.chatRepository.find({ order: { lastMessageAt: 'DESC', id: 'DESC' } });
  }

  /** Suhbatni ID bo'yicha topadi, bo'lmasa aniq xabar bilan xato beradi. */
  async findOneOrFail(id: number): Promise<Chat> {
    const chat = await this.chatRepository.findOne({ where: { id } });

    if (!chat) {
      throw new NotFoundException(
        `ID = ${id} bo‘lgan suhbat topilmadi. Mavjud suhbatlar ro‘yxati: GET /api/chat/chats`,
      );
    }

    return chat;
  }

  /**
   * Suhbat yozishmalari — eskisidan yangisiga qarab.
   *
   * Bazadan YANGISIDAN boshlab `take: HISTORY_LIMIT` ta olamiz (shunda eng
   * so'nggi xabarlar kafolatlanadi), keyin `reverse()` bilan chatda
   * ko'rinadigan tartibga o'giramiz.
   */
  async history(chatId: number): Promise<Message[]> {
    const messages = await this.messageRepository.find({
      where: { chatId },
      order: { id: 'DESC' },
      take: HISTORY_LIMIT,
    });

    return messages.reverse();
  }

  /**
   * Yangi xabarni saqlaydi va suhbatning "oxirgi xabar" ma'lumotini yangilaydi.
   *
   * `lastMessage` / `lastMessageAt` ni shu yerda yangilashimizning sababi:
   * admin panelidagi suhbatlar ro'yxati uchun har safar xabarlar jadvalini
   * qidirib o'tirmaslik — kerakli narsa suhbatning o'zida tayyor turadi.
   */
  async addMessage(chatId: number, sender: ChatRole, text: string): Promise<Message> {
    const chat = await this.findOneOrFail(chatId);

    const message = await this.messageRepository.save(
      this.messageRepository.create({ chatId: chat.id, sender, text }),
    );

    chat.lastMessage = text.slice(0, 300);
    chat.lastMessageAt = message.createdAt;

    // Faqat mijozning xabari admin uchun "o'qilmagan" hisoblanadi
    if (sender === 'guest') chat.unreadForAdmin += 1;

    await this.chatRepository.save(chat);

    return message;
  }

  /** Admin suhbatni ochdi — o'qilmaganlar hisoblagichi nolga tushadi. */
  async markReadByAdmin(chatId: number): Promise<Chat> {
    const chat = await this.findOneOrFail(chatId);

    if (chat.unreadForAdmin !== 0) {
      chat.unreadForAdmin = 0;
      await this.chatRepository.save(chat);
    }

    return chat;
  }

  /** Suhbatni o'chiradi. Xabarlari CASCADE bilan o'zi o'chib ketadi. */
  async remove(id: number) {
    const chat = await this.findOneOrFail(id);
    await this.chatRepository.remove(chat);

    return withMessage(`«${chat.guestName}» bilan suhbat va uning barcha xabarlari o‘chirildi.`, {
      id,
      guestName: chat.guestName,
    });
  }
}
