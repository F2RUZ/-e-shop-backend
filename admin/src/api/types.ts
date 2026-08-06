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

// ───────────────────────────── Statistika ────────────────────────────

export interface DashboardStats {
  products: { total: number; active: number; inactive: number; outOfStock: number; lowStock: number };
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
