import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Xarita bo'yicha manzil aniqlash (geokodlash).
 *
 * Ikki tomonlama ishlaydi:
 *   koordinata -> manzil   (reverse) — xaritadan nuqta bosilganda
 *   manzil -> koordinata   (search)  — manzil yozib qidirilganda
 *
 * Nega BACKEND orqali, brauzerdan to'g'ridan-to'g'ri emas:
 *  1. Nominatim sekundiga 1 ta so'rovga ruxsat beradi va o'zini tanitadigan
 *     `User-Agent` talab qiladi. Har bir o'quvchining brauzeri alohida urilsa
 *     xizmat butun sinfni bloklab qo'yadi.
 *  2. Bu yerda javobni KESHLAYMIZ — bir xil nuqta qayta so'ralsa tashqariga
 *     umuman chiqmaymiz.
 *  3. Brauzerdan boshqa domenga so'rov yuborish CORS'ga bog'liq; server uchun
 *     bunday cheklov yo'q.
 *
 * Hech qanday API kaliti kerak emas — OpenStreetMap bepul.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';

/** Nominatim qoidasi: o'zini tanitmagan dasturni bloklaydi */
const USER_AGENT = 'e-shop-admin/1.0 (o\'quv loyihasi; backend.magnateshop.uz)';

/** Ikki so'rov orasidagi eng kam vaqt — xizmat qoidasi (1 req/sek) */
const MIN_INTERVAL_MS = 1100;

const REQUEST_TIMEOUT_MS = 8000;

/** Kesh hajmi: eng eski yozuvlar chiqarib tashlanadi */
const CACHE_LIMIT = 500;

export interface GeocodeResult {
  /** Nominatim qaytargan to'liq matn */
  displayName: string;
  /** Salon nomiga taklif — tuman yoki mahalla nomi */
  suggestedName: string | null;
  city: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger('Geocoding');
  private readonly cache = new Map<string, GeocodeResult | null>();

  /** Oxirgi tashqi so'rov vaqti — chegarani ushlab turish uchun */
  private lastRequestAt = 0;

  /** Koordinata -> manzil */
  async reverse(latitude: number, longitude: number): Promise<GeocodeResult> {
    // 5 xona ~ 1 metr aniqlik. Shu darajada yaxlitlash kesh foydasini oshiradi:
    // xaritada bir necha piksel narida bosilgan nuqta ham o'sha manzil.
    const key = `r:${latitude.toFixed(5)},${longitude.toFixed(5)}`;

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      if (cached === null) throw this.notFound();
      return cached;
    }

    const url = new URL(`${NOMINATIM}/reverse`);
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'uz,ru,en');

    const place = await this.request<NominatimPlace>(url);

    if (!place || !place.display_name) {
      this.remember(key, null);
      throw this.notFound();
    }

    const result = this.toResult(place, latitude, longitude);
    this.remember(key, result);

    return result;
  }

  /** Manzil -> koordinata */
  async search(query: string): Promise<GeocodeResult> {
    const text = query.trim();

    if (text.length < 3) {
      throw new BadRequestException('Qidiruv matni kamida 3 ta belgidan iborat bo‘lsin.');
    }

    const key = `s:${text.toLowerCase()}`;

    const cached = this.cache.get(key);
    if (cached !== undefined) {
      if (cached === null) throw this.notFound();
      return cached;
    }

    const url = new URL(`${NOMINATIM}/search`);
    url.searchParams.set('q', text);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '1');
    // Natijani O'zbekiston bilan cheklaymiz: «Chilonzor» dunyoda bitta emas
    url.searchParams.set('countrycodes', 'uz');
    url.searchParams.set('accept-language', 'uz,ru,en');

    const places = await this.request<NominatimPlace[]>(url);
    const place = Array.isArray(places) ? places[0] : undefined;

    if (!place) {
      this.remember(key, null);
      throw this.notFound();
    }

    const result = this.toResult(place, Number(place.lat), Number(place.lon));
    this.remember(key, result);

    return result;
  }

  // ─────────────────────────── YORDAMCHI ───────────────────────────

  private toResult(place: NominatimPlace, latitude: number, longitude: number): GeocodeResult {
    const address = place.address ?? {};

    // Ko'cha va uy raqamini birlashtiramiz: «Bunyodkor shoh ko'chasi, 12»
    const street = [address.road, address.house_number].filter(Boolean).join(', ');

    return {
      displayName: place.display_name,
      // Salon nomiga taklif: mahalla yoki tuman nomi
      suggestedName: address.suburb ?? address.city_district ?? address.neighbourhood ?? null,
      city: address.city ?? address.town ?? address.village ?? address.state ?? null,
      // Ko'cha topilmasa to'liq matnning boshini beramiz — bo'sh qoldirmaymiz
      address: street || place.display_name.split(',').slice(0, 3).join(',').trim() || null,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    };
  }

  private async request<T>(url: URL): Promise<T | undefined> {
    await this.waitForSlot();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(`Nominatim ${response.status}: ${url.pathname}`);
        throw new ServiceUnavailableException(
          'Xarita xizmati javob bermadi. Biroz kutib qayta urinib ko‘ring yoki ' +
            'koordinatani xaritadan qo‘lda belgilang.',
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.warn(`Nominatim xatosi: ${String(error)}`);

      throw new ServiceUnavailableException(
        'Xarita xizmatiga ulanib bo‘lmadi. Koordinatani xaritadan qo‘lda belgilang.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Xizmat qoidasi: sekundiga bittadan ko'p so'rov yubormaymiz. */
  private async waitForSlot(): Promise<void> {
    const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();

    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }

    this.lastRequestAt = Date.now();
  }

  private remember(key: string, value: GeocodeResult | null): void {
    // Eng eski yozuvni chiqarib tashlaymiz — Map tartibni saqlaydi
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }

    this.cache.set(key, value);
  }

  private notFound() {
    return new BadRequestException(
      'Bu nuqta uchun manzil topilmadi. Xaritada boshqa joyni belgilang yoki ' +
        'manzilni qo‘lda yozing.',
    );
  }
}
