import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { stat, unlink } from 'fs/promises';
import { join } from 'path';
import {
  IMAGE_WIDTH,
  MAX_VIDEO_SECONDS,
  UPLOAD_ROOT,
  UPLOAD_URL_PREFIX,
  VIDEO_DIR,
} from './upload.config';

/**
 * Bir vaqtda nechta video siqilishi mumkin.
 *
 * Serverda 4 ta protsessor yadrosi bor. Har bir ffmpeg bitta yadroni to'liq
 * band qiladi, shuning uchun 2 tadan ortig'iga ruxsat bermaymiz — aks holda
 * 10 ta bola birdan yuklasa server bo'g'ilib qoladi va oddiy so'rovlar ham
 * sekinlashadi. Ortiqchasi navbatda kutib turadi.
 */
const MAX_CONCURRENT_JOBS = 2;

/** ffmpeg shuncha vaqtda tugamasa — majburan to'xtatiladi (buzuq fayl bo'lishi mumkin) */
const FFMPEG_TIMEOUT_MS = 120_000;

@Injectable()
export class VideoService {
  private readonly logger = new Logger('Video');

  /** Hozir nechta ffmpeg ishlayapti */
  private activeJobs = 0;

  /** Navbatda turganlar — joy bo'shashi bilan uyg'otiladi */
  private readonly queue: Array<() => void> = [];

  constructor(private readonly configService: ConfigService) {}

  /**
   * Xom videoni siqib, tayyor faylga aylantiradi.
   * Qaytaradi: bazaga yoziladigan nisbiy yo'l, masalan `pickup-points/3-1755874000.mp4`
   */
  async compress(
    tempPath: string,
    pickupPointId: number,
  ): Promise<{ path: string; sizeBytes: number }> {
    // Nomda vaqt bor: eski video bilan bir xil bo'lsa, brauzer keshdan
    // ESKI videoni ko'rsatib qo'yardi va "yangilanmadi" degan tuyg'u tug'ilardi
    const fileName = `${pickupPointId}-${Date.now()}.mp4`;
    const outputPath = join(VIDEO_DIR, fileName);

    await this.takeSlot();

    try {
      await this.runFfmpeg(tempPath, outputPath);
    } catch (error) {
      // Yarim qolgan faylni qoldirmaymiz
      await unlink(outputPath).catch(() => undefined);
      throw error;
    } finally {
      this.freeSlot();
      // Xom fayl endi kerak emas — 50 MB bo'lishi mumkin, darhol o'chiramiz
      await unlink(tempPath).catch(() => undefined);
    }

    const { size } = await stat(outputPath);

    return { path: `pickup-points/${fileName}`, sizeBytes: size };
  }

  /** Video faylini diskdan o'chiradi. Fayl allaqachon yo'q bo'lsa — xato bermaydi. */
  async remove(relativePath: string | null): Promise<void> {
    if (!relativePath) return;

    await unlink(join(UPLOAD_ROOT, relativePath)).catch(() => undefined);
  }

  /**
   * Rasmni kichiklashtiradi va JPEG qilib saqlaydi.
   *
   * Bu ham ffmpeg bilan — u rasmni ham biladi, shuning uchun rasm uchun
   * alohida kutubxona (sharp) qo'shish shart emas. Telefondagi 6 MB lik
   * surat shu yerdan ~150 KB bo'lib chiqadi.
   */
  async compressImage(
    tempPath: string,
    pickupPointId: number,
  ): Promise<{ path: string; sizeBytes: number }> {
    const fileName = `${pickupPointId}-${Date.now()}.jpg`;
    const outputPath = join(VIDEO_DIR, fileName);

    await this.takeSlot();

    try {
      await this.runFfmpeg(tempPath, outputPath, [
        '-y',
        '-i', tempPath,
        // Kenglik IMAGE_WIDTH; rasm undan kichik bo'lsa kattalashtirmaymiz
        '-vf', `scale='min(${IMAGE_WIDTH},iw)':-2`,
        '-frames:v', '1',
        '-q:v', '4', // JPEG sifati: 2 — eng yaxshi, 31 — eng yomon
        outputPath,
      ]);
    } catch (error) {
      await unlink(outputPath).catch(() => undefined);
      throw error;
    } finally {
      this.freeSlot();
      await unlink(tempPath).catch(() => undefined);
    }

    const { size } = await stat(outputPath);

    return { path: `pickup-points/${fileName}`, sizeBytes: size };
  }

