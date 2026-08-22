/** Backend har doim shu qobiqda javob qaytaradi. */
export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  path: string;
  timestamp: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

// ─────────────────────────────── Admin ───────────────────────────────

export interface Admin {
  id: number;
  login: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  admin: Admin;
}

/**
 * Adminlar ro'yxatidagi yozuv.
 * Backend har bir adminga `isSuperAdmin` belgisini qo'shib beradi —
 * bosh adminning o'chirish tugmasi shu belgiga qarab yashiriladi, tahrirlash
 * formasida esa login va parol maydonlari qulflanadi.
 */
export interface AdminRow extends Admin {
  isSuperAdmin: boolean;
}

export interface AdminPayload {
  login: string;
  password: string;
  fullName: string;
}

// ───────────────────────────── Kategoriya ────────────────────────────

export interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productsCount?: number;
}

export interface CategoryPayload {
  name: string;
  description?: string;
}

// ───────────────────────────── Avtomobil ─────────────────────────────

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  isActive: boolean;
  categoryId: number;
  category?: Category;
  /** Qaysi salonda turgani. `null` — hech qaysi salonda emas. */
  pickupPointId: number | null;
  pickupPoint?: PickupPoint | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image?: string;
  categoryId: number;
  /**
   * Salon ixtiyoriy. `null` yuborilsa — avtomobil salondan chiqariladi.
   * Bu loyihadagi `null` qabul qiladigan kam sonli maydonlardan biri.
   */
  pickupPointId?: number | null;
}

// ─────────────────────────── Tarqatuvchi salon ───────────────────────

export interface PickupPoint {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  /** "09:00" ko'rinishida */
  opensAt: string;
  closesAt: string;
  latitude: number | null;
  longitude: number | null;
  /** Tashqi havola. Rasm yuklangan bo'lsa — `null`. */
  image: string | null;
  /** Yuklangan rasmning serverdagi yo'li. UI buni ISHLATMAYDI. */
  imagePath: string | null;
  /** Serverdagi yo'l. UI buni ISHLATMAYDI — `videoUrl` dan foydalanadi. */
  videoPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Bazada yo'q — backend javob berayotganda hisoblaydi
  productsCount?: number;
  isOpenNow?: boolean;
  /** Tayyor rasm havolasi — yuklangan yoki tashqi. UI faqat shuni oladi. */
  imageUrl?: string | null;
  videoUrl?: string | null;
  /** Faqat `/nearby` javobida bo'ladi */
  distanceKm?: number;
}

export interface PickupPointPayload {
  name: string;
  city: string;
  address: string;
  phone: string;
  opensAt?: string;
  closesAt?: string;
  /** `null` — koordinatani tozalash */
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
}

/** `GET /pickup-points/cities` — joylashuv aniqlanmaganda shahar so'rash uchun */
export interface PickupPointCity {
  city: string;
  pickupPointsCount: number;
  latitude: number | null;
  longitude: number | null;
}

/** Xarita bo'yicha aniqlangan manzil (`/pickup-points/geocode`) */
export interface GeocodeResult {
  displayName: string;
  /** Salon nomiga taklif — mahalla yoki tuman nomi */
  suggestedName: string | null;
  city: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
}

// ────────────────────────────── Qo'llanma ────────────────────────────

/** `GET /guides` — PDF qo'llanmalar ro'yxati */
export interface Guide {
  key: string;
  /** Til kodi -> matn: { uz: "...", ru: "..." } */
  title: Record<string, string>;
  description: Record<string, string>;
  format: string;
  languages: string[];
  updatedAt: string;
  /** Til kodi -> tayyor yuklab olish havolasi */
  downloads: Record<string, string>;
}

// ───────────────────────────── Statistika ────────────────────────────

export interface DashboardStats {
  products: {
    total: number;
    active: number;
    inactive: number;
    outOfStock: number;
    lowStock: number;
  };
  categories: { total: number; active: number; inactive: number; empty: number };
  pickupPoints: PickupPointStats;
  stock: { totalItems: number; totalValue: number; averagePrice: number };
  latestProducts: Product[];
  lowStockThreshold: number;
}

export interface CategoryBreakdown {
  id: number;
  name: string;
  isActive: boolean;
  productsCount: number;
  activeProductsCount: number;
  totalStock: number;
  totalValue: number;
}

export interface PickupPointStats {
  total: number;
  active: number;
  inactive: number;
  cities: number;
  /** Bitta ham avtomobili yo'q salonlar */
  empty: number;
  withVideo: number;
  /** Koordinatasi yozilmagan — `/nearby` ro'yxatiga tushmaydi */
  withoutCoordinates: number;
  /** Hech qaysi salonga biriktirilmagan avtomobillar */
  unassignedProducts: number;
}

export interface PickupPointBreakdown {
  id: number;
  name: string;
  city: string;
  isActive: boolean;
  hasVideo: boolean;
  productsCount: number;
  activeProductsCount: number;
  totalStock: number;
  totalValue: number;
}
