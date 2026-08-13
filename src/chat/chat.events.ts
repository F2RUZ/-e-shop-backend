import { ChatRole } from './entities/message.entity';

/**
 * ════════════════════════════════════════════════════════════════════════
 *  WebSocket hodisalarining YAGONA MANBASI
 * ════════════════════════════════════════════════════════════════════════
 *
 * REST'da manzil bor edi:  POST /api/products
 * WebSocket'da manzil YO'Q — uning o'rniga HODISA NOMI bor: 'chat:message'
 *
 * Backend ham, admin panel ham, mijoz sahifasi ham AYNAN shu nomlarni
 * ishlatadi. Nomni bir joyda o'zgartirsangiz — hamma joyda o'zgaradi.
 */
export const CHAT_EVENTS = {
  // ── Mijoz/admin  ->  server (biz yuboramiz) ──────────────────────────
  /** Suhbatga qo'shilish. Javobiga `chat:history` keladi. */
  JOIN: 'chat:join',
  /** Xabar yuborish. */
  MESSAGE: 'chat:message',
  /** «yozmoqda…» holatini bildirish. */
  TYPING: 'chat:typing',
  /** Admin suhbatni o'qidi — o'qilmaganlar hisoblagichi nolga tushadi. */
  READ: 'chat:read',

  // ── Server  ->  mijoz/admin (biz qabul qilamiz) ──────────────────────
  /** Ulanish tayyor. Ichida sizning rolingiz keladi: guest yoki admin. */
  READY: 'chat:ready',
  /** Suhbatning eski yozishmalari. */
  HISTORY: 'chat:history',
  /** Suhbatlar ro'yxati yangilandi (faqat adminlarga yuboriladi). */
  CHATS: 'chat:chats',
  /** Xatolik. Matni o'zbekcha va sababi tushuntirilgan bo'ladi. */
  ERROR: 'chat:error',
} as const;

/** Bitta suhbatning «xonasi» (room). Shu xonadagilar bir-birini eshitadi. */
export const chatRoom = (chatId: number) => `chat:${chatId}`;

/** Barcha adminlar shu xonada turadi — suhbatlar ro'yxati shu yerga yuboriladi. */
export const ADMIN_ROOM = 'admins';

// ═══════════════════════ Hodisalar ichidagi ma'lumot ════════════════════
// Diqqat: bular `interface` — `class` emas. Sababi WEBSOCKET.md da yozilgan.

/** `chat:join` bilan yuboriladi */
export interface JoinPayload {
  chatId: number;
  /** Faqat mijoz yuboradi — bu uning «kalit»i (admin uchun kerak emas) */
  guestKey?: string;
}

/** `chat:message` bilan yuboriladi */
export interface MessagePayload {
  chatId: number;
  text: string;
}

/** `chat:typing` bilan yuboriladi */
export interface TypingPayload {
  chatId: number;
  isTyping: boolean;
}

/** `chat:read` bilan yuboriladi */
export interface ReadPayload {
  chatId: number;
}

/** Har bir ulanish haqida eslab qolinadigan ma'lumot (`socket.data`) */
export interface SocketState {
  role: ChatRole;
  chatId?: number;
}

// ═══════════════════════════════════════════════════════════════════════
//  Swagger uchun hujjat
// ═══════════════════════════════════════════════════════════════════════
//
// WebSocket hodisalari Swagger'da O'ZI ko'rinmaydi (sababi WEBSOCKET.md da).
// Shuning uchun ularni shu yerda ro'yxat qilib yozamiz va oddiy REST
// endpoint orqali chiqaramiz:  GET /api/chat/events

export interface WsEventDoc {
  event: string;
  direction: 'yuborasiz  ->  server' | 'server  ->  keladi';
  who: string;
  payload: Record<string, unknown>;
  description: string;
}

