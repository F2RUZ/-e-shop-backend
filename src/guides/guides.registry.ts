import { PICKUP_POINTS_GUIDE } from '../pickup-points/pickup-points.docs';
import { PICKUP_POINTS_GUIDE_RU } from '../pickup-points/pickup-points.docs.ru';

/**
 * QO'LLANMALAR RO'YXATI.
 *
 * Bu yagona joy — yangi qo'llanma qo'shish uchun shu massivga bitta yozuv
 * qo'shsangiz kifoya. Endpointlar, PDF yasash va til tanlash o'zi ishlaydi.
 */

export type GuideLang = 'uz' | 'ru';

/** Qo'llab-quvvatlanadigan tillar. Yangi til qo'shilsa — shu yerga. */
export const GUIDE_LANGUAGES: GuideLang[] = ['uz', 'ru'];

/** Hozircha faqat PDF. Boshqa format qo'shilsa shu yer kengaytiriladi. */
export const GUIDE_FORMAT = 'pdf';

export interface Guide {
  /** URL'dagi nomi: /api/guides/pickup-points */
  key: string;

  /** Har bir tildagi sarlavha */
  title: Record<GuideLang, string>;

  /** Ro'yxatda ko'rinadigan qisqa izoh */
  description: Record<GuideLang, string>;

  /** Qo'llanma matni (markdown). Swagger ham, PDF ham SHU manbadan oladi. */
  content: Record<GuideLang, string>;

  /** Oxirgi marta qachon yangilangani */
  updatedAt: string;
}

export const GUIDES: Guide[] = [
  {
    key: 'pickup-points',
    title: {
      uz: 'Tarqatuvchi salonlar — to‘liq qo‘llanma',
      ru: 'Пункты выдачи — полное руководство',
    },
    description: {
      uz:
        'Salon nima, kategoriyadan farqi, avtomobilni biriktirish, eng yaqin salonni ' +
        'topish, xaritada ochish va video yuklash — frontend kodi bilan.',
      ru:
        'Что такое салон, чем отличается от категории, привязка автомобиля, поиск ' +
        'ближайшего салона, карта и загрузка видео — с кодом фронтенда.',
    },
    content: {
      uz: PICKUP_POINTS_GUIDE,
      ru: PICKUP_POINTS_GUIDE_RU,
    },
    updatedAt: '2026-08-22',
  },

  // ─────────────────────────────────────────────────────────────────────
  // KELAJAKDA: CHAT QO'LLANMASI
  //
  // Chat moduli hozir vaqtincha o'chirilgan (app.module.ts ga qarang).
  // Qayta yoqilganda pastdagi izohni ochish kifoya — boshqa hech narsa
  // o'zgartirilmaydi. Faqat ruscha varianti yozilishi kerak:
  // `src/chat/chat.docs.ru.ts` da `CHAT_GUIDE_RU` deb.
  //
  // {
  //   key: 'chat',
  //   title: {
  //     uz: 'Jonli chat (WebSocket) — to‘liq qo‘llanma',
  //     ru: 'Живой чат (WebSocket) — полное руководство',
  //   },
  //   description: {
  //     uz: 'WebSocket nima, REST dan farqi, hodisalar va mijoz sahifasini yozish.',
  //     ru: 'Что такое WebSocket, отличие от REST, события и страница клиента.',
  //   },
  //   content: { uz: CHAT_GUIDE, ru: CHAT_GUIDE_RU },
  //   updatedAt: '2026-08-20',
  // },
  // ─────────────────────────────────────────────────────────────────────
];

export function findGuide(key: string): Guide | undefined {
  return GUIDES.find((guide) => guide.key === key);
}
