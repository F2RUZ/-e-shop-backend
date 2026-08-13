import { io, type Socket } from 'socket.io-client';
import { API_URL, TOKEN_KEY } from './client';

/**
 * ════════════════════════════════════════════════════════════════════════
 *  WebSocket — admin tomoni
 * ════════════════════════════════════════════════════════════════════════
 *
 * Hodisa nomlari backenddagi `src/chat/chat.events.ts` bilan AYNAN bir xil.
 * Ikkala tomonda ham nomlar bitta joyda yozilgan — chalkashish bo'lmaydi.
 */
export const CHAT_EVENTS = {
  // biz yuboramiz
  JOIN: 'chat:join',
  MESSAGE: 'chat:message',
  TYPING: 'chat:typing',
  READ: 'chat:read',
  // bizga keladi
  READY: 'chat:ready',
  HISTORY: 'chat:history',
  CHATS: 'chat:chats',
  ERROR: 'chat:error',
} as const;

/**
 * API manzili `.../api` bilan tugaydi, WebSocket esa `/chat` da turadi:
 *
 *   https://backend.magnateshop.uz/api   ->   https://backend.magnateshop.uz/chat
 */
const ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const WS_URL = `${ORIGIN}/chat`;

/** Mijozlar uchun tayyor chat sahifasi — backendning o'zi tarqatadi. */
export const CLIENT_CHAT_PAGE = `${ORIGIN}/chat.html`;

/**
 * Ulanishni yaratadi.
 *
 * Farqi mijoz sahifasidan faqat SHUNDA: biz `auth.token` yuboramiz.
 * Shu token tufayli server bizni `admin` deb taniydi va barcha suhbatlar
 * ro'yxatini yuborib turadi.
 *
 * `transports` ni ataylab belgilamaymiz: socket.io avval oddiy so'rov bilan
 * ulanib, keyin WebSocket'ga o'tadi. Agar nginx WebSocket'ni o'tkazmasa ham,
 * chat baribir ishlayveradi (sekinroq bo'lsa ham).
 */
export function createChatSocket(): Socket {
  return io(WS_URL, {
    auth: { token: localStorage.getItem(TOKEN_KEY) },
    reconnectionDelay: 1000,
  });
}
