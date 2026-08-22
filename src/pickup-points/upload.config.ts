import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

/**
 * Video yuklash sozlamalari — bir joyda.
 *
 * Fayllar `uploads/` papkasida turadi, `public/` da EMAS. Sababi:
 * `Dockerfile` da `COPY public ./public` bor, ya'ni `public/` konteyner
 * image'ining ichiga pishirib qo'yilgan. U yerga ish paytida yozilgan fayl
 * `docker compose up --build` da yo'qolib ketardi. `uploads/` esa volume
 * orqali serverning haqiqiy papkasiga ulanadi va joyida qoladi.
 */

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

/** Tayyor (siqilgan) videolar shu yerda */
export const VIDEO_DIR = join(UPLOAD_ROOT, 'pickup-points');

/** Yuklanayotgan xom fayl vaqtincha shu yerga tushadi, siqilgach o'chiriladi */
export const TEMP_DIR = join(UPLOAD_ROOT, 'tmp');

/** Brauzer video havolasini shu manzildan oladi: /uploads/pickup-points/3-...mp4 */
export const UPLOAD_URL_PREFIX = '/uploads';

export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Uzunroq video shu joyda KESILADI (tanishtiruv uchun 30 soniya yetadi) */
export const MAX_VIDEO_SECONDS = 30;

/** Rasm videodan ancha yengil — chegara ham kichikroq */
export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/** Rasm shu kenglikka kichiklashtiriladi (balandligi o'zi hisoblanadi) */
export const IMAGE_WIDTH = 1280;

const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm'];
const ALLOWED_MIMETYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'];

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Papkalar dastur ishga tushishidan OLDIN bo'lishi kerak: multer faylni
 * darhol diskka yozadi, papka yo'q bo'lsa yiqiladi. Shuning uchun bu funksiya
 * fayl import qilinishi bilan chaqiriladi (pastda).
 */
export function ensureUploadDirs(): void {
  mkdirSync(VIDEO_DIR, { recursive: true });
  mkdirSync(TEMP_DIR, { recursive: true });
}

ensureUploadDirs();

export const videoUploadOptions = {
  // diskStorage — fayl to'g'ridan-to'g'ri diskka yoziladi.
  // memoryStorage bo'lganda 50 MB video butunlay RAM'ga tushardi va
  // bir nechta bola bir vaqtda yuklasa server xotirasi tugab qolardi.
  storage: diskStorage({
    destination: TEMP_DIR,
    filename: (_req, file, callback) => {
      // Tasodifiy nom: ikki bola bir vaqtda yuklasa fayllar to'qnashmaydi
      callback(null, `${randomBytes(8).toString('hex')}${extname(file.originalname).toLowerCase()}`);
    },
  }),

  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },

  fileFilter: (
    _req: unknown,
    file: { originalname: string; mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const extension = extname(file.originalname).toLowerCase();

    // Telefonlar mimetype'ni har xil yuboradi (ba'zan umuman yubormaydi),
    // shuning uchun kengaytma YOKI mimetype to'g'ri bo'lsa — qabul qilamiz
    const ok = ALLOWED_EXTENSIONS.includes(extension) || ALLOWED_MIMETYPES.includes(file.mimetype);

    if (!ok) {
      return callback(
        new BadRequestException(
          `«${file.originalname}» video fayl emas. ` +
            `Qo‘llab-quvvatlanadigan formatlar: ${ALLOWED_EXTENSIONS.join(', ')}. ` +
            `Telefonda olingan video odatda .mp4 yoki .mov bo‘ladi.`,
        ),
        false,
      );
    }

    callback(null, true);
  },
};

export const imageUploadOptions = {
  storage: diskStorage({
    destination: TEMP_DIR,
    filename: (_req, file, callback) => {
      callback(null, `${randomBytes(8).toString('hex')}${extname(file.originalname).toLowerCase()}`);
    },
  }),

  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },

  fileFilter: (
    _req: unknown,
    file: { originalname: string; mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const extension = extname(file.originalname).toLowerCase();

    const ok =
      ALLOWED_IMAGE_EXTENSIONS.includes(extension) ||
      ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype);

    if (!ok) {
      return callback(
        new BadRequestException(
          `«${file.originalname}» rasm fayl emas. ` +
            `Qo\u2018llab-quvvatlanadigan formatlar: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}.`,
        ),
        false,
      );
    }

    callback(null, true);
  },
};
