import { api, unwrap, unwrapFull } from './client';
import type {
  Admin,
  AdminPayload,
  AdminRow,
  Category,
  CategoryBreakdown,
  CategoryPayload,
  Chat,
  ChatMessage,
  DashboardStats,
  LoginResponse,
  Paginated,
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

// ──────────────────────────────── CHAT ───────────────────────────────

/**
 * Chatning HTTP qismi. Yozishuvning o'zi WebSocket orqali ketadi (api/socket.ts).
 *
 * Bu uchtasi faqat sahifa birinchi ochilganda va suhbat o'chirilganda kerak —
 * qolgan hamma narsa WebSocket'dan o'zi kelib turadi.
 */
export const chatApi = {
  list: () => unwrap<Chat[]>(api.get('/chat/chats')),

  messages: (chatId: number) => unwrap<ChatMessage[]>(api.get(`/chat/chats/${chatId}/messages`)),

  remove: (chatId: number) =>
    unwrapFull<{ id: number; guestName: string }>(api.delete(`/chat/chats/${chatId}`)),
};

// ────────────────────────────── DASHBOARD ────────────────────────────

export const dashboardApi = {
  stats: (threshold?: number) =>
    unwrap<DashboardStats>(api.get('/dashboard/stats', { params: { threshold } })),

  categoryStats: () => unwrap<CategoryBreakdown[]>(api.get('/dashboard/category-stats')),

  lowStock: (threshold?: number) =>
    unwrap<Product[]>(api.get('/dashboard/low-stock', { params: { threshold } })),
};
