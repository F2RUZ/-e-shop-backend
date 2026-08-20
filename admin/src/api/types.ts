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
}

// ─────────────────────────────── Chat ────────────────────────────────

/** Xabarni kim yozgani. Chatda faqat ikki taraf bor. */
export type ChatRole = 'guest' | 'admin';

export interface Chat {
  id: number;
  guestKey: string;
  guestName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  /** Admin hali o'qimagan xabarlar soni */
  unreadForAdmin: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  sender: ChatRole;
  text: string;
  createdAt: string;
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