  /** Yuklangan xom faylni o'chiradi (salon topilmagan kabi holatlarda). */
  async removeTemp(absolutePath: string): Promise<void> {
    await unlink(absolutePath).catch(() => undefined);
  }

  /** Bazadagi nisbiy yo'ldan brauzer uchun to'liq havola yasaydi. */
  buildUrl(relativePath: string | null): string | null {
    if (!relativePath) return null;

    const appUrl = this.configService
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    return `${appUrl}${UPLOAD_URL_PREFIX}/${relativePath}`;
  }

  // ─────────────────────────── NAVBAT ───────────────────────────

  private async takeSlot(): Promise<void> {
    while (this.activeJobs >= MAX_CONCURRENT_JOBS) {
      this.logger.log(`Navbat: ${this.queue.length + 1} ta video kutyapti`);
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.activeJobs++;
  }

  private freeSlot(): void {
    this.activeJobs--;
    this.queue.shift()?.();
  }

  // ─────────────────────────── FFMPEG ───────────────────────────

  /**
   * Video qanaqa bo'lishidan qat'i nazar — bir xil kichik formatga keltiradi.
   * Telefondagi 1080p, 60 MB video shu yerdan ~2 MB bo'lib chiqadi.
   */
  private runFfmpeg(inputPath: string, outputPath: string, customArgs?: string[]): Promise<void> {
    const args = customArgs ?? [
      '-y', // chiqish fayli bor bo'lsa so'ramasdan almashtir
      '-i', inputPath,
      '-t', String(MAX_VIDEO_SECONDS), // 30 soniyadan keyin KESADI
      '-vf', 'scale=-2:480', // balandligi 480px, kengligi o'zi hisoblanadi (juft son)
      '-r', '24', // 24 kadr/sekund
      '-c:v', 'libx264',
      '-crf', '32', // siqish kuchi: raqam katta -> fayl kichik, sifat past
      '-preset', 'veryfast', // tez ishlaydi, protsessorni kam yeydi
      '-profile:v', 'baseline', // eski brauzerlar ham o'qiy oladi
      '-level', '3.0',
      '-pix_fmt', 'yuv420p', // ba'zi telefon videolarini brauzer shusiz ko'rsatmaydi
      '-c:a', 'aac',
      '-b:a', '64k',
      '-ac', '1', // ovoz mono — tanishtiruv videosiga stereo shart emas
      '-movflags', '+faststart', // birinchi kadr darhol ko'rinadi (butun fayl kutilmaydi)
      '-threads', '1', // bitta ffmpeg bitta yadrodan ortiq olmasin
      outputPath,
    ];

    return new Promise<void>((resolve, reject) => {
      const child = spawn('ffmpeg', args);

      // ffmpeg butun hisobotini stderr ga yozadi. Xatolik bo'lsa oxirgi
      // qismi kerak bo'ladi, shuning uchun oxirgi 4000 belgini saqlab boramiz.
      let log = '';
      child.stderr.on('data', (chunk: Buffer) => {
        log = (log + chunk.toString()).slice(-4000);
      });

      const timer = setTimeout(() => child.kill('SIGKILL'), FFMPEG_TIMEOUT_MS);

      child.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timer);

        if (error.code === 'ENOENT') {
          this.logger.error('ffmpeg topilmadi');
          return reject(
            new BadRequestException(
              'Videoni siqib bo‘lmadi: serverda ffmpeg o‘rnatilmagan. ' +
                'Mac uchun: brew install ffmpeg. Docker uchun: Dockerfile dagi ' +
                '`apk add --no-cache ffmpeg` qatori tushib qolgan.',
            ),
          );
        }

        reject(new BadRequestException(`Videoni siqishda xatolik: ${error.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);

        if (code === 0) return resolve();

        this.logger.error(`ffmpeg xatosi (kod ${code}):\n${log}`);

        reject(
          new BadRequestException(
            'Video faylni o‘qib bo‘lmadi — ehtimol u buzilgan yoki video emas. ' +
              'Boshqa fayl bilan urinib ko‘ring.',
          ),
        );
      });
    });
  }
}
