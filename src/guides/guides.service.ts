import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderGuideToPdf } from './pdf.renderer';
import { GUIDE_FORMAT, GUIDE_LANGUAGES, GuideLang, GUIDES, findGuide } from './guides.registry';

/** PDF sarlavha sahifasi va pastki qatordagi matnlar — har til uchun */
const LABELS: Record<GuideLang, { subtitle: string; footer: string; page: string }> = {
  uz: {
    subtitle: 'E-Shop — avtosalon admin paneli · API qo‘llanmasi',
    footer: 'E-Shop Admin API',
    page: 'sahifa',
  },
  ru: {
    subtitle: 'E-Shop — админ-панель автосалона · Руководство по API',
    footer: 'E-Shop Admin API',
    page: 'страница',
  },
};

@Injectable()
export class GuidesService {
  /**
   * Tayyor PDF'lar shu yerda saqlanadi.
   *
   * Qo'llanma matni o'zgarmas — dastur ishlab turganda u yangilanmaydi.
   * Shuning uchun bir marta chizilgan PDF'ni qayta-qayta yasashning hojati yo'q:
   * 20 ta bola bir vaqtda yuklab olsa ham server bir marta ishlaydi.
   * Dastur qayta ishga tushganda kesh o'zi bo'shaydi.
   */
  private readonly cache = new Map<string, Buffer>();

  constructor(private readonly configService: ConfigService) {}

  /** Mavjud qo'llanmalar ro'yxati — qaysi tilda, qaysi formatda va havolasi bilan. */
  list() {
    const appUrl = this.configService
      .get<string>('APP_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');

    return GUIDES.map((guide) => ({
      key: guide.key,
      title: guide.title,
      description: guide.description,
      format: GUIDE_FORMAT,
      languages: GUIDE_LANGUAGES,
      updatedAt: guide.updatedAt,
      // Tayyor havolalar: frontend ularni to'g'ridan-to'g'ri <a href> ga qo'yadi
      downloads: Object.fromEntries(
        GUIDE_LANGUAGES.map((lang) => [
          lang,
          `${appUrl}/api/guides/${guide.key}?lang=${lang}`,
        ]),
      ) as Record<GuideLang, string>,
    }));
  }

  /** Qo'llanmani PDF qilib qaytaradi. */
  async render(key: string, lang: GuideLang): Promise<{ buffer: Buffer; fileName: string }> {
    const guide = findGuide(key);

    if (!guide) {
      throw new NotFoundException(
        `«${key}» degan qo‘llanma yo‘q. Mavjudlari: ${GUIDES.map((item) => item.key).join(', ')}. ` +
          `To‘liq ro‘yxat uchun: GET /api/guides`,
      );
    }

    const fileName = `${guide.key}-${lang}.pdf`;
    const cacheKey = `${key}:${lang}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { buffer: cached, fileName };
    }

    const labels = LABELS[lang];

    const buffer = await renderGuideToPdf(guide.content[lang], {
      title: guide.title[lang],
      subtitle: labels.subtitle,
      footerNote: labels.footer,
      pageLabel: labels.page,
    });

    this.cache.set(cacheKey, buffer);

    return { buffer, fileName };
  }
}
