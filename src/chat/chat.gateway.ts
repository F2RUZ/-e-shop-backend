import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Public } from '../common/decorators/public.decorator';
import {
  ADMIN_ROOM,
  CHAT_EVENTS,
  chatRoom,
  JoinPayload,
  MessagePayload,
  ReadPayload,
  SocketState,
  TypingPayload,
} from './chat.events';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';

/** Bitta xabarning eng katta uzunligi (entity'dagi ustun uzunligi bilan bir xil). */
const MAX_TEXT_LENGTH = 1000;

/** `socket.data` ni to'g'ri tur bilan o'qish uchun kichik yordamchi. */
const state = (socket: Socket) => socket.data as SocketState;

/**
 * ════════════════════════════════════════════════════════════════════════
 *  CHAT GATEWAY — WebSocket qismi
 * ════════════════════════════════════════════════════════════════════════
 *
 * Controller HTTP so'rovlarini eshitadi, Gateway esa WebSocket ulanishlarini.
 * Farqi shunda: HTTP'da «so'rov -> javob» va ulanish uziladi. WebSocket'da
 * esa ulanish OCHIQ turadi, shuning uchun server ham o'zi xabar yubora oladi.
 *
 * `namespace: '/chat'` — ulanish manzili:  ws://localhost:3000/chat
 * (socket.io buni o'zi hal qiladi, siz `io(url + '/chat')` deb yozasiz)
 *
 * `@Public()` NEGA KERAK?
 * Loyihada global JwtAuthGuard bor — u BARCHA controller va gateway
 * handlerlarini token bilan himoya qiladi. Lekin WebSocket'da `Authorization`
 * sarlavhasi yo'q: token ulanish paytida `handshake.auth` orqali keladi.
 * Shuning uchun global guardni o'chirib qo'yamiz va tokenni O'ZIMIZ
 * `handleConnection` ichida tekshiramiz.
 */
