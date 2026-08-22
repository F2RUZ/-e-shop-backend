import { api, unwrap, unwrapFull } from './client';
import type {
  Admin,
  AdminPayload,
  AdminRow,
  Category,
  CategoryBreakdown,
  CategoryPayload,
  DashboardStats,
  GeocodeResult,
  Guide,
  LoginResponse,
  Paginated,
  PickupPoint,
  PickupPointBreakdown,
  PickupPointCity,
  PickupPointPayload,
  Product,
  ProductPayload,
} from './types';

// ─────────────────────────────── AUTH ────────────────────────────────

export const authApi = {
  login: (login: string, password: string) =>
    unwrap<LoginResponse>(api.post('/auth/login', { login, password })),

  me: () => unwrap<Admin>(api.get('/auth/me')),

  // Parolni o'zgartirish ataylab yo'q — parol faqat serverdagi .env orqali
  // belgilanadi, aks holda kimdir o'zgartirsa qolganlar kira olmay qoladi.
};

// ────────────────────────────── ADMINLAR ─────────────────────────────

export interface AdminQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'id' | 'login' | 'fullName' | 'createdAt';
  order?: 'ASC' | 'DESC';
}

/**
 * Adminlarni boshqarish.
 *
 * Ro'yxatni HAR QANDAY admin ko'ra oladi, lekin qo'shish/tahrirlash/o'chirishni
 * faqat bosh admin (super admin) qila oladi — boshqasi urinsa backend 403 beradi.
 * Har kim faqat O'Z parolini almashtiradi: `changeOwnPassword`.
 */
export const adminsApi = {
  list: (q: AdminQuery = {}) => unwrap<Paginated<AdminRow>>(api.get('/admins', { params: q })),

  one: (id: number) => unwrap<AdminRow>(api.get(`/admins/${id}`)),

  create: (body: AdminPayload) => unwrapFull<AdminRow>(api.post('/admins', body)),

  update: (id: number, body: Partial<AdminPayload>) =>
    unwrapFull<AdminRow>(api.patch(`/admins/${id}`, body)),

  replace: (id: number, body: AdminPayload) => unwrapFull<AdminRow>(api.put(`/admins/${id}`, body)),

  remove: (id: number) => unwrapFull<{ id: number; login: string }>(api.delete(`/admins/${id}`)),

  /** O'z parolini almashtirish. Login bu yerda o'zgarmaydi. */
  changeOwnPassword: (currentPassword: string, newPassword: string) =>
    unwrapFull<{ id: number; login: string }>(
      api.patch('/admins/me/password', { currentPassword, newPassword }),
    ),
};

// ────────────────────────────── CATEGORIES ───────────────────────────

export interface CategoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'id' | 'name' | 'createdAt';
  order?: 'ASC' | 'DESC';
}

export const categoriesApi = {
  list: (q: CategoryQuery = {}) =>
    unwrap<Paginated<Category>>(api.get('/categories', { params: q })),

  one: (id: number) => unwrap<Category>(api.get(`/categories/${id}`)),

  create: (body: CategoryPayload) => unwrapFull<Category>(api.post('/categories', body)),

  update: (id: number, body: Partial<CategoryPayload>) =>
    unwrapFull<Category>(api.patch(`/categories/${id}`, body)),

  replace: (id: number, body: CategoryPayload) =>
    unwrapFull<Category>(api.put(`/categories/${id}`, body)),

  setStatus: (id: number, isActive: boolean) =>
    unwrapFull<Category>(api.patch(`/categories/${id}/status`, { isActive })),

  remove: (id: number) => unwrapFull<{ id: number; name: string }>(api.delete(`/categories/${id}`)),
};

// ─────────────────────────────── PRODUCTS ────────────────────────────

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  pickupPointId?: number;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'id' | 'name' | 'price' | 'stock' | 'createdAt';
  order?: 'ASC' | 'DESC';
}

export const productsApi = {
  list: (q: ProductQuery = {}) => unwrap<Paginated<Product>>(api.get('/products', { params: q })),

  one: (id: number) => unwrap<Product>(api.get(`/products/${id}`)),

  create: (body: ProductPayload) => unwrapFull<Product>(api.post('/products', body)),

  update: (id: number, body: Partial<ProductPayload>) =>
    unwrapFull<Product>(api.patch(`/products/${id}`, body)),

  replace: (id: number, body: ProductPayload) =>
    unwrapFull<Product>(api.put(`/products/${id}`, body)),

  setStatus: (id: number, isActive: boolean) =>
    unwrapFull<Product>(api.patch(`/products/${id}/status`, { isActive })),

  remove: (id: number) => unwrapFull<{ id: number; name: string }>(api.delete(`/products/${id}`)),
};

// ──────────────────────── TARQATUVCHI SALONLAR ───────────────────────

export interface PickupPointQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  isActive?: boolean;
  sortBy?: 'id' | 'name' | 'city' | 'createdAt';
  order?: 'ASC' | 'DESC';
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