export const WS_EVENT_DOCS: WsEventDoc[] = [
  {
    event: CHAT_EVENTS.JOIN,
    direction: 'yuborasiz  ->  server',
    who: 'mijoz va admin',
    payload: { chatId: 1, guestKey: 'mijoz uchun majburiy, admin uchun kerak emas' },
    description:
      'Suhbatga qo‘shiladi. Server javobiga chat:history yuboradi. ' +
      'Mijoz faqat o‘z guestKey’i bilan qo‘shila oladi — birovning suhbatiga kira olmaydi.',
  },
  {
    event: CHAT_EVENTS.MESSAGE,
    direction: 'yuborasiz  ->  server',
    who: 'mijoz va admin',
    payload: { chatId: 1, text: 'Salom! Camry hali sotuvda bormi?' },
    description:
      'Xabar yuboradi. Xabar bazaga saqlanadi va xonadagi HAMMAGA (yuboruvchining ' +
      'o‘ziga ham) chat:message bo‘lib qaytadi. Avval chat:join qilingan bo‘lishi shart.',
  },
  {
    event: CHAT_EVENTS.TYPING,
    direction: 'yuborasiz  ->  server',
    who: 'mijoz va admin',
    payload: { chatId: 1, isTyping: true },
    description:
      '«yozmoqda…» holatini bildiradi. Bu hodisa bazaga YOZILMAYDI — faqat ' +
      'qarshi tarafga uzatiladi. Yuboruvchining o‘ziga qaytmaydi.',
  },
  {
    event: CHAT_EVENTS.READ,
    direction: 'yuborasiz  ->  server',
    who: 'faqat admin',
    payload: { chatId: 1 },
    description: 'Admin suhbatni o‘qidi — unreadForAdmin hisoblagichi 0 ga tushadi.',
  },
  {
    event: CHAT_EVENTS.READY,
    direction: 'server  ->  keladi',
    who: 'mijoz va admin',
    payload: { role: 'guest' },
    description:
      'Ulanish tayyor bo‘lganda darhol keladi. role — server sizni kim deb tanigani: ' +
      'token yuborgan bo‘lsangiz "admin", yubormasangiz "guest".',
  },
  {
    event: CHAT_EVENTS.HISTORY,
    direction: 'server  ->  keladi',
    who: 'mijoz va admin',
    payload: {
      chatId: 1,
      messages: [{ id: 1, chatId: 1, sender: 'guest', text: 'Salom', createdAt: '2026-08-13T10:00:00.000Z' }],
    },
    description: 'chat:join javobi. Oxirgi 100 ta xabar, eskisidan yangisiga qarab.',
  },
  {
    event: CHAT_EVENTS.MESSAGE,
    direction: 'server  ->  keladi',
    who: 'mijoz va admin',
    payload: { id: 12, chatId: 1, sender: 'admin', text: 'Ha, bor', createdAt: '2026-08-13T10:01:00.000Z' },
    description: 'Xonaga yangi xabar keldi. Nomi yuborayotgan hodisa bilan bir xil — chalkashmang.',
  },
  {
    event: CHAT_EVENTS.TYPING,
    direction: 'server  ->  keladi',
    who: 'mijoz va admin',
    payload: { chatId: 1, from: 'guest', isTyping: true },
    description: 'Qarshi taraf yozmoqda. `from` — kim yozayotgani.',
  },
  {
    event: CHAT_EVENTS.CHATS,
    direction: 'server  ->  keladi',
    who: 'faqat admin',
    payload: { chats: [{ id: 1, guestName: 'Aziz', lastMessage: 'Salom', unreadForAdmin: 1 }] },
    description:
      'Suhbatlar ro‘yxati o‘zgardi (yangi mijoz keldi yoki yangi xabar bor). ' +
      'Admin paneli ro‘yxatni shu hodisa bilan yangilaydi — qayta so‘rov yuborish shart emas.',
  },
  {
    event: CHAT_EVENTS.ERROR,
    direction: 'server  ->  keladi',
    who: 'mijoz va admin',
    payload: { message: 'Xabar bo‘sh bo‘lishi mumkin emas.' },
    description:
      'Xatolik yuz berdi. Matn o‘zbekcha va nima qilish kerakligi yozilgan — ' +
      'uni foydalanuvchiga o‘zgartirmasdan ko‘rsatsangiz bo‘ladi.',
  },
];