@Public()
@WebSocketGateway({
  namespace: '/chat',
  // Mijoz sahifasi va admin panel boshqa domenda turadi — CORS ochiq bo'lsin
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  /** socket.io serveri — xohlagan xonaga xabar yuborish uchun. */
  @WebSocketServer() private readonly server: Server;

  private readonly logger = new Logger('Chat');

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  // ══════════════════════ Ulanish va uzilish ═══════════════════════════

  /**
   * Kimdir ulanganda ishlaydi. Bu yerda faqat BITTA savolga javob beramiz:
   * ulangan odam admin'mi yoki mijoz?
   *
   * Admin panel tokenni shunday yuboradi:
   *   io(url, { auth: { token: '<accessToken>' } })
   *
   * Mijoz esa umuman token yubormaydi — u oddiy mehmon.
   */
  handleConnection(socket: Socket): void {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      state(socket).role = 'guest';
      socket.emit(CHAT_EVENTS.READY, { role: 'guest' });
      return;
    }

    try {
      this.jwtService.verify(token);
    } catch {
      // Token bor, lekin yaroqsiz — mehmon deb qabul qilmaymiz, uzamiz.
      socket.emit(CHAT_EVENTS.ERROR, {
        message:
          'Token noto‘g‘ri yoki muddati tugagan. /api/auth/login orqali qaytadan kiring va yangi token bilan ulaning.',
      });
      socket.disconnect();
      return;
    }

    state(socket).role = 'admin';
    // Barcha adminlar bitta umumiy xonada turadi — suhbatlar ro'yxati shu yerga boradi
    void socket.join(ADMIN_ROOM);
    socket.emit(CHAT_EVENTS.READY, { role: 'admin' });
  }

  /** Ulanish uzilganda: qarshi tarafda «yozmoqda…» yozuvi osilib qolmasin. */
  handleDisconnect(socket: Socket): void {
    const { role, chatId } = state(socket);

    if (chatId) {
      socket.to(chatRoom(chatId)).emit(CHAT_EVENTS.TYPING, { chatId, from: role, isTyping: false });
    }
  }

  // ═══════════════════════════ Hodisalar ═══════════════════════════════

  /**
   * `chat:join` — suhbatga qo'shilish.
   *
   * Javobiga eski yozishmalar (`chat:history`) yuboriladi.
   */
  @SubscribeMessage(CHAT_EVENTS.JOIN)
  async onJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: JoinPayload): Promise<void> {
    try {
      const chat = await this.resolveChat(socket, body);
      const previousChatId = state(socket).chatId;

      // Admin bir suhbatdan ikkinchisiga o'tganda eskisidan CHIQISHI kerak.
      // Aks holda u eski xonada ham qolib, u yerdagi xabarlarni ham olaveradi.
      if (previousChatId && previousChatId !== chat.id) {
        void socket.leave(chatRoom(previousChatId));
      }

      void socket.join(chatRoom(chat.id));
      state(socket).chatId = chat.id;

      socket.emit(CHAT_EVENTS.HISTORY, {
        chatId: chat.id,
        messages: await this.chatService.history(chat.id),
      });

      // Admin suhbatni ochdi — demak o'qidi
      if (state(socket).role === 'admin') await this.chatService.markReadByAdmin(chat.id);

      // Adminlarning ro'yxati yangilansin (yangi mijoz kelgan bo'lishi mumkin)
      await this.broadcastChats();
    } catch (error) {
      this.fail(socket, error);
    }
  }

  /**
   * `chat:message` — xabar yuborish.
   *
   * Xabar bazaga saqlanadi va xonadagi HAMMAGA qaytariladi.
   */
  @SubscribeMessage(CHAT_EVENTS.MESSAGE)
  async onMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: MessagePayload,
  ): Promise<void> {
    try {
      const chatId = this.ensureJoined(socket, body?.chatId);
      const text = String(body?.text ?? '').trim();

      if (!text) {
        throw new Error('Xabar bo‘sh bo‘lishi mumkin emas — avval matn yozing.');
      }
      if (text.length > MAX_TEXT_LENGTH) {
        throw new Error(
          `Xabar juda uzun (${text.length} ta belgi). Eng ko‘pi ${MAX_TEXT_LENGTH} ta belgi bo‘lishi mumkin.`,
        );
      }

      const message = await this.chatService.addMessage(chatId, state(socket).role, text);

      // `server.to(...)` — xonadagi HAMMAGA, yuboruvchining O'ZIGA HAM.
      // (Agar `socket.to(...)` yozilsa, yuboruvchi o'z xabarini ko'rmaydi.)
      this.server.to(chatRoom(chatId)).emit(CHAT_EVENTS.MESSAGE, message);

      await this.broadcastChats();
    } catch (error) {
      this.fail(socket, error);
    }
  }

  /**
   * `chat:typing` — «yozmoqda…».
   *
   * Bu hodisa bazaga YOZILMAYDI — u shunchaki qarshi tarafga uzatiladi.
   */
  @SubscribeMessage(CHAT_EVENTS.TYPING)
  onTyping(@ConnectedSocket() socket: Socket, @MessageBody() body: TypingPayload): void {
    try {
      const chatId = this.ensureJoined(socket, body?.chatId);

      // `socket.to(...)` — o'zidan BOSHQA hammaga. O'zining «yozmoqda» sini ko'rish kerak emas.
      socket.to(chatRoom(chatId)).emit(CHAT_EVENTS.TYPING, {
        chatId,
        from: state(socket).role,
        isTyping: Boolean(body?.isTyping),
      });
    } catch (error) {
      this.fail(socket, error);
    }
  }

  /** `chat:read` — admin suhbatni o'qidi. */
  @SubscribeMessage(CHAT_EVENTS.READ)
  async onRead(@ConnectedSocket() socket: Socket, @MessageBody() body: ReadPayload): Promise<void> {
    try {
      const chatId = this.ensureJoined(socket, body?.chatId);

      // Mijozda o'qilmaganlar hisoblagichi yo'q — bu hodisa faqat admin uchun
      if (state(socket).role !== 'admin') return;

      await this.chatService.markReadByAdmin(chatId);
      await this.broadcastChats();
    } catch (error) {
      this.fail(socket, error);
    }
  }

  // ═════════════════════════ Yordamchilar ══════════════════════════════

  /**
   * Suhbatlar ro'yxatini barcha adminlarga yuboradi.
   *
   * `public` — chunki uni ChatController ham chaqiradi (suhbat o'chirilganda).
   */
  async broadcastChats(): Promise<void> {
    if (!this.server) return; // server hali ko'tarilmagan bo'lsa

    this.server.to(ADMIN_ROOM).emit(CHAT_EVENTS.CHATS, { chats: await this.chatService.findAll() });
  }

  /**
   * `chat:join` uchun: suhbatni topadi va MIJOZ O'ZINIKIGA kirayotganini tekshiradi.
   *
   * Mijoz uchun `guestKey` — parol o'rnida. Usiz istalgan odam `chatId` ni
   * 1, 2, 3 deb terib boshqalarning yozishmasini o'qib olardi.
   */
  private async resolveChat(socket: Socket, body: JoinPayload): Promise<Chat> {
    const chatId = Number(body?.chatId);

    if (!Number.isInteger(chatId) || chatId < 1) {
      throw new Error(
        'chatId butun son bo‘lishi kerak. Uni POST /api/chat/start javobidan olasiz.',
      );
    }

    const chat = await this.chatService.findOneOrFail(chatId);

    if (state(socket).role === 'guest' && chat.guestKey !== body?.guestKey) {
      throw new Error(
        'Bu suhbat sizniki emas. POST /api/chat/start orqali o‘z suhbatingizni oching va o‘sha guestKey ni yuboring.',
      );
    }

    return chat;
  }

  /**
   * Xabar yuborishdan oldin: siz shu suhbat xonasidamisiz?
   *
   * `socket.rooms` — shu ulanish qaysi xonalarda turgani. Agar xonada
   * bo'lmasangiz, demak `chat:join` qilmagansiz.
   */
  private ensureJoined(socket: Socket, rawChatId: unknown): number {
    const chatId = Number(rawChatId);

    if (!Number.isInteger(chatId) || !socket.rooms.has(chatRoom(chatId))) {
      throw new Error(
        `Avval suhbatga qo‘shiling: "${CHAT_EVENTS.JOIN}" hodisasini { chatId: ... } bilan yuboring.`,
      );
    }

    return chatId;
  }

  /**
   * Xatolikni faqat XATO QILGAN odamga yuboradi.
   *
   * Diqqat: gateway ichida hech qachon `throw` qilmaymiz. Loyihadagi global
   * AllExceptionsFilter HTTP javobi uchun yozilgan — WebSocket'da `response`
   * degan narsa yo'q. Shuning uchun har bir handler try/catch ichida ishlaydi
   * va xatoni `chat:error` hodisasi qilib qaytaradi.
   */
  private fail(socket: Socket, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Kutilmagan xatolik yuz berdi.';

    this.logger.warn(`${state(socket).role ?? 'guest'}: ${message}`);
    socket.emit(CHAT_EVENTS.ERROR, { message });
  }
}