export const pickupPointsApi = {
  list: (q: PickupPointQuery = {}) =>
    unwrap<Paginated<PickupPoint>>(api.get('/pickup-points', { params: q })),

  one: (id: number) => unwrap<PickupPoint>(api.get(`/pickup-points/${id}`)),

  /** Shu salondagi avtomobillar */
  products: (id: number, page = 1, limit = 10) =>
    unwrap<Paginated<Product>>(api.get(`/pickup-points/${id}/products`, { params: { page, limit } })),

  /** Eng yaqin salonlar — koordinata brauzerdan olinadi */
  nearby: (q: NearbyQuery) => unwrap<PickupPoint[]>(api.get('/pickup-points/nearby', { params: q })),

  /**
   * Xaritada belgilangan nuqtaning manzilini aniqlaydi.
   *
   * Nima uchun backend orqali: OpenStreetMap sekundiga bitta so'rovga ruxsat
   * beradi. Har bir panel alohida urilsa xizmat hammani bloklab qo'yadi —
   * backend esa so'rovlarni navbatga soladi va javobni keshlaydi.
   */
  geocode: (lat: number, lng: number) =>
    unwrap<GeocodeResult>(api.get('/pickup-points/geocode', { params: { lat, lng } })),

  /** Yozilgan manzil bo'yicha koordinatani topadi */
  geocodeSearch: (q: string) =>
    unwrap<GeocodeResult>(api.get('/pickup-points/geocode/search', { params: { q } })),

  /** Joylashuv aniqlanmaganda: salon bor shaharlar */
  cities: () => unwrap<PickupPointCity[]>(api.get('/pickup-points/cities')),

  create: (body: PickupPointPayload) => unwrapFull<PickupPoint>(api.post('/pickup-points', body)),

  update: (id: number, body: Partial<PickupPointPayload>) =>
    unwrapFull<PickupPoint>(api.patch(`/pickup-points/${id}`, body)),

  replace: (id: number, body: PickupPointPayload) =>
    unwrapFull<PickupPoint>(api.put(`/pickup-points/${id}`, body)),

  setStatus: (id: number, isActive: boolean) =>
    unwrapFull<PickupPoint>(api.patch(`/pickup-points/${id}/status`, { isActive })),

  remove: (id: number) =>
    unwrapFull<{ id: number; name: string }>(api.delete(`/pickup-points/${id}`)),

  /**
   * Video yuklash. Har salonda BITTA video — yangisi eskisini almashtiradi.
   *
   * Ikkita nozik joy:
   *  1. `Content-Type` chegara belgisi (boundary) bilan birga qo'yilishi kerak.
   *     Axios FormData ni ko'rganda `multipart/form-data` sarlavhasini O'ZI
   *     olib tashlaydi va brauzer uni chegara bilan qayta qo'yadi. Shu sabab
   *     bu yerda uni yozib qo'yish XAVFSIZ — aks holda `api` klientining
   *     `application/json` sukut qiymati qolib ketardi va server faylni
   *     topa olmasdi.
   *  2. Vaqt chegarasi kattaroq: 50 MB yuklanadi va server uni siqadi.
   */
  uploadVideo: (id: number, file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('video', file);

    return unwrapFull<PickupPoint>(
      api.post(`/pickup-points/${id}/video`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
        onUploadProgress: (event) => {
          if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
        },
      }),
    );
  },

  removeVideo: (id: number) => unwrapFull<PickupPoint>(api.delete(`/pickup-points/${id}/video`)),

  /** Rasm yuklash — videodagi qoidalarning aynan o'zi, faqat maydon nomi `image`. */
  uploadImage: (id: number, file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('image', file);

    return unwrapFull<PickupPoint>(
      api.post(`/pickup-points/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
        onUploadProgress: (event) => {
          if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
        },
      }),
    );
  },

  removeImage: (id: number) => unwrapFull<PickupPoint>(api.delete(`/pickup-points/${id}/image`)),
};

// ───────────────────────── QO'LLANMALAR (PDF) ────────────────────────

/**
 * Qo'llanmalar token talab qilmaydi — shuning uchun yuklab olish
 * havolasini to'g'ridan-to'g'ri `<a href download>` ga qo'ysa bo'ladi.
 * Backend tayyor havolalarni `downloads` ichida qaytaradi.
 */
export const guidesApi = {
  list: () => unwrap<Guide[]>(api.get('/guides')),
};

// ────────────────────────────── DASHBOARD ────────────────────────────

export const dashboardApi = {
  stats: (threshold?: number) =>
    unwrap<DashboardStats>(api.get('/dashboard/stats', { params: { threshold } })),

  categoryStats: () => unwrap<CategoryBreakdown[]>(api.get('/dashboard/category-stats')),

  pickupPointStats: () =>
    unwrap<PickupPointBreakdown[]>(api.get('/dashboard/pickup-point-stats')),

  lowStock: (threshold?: number) =>
    unwrap<Product[]>(api.get('/dashboard/low-stock', { params: { threshold } })),
};
