import axios, { AxiosError } from 'axios';
import type { ApiEnvelope, ApiError } from './types';

export const TOKEN_KEY = 'admin-token';

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'https://backend.magnateshop.uz/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

// Har so'rovga tokenni qo'shamiz
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** 401 kelsa — token eskirgan, foydalanuvchini login sahifasiga qaytaramiz. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Backend qobig'ini ochib, faqat `data` ni qaytaradi. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

/** Backend qobig'ini `message` bilan birga qaytaradi (toast ko'rsatish uchun). */
export async function unwrapFull<T>(
  promise: Promise<{ data: ApiEnvelope<T> }>,
): Promise<{ data: T; message: string }> {
  const res = await promise;
  return { data: res.data.data, message: res.data.message };
}

/**
 * Xatolikdan foydalanuvchiga ko'rsatiladigan matnni ajratadi.
 * Backend matnlari allaqachon o'zbekcha va sababi tushuntirilgan —
 * shuning uchun ularni o'z matnimiz bilan almashtirmaymiz.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const body = error.response?.data;
    if (body?.errors?.length) return body.errors.join(' · ');
    if (body?.message) return body.message;
    if (!error.response) return 'network';
  }
  return fallback;
}
