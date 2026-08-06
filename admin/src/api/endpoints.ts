import { api, unwrap, unwrapFull } from './client';
import type {
  Admin,
  Category,
  CategoryBreakdown,
  CategoryPayload,
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

  changePassword: (oldPassword: string, newPassword: string) =>
    unwrapFull<{ login: string }>(api.patch('/auth/change-password', { oldPassword, newPassword })),
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

  remove: (id: number) =>
    unwrapFull<{ id: number; name: string }>(api.delete(`/categories/${id}`)),
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

// ────────────────────────────── DASHBOARD ────────────────────────────

export const dashboardApi = {
  stats: (threshold?: number) =>
    unwrap<DashboardStats>(api.get('/dashboard/stats', { params: { threshold } })),

  categoryStats: () => unwrap<CategoryBreakdown[]>(api.get('/dashboard/category-stats')),

  lowStock: (threshold?: number) =>
    unwrap<Product[]>(api.get('/dashboard/low-stock', { params: { threshold } })),
};
